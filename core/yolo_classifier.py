"""
YOLO Classifier — Задача 18: Безопасный перехват опасных BashHarness команд.

Двухуровневая система оценки риска:
  1. Быстрый локальный анализ: regex-эвристика по паттернам (без LLM) → instant O(1)
  2. LLM-верификация: Gemini оценивает команды с неочевидным риском

Кеш результатов: идентичные команды не отправляются в LLM повторно.
"""
import re
import hashlib
from enum import Enum
from typing import Tuple
from functools import lru_cache
from dataclasses import dataclass
from core.logger import logger


class RiskLevel(Enum):
    SAFE = "SAFE"
    LOW = "LOW"            # Предупреждение в логе, выполняется без прерываний
    MEDIUM = "MEDIUM"      # Подтверждение пользователя обязательно
    HIGH = "HIGH"          # Заблокировано, требует явного dangerously_disable_sandbox
    CRITICAL = "CRITICAL"  # Абсолютный блок, нельзя обойти никак


@dataclass
class ClassificationResult:
    risk_level: RiskLevel
    reason: str
    categories: list[str]
    requires_confirmation: bool
    is_blocked: bool


# --- Эвристические правила ---
# Каждое правило: (паттерн_regex, RiskLevel, категория, человеко-читаемая причина)
_RISK_RULES: list[tuple] = [
    # CRITICAL — абсолютный блок
    (r"\brm\s+-rf\s+/(?:\s|$)", RiskLevel.CRITICAL, "FILESYSTEM_DESTRUCTION", "Удаление корневого раздела"),
    (r"\bdd\s+if=.*of=/dev/[sh]d", RiskLevel.CRITICAL, "DISK_OVERWRITE", "Перезапись диска через dd"),
    (r"\bmkfs\b", RiskLevel.CRITICAL, "DISK_FORMAT", "Форматирование диска"),
    (r"\bshred\b.*--remove", RiskLevel.CRITICAL, "FILESYSTEM_DESTRUCTION", "Безвозвратное удаление файлов"),

    # HIGH — требует dangerously_disable_sandbox
    (r"\bsudo\s+(?:rm|chmod|chown|usermod|passwd|visudo)", RiskLevel.HIGH, "PRIVILEGE_ESCALATION", "Привилегированная деструктивная операция через sudo"),
    (r"\bgit\s+push\s+(?:--force|-f)\b", RiskLevel.HIGH, "GIT_FORCE_PUSH", "Принудительная перезапись истории в удалённом репозитории"),
    (r"\bgit\s+push\s+.*:(?:master|main)\b", RiskLevel.HIGH, "GIT_PUSH_MAIN", "Прямой push в защищённую ветку"),
    (r"\bdrop\s+(?:table|database|schema)\b", RiskLevel.HIGH, "DB_DESTRUCTION", "Деструктивная SQL-операция DROP"),
    (r"\btruncate\s+table\b", RiskLevel.HIGH, "DB_DESTRUCTION", "Удаление всех записей таблицы"),
    (r"\b(?:DELETE|UPDATE)\s+FROM\b(?!.*WHERE)", RiskLevel.HIGH, "DB_BULK_MUTATION", "DELETE/UPDATE без WHERE-условия"),
    (r"\bkill\s+-9\s+1\b", RiskLevel.HIGH, "PROCESS_KILL", "Убийство init-процесса (root PID)"),
    (r"\bcurl\s+.*\|\s*(?:bash|sh|zsh|python)\b", RiskLevel.HIGH, "REMOTE_CODE_EXEC", "Выполнение кода, скачанного из интернета (pipe to shell)"),
    (r"\bwget\s+.*-O\s*-\s*\|\s*(?:bash|sh)", RiskLevel.HIGH, "REMOTE_CODE_EXEC", "wget pipe to shell — потенциальный RCE"),

    # MEDIUM — подтверждение обязательно
    (r"\brm\s+(?:-r[f]?|-[rf]+)\b", RiskLevel.MEDIUM, "RECURSIVE_DELETE", "Рекурсивное удаление файлов"),
    (r"\bchmod\s+-R\s+777\b", RiskLevel.MEDIUM, "INSECURE_PERMISSIONS", "Установка небезопасных прав доступа 777"),
    (r"\bchown\s+-R\b", RiskLevel.MEDIUM, "OWNERSHIP_CHANGE", "Рекурсивная смена владельца файлов"),
    (r"\bgit\s+rebase\s+-i\b", RiskLevel.MEDIUM, "GIT_HISTORY_REWRITE", "Интерактивный rebase (переписывание истории)"),
    (r"\bgit\s+reset\s+--hard\b", RiskLevel.MEDIUM, "GIT_HARD_RESET", "Жёсткий сброс git (потеря незафиксированного кода)"),
    (r"\bgit\s+clean\s+-[fFdxX]+", RiskLevel.MEDIUM, "GIT_CLEAN", "git clean — удаление неотслеживаемых файлов"),
    (r">\s*/(?:etc|var|usr|boot|sys|proc)/", RiskLevel.MEDIUM, "SYSTEM_FILE_OVERWRITE", "Запись в системный каталог"),
    (r"\bsystemctl\s+(?:stop|disable|restart)\b", RiskLevel.MEDIUM, "SERVICE_CONTROL", "Управление системными сервисами"),
    (r"\bnpm\s+publish\b", RiskLevel.MEDIUM, "PUBLIC_PUBLISH", "Публикация пакета в публичный реестр NPM"),
    (r"\bpip\s+install\s+--upgrade\s+pip\b", RiskLevel.MEDIUM, "PACKAGE_UPGRADE", "Обновление pip в системном окружении"),

    # LOW — предупреждение в логе
    (r"\bsudo\s+(?!rm|chmod|chown|usermod)\w+", RiskLevel.LOW, "SUDO_USAGE", "Выполнение с sudo (проверьте необходимость)"),
    (r"\bmv\s+.*\s+/(?:tmp|var|etc)/", RiskLevel.LOW, "FILE_MOVE_SYSTEM", "Перемещение файла в системный каталог"),
    (r"\benv\b.*=.*(?:TOKEN|KEY|SECRET|PASSWORD)", RiskLevel.LOW, "SECRET_EXPOSURE", "Потенциальная передача секрета через env"),
    (r">\s*~?/[a-zA-Z]", RiskLevel.LOW, "FILE_OVERWRITE", "Перезапись файла через оператор >"),
]


def _fast_classify(command: str) -> ClassificationResult:
    """O(n) проход по эвристическим правилам без LLM."""
    cmd_lower = command.lower().strip()
    matched_categories: list[str] = []
    highest_risk = RiskLevel.SAFE
    reasons: list[str] = []

    # Приоритет уровней: CRITICAL > HIGH > MEDIUM > LOW > SAFE
    priority = {RiskLevel.SAFE: 0, RiskLevel.LOW: 1, RiskLevel.MEDIUM: 2, RiskLevel.HIGH: 3, RiskLevel.CRITICAL: 4}

    for pattern, risk, category, reason in _RISK_RULES:
        if re.search(pattern, cmd_lower, re.IGNORECASE):
            matched_categories.append(category)
            reasons.append(reason)
            if priority[risk] > priority[highest_risk]:
                highest_risk = risk

    return ClassificationResult(
        risk_level=highest_risk,
        reason="; ".join(reasons) if reasons else "Команда выглядит безопасной",
        categories=matched_categories,
        requires_confirmation=highest_risk in (RiskLevel.MEDIUM, RiskLevel.HIGH),
        is_blocked=highest_risk == RiskLevel.CRITICAL,
    )


# LRU-кеш по хешу команды — LLM не вызывается для одинаковых команд
@lru_cache(maxsize=256)
def _cached_llm_verdict(cmd_hash: str, command: str) -> str:
    """Вызов Gemini для пограничных случаев. Кешируется по md5 команды."""
    try:
        from core.gemini_agent import GeminiCore
        gemini = GeminiCore(model_name="gemini-2.0-flash")  # быстрая модель для быстрого ответа
        prompt = (
            f"Analyze this shell command for destructive, irreversible, or highly risky side-effects:\n"
            f"```\n{command}\n```\n"
            "Categories to check: filesystem destruction, privilege escalation, data loss, remote code exec, secret exposure.\n"
            "Reply with EXACTLY one of: SAFE | LOW | MEDIUM | HIGH | CRITICAL\n"
            "Then a single-line reason after '|'. Example: HIGH | Force-pushes to protected branch."
        )
        result = gemini.think(prompt, max_tokens=50, temperature=0.0).strip()
        return result
    except Exception as e:
        logger.warning(f"[YOLOClassifier] LLM fallback failed: {e}. Treating as MEDIUM.")
        return "MEDIUM | LLM недоступен, выставлен консервативный уровень риска"


class YOLOClassifier:
    """
    Публичный интерфейс YOLO Classifier.
    
    Использование:
        clf = YOLOClassifier()
        result = clf.classify("rm -rf /tmp/build")
        if result.requires_confirmation:
            ...
    """

    def __init__(self, use_llm_for_ambiguous: bool = True):
        """
        Args:
            use_llm_for_ambiguous: Если True — команды с риском LOW будут дополнительно
                верифицированы через Gemini. MEDIUM и выше блокируются сразу без LLM.
        """
        self.use_llm_for_ambiguous = use_llm_for_ambiguous

    def classify(self, command: str) -> ClassificationResult:
        """Классифицирует команду. Быстрый O(n) + опциональный LLM."""
        fast_result = _fast_classify(command)

        if fast_result.risk_level == RiskLevel.SAFE and self.use_llm_for_ambiguous:
            # Команда не попала ни под одно правило — спросим LLM для нестандартных паттернов
            cmd_hash = hashlib.md5(command.encode()).hexdigest()
            llm_raw = _cached_llm_verdict(cmd_hash, command)
            return self._parse_llm_verdict(llm_raw, command)

        return fast_result

    def _parse_llm_verdict(self, raw: str, command: str) -> ClassificationResult:
        """Парсит ответ LLM в ClassificationResult."""
        parts = raw.split("|", 1)
        level_str = parts[0].strip().upper()
        reason = parts[1].strip() if len(parts) > 1 else "LLM классификация"

        level_map = {
            "SAFE": RiskLevel.SAFE, "LOW": RiskLevel.LOW,
            "MEDIUM": RiskLevel.MEDIUM, "HIGH": RiskLevel.HIGH, "CRITICAL": RiskLevel.CRITICAL
        }
        risk = level_map.get(level_str, RiskLevel.MEDIUM)  # консервативный fallback

        if risk != RiskLevel.SAFE:
            logger.info(f"[YOLOClassifier] LLM verdict: {risk.value} — {reason}")

        return ClassificationResult(
            risk_level=risk,
            reason=f"[LLM] {reason}",
            categories=["LLM_CLASSIFIED"],
            requires_confirmation=risk in (RiskLevel.MEDIUM, RiskLevel.HIGH),
            is_blocked=risk == RiskLevel.CRITICAL,
        )


# Singleton — один экземпляр на процесс, кеш работает глобально
_default_classifier = YOLOClassifier(use_llm_for_ambiguous=True)


def classify_command(command: str) -> ClassificationResult:
    """Convenience function for quick classification."""
    return _default_classifier.classify(command)
