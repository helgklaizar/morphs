import os
import subprocess
from core.logger import logger

class SecurityMorph:
    """
    Автоматический Red-Team аудит свежесгенерированных роутеров.
    Использует нативные тулзы (bandit, npm audit) наряду с LLM моделированием (OWASP)
    для поиска XSS, SQLi, и Command Injection.
    """

    def __init__(self, api_key: str = None):
        self.mind = None
        if not api_key:
            api_key = os.environ.get("GEMINI_API_KEY")
        if api_key:
            from core.gemini_agent import GeminiCore
            self.mind = GeminiCore(api_key=api_key)
        else:
            try:
                from core.mlx_agent import CoreMind
                self.mind = CoreMind()
            except ImportError:
                pass

    def run_pentest(self, target_file_path: str) -> bool:
        logger.info(f"🛡️ [Security-Morph] Начат гибридный аудит безопасности (Native + Red-Team): {target_file_path}")
        
        if not os.path.exists(target_file_path):
            logger.info("🛡️ [Security-Morph] Файл не найден.")
            return False

        with open(target_file_path, "r", encoding="utf-8") as f:
            code = f.read()

        native_report = "Native Audit Not Run"
        # Нативный аудит
        if target_file_path.endswith(".py"):
            try:
                out = subprocess.run(["bandit", "-r", target_file_path, "-l", "-i"], capture_output=True, text=True)
                native_report = out.stdout if out.stdout else "Bandit: No severe issues found."
            except FileNotFoundError:
                native_report = "Bandit is not installed locally. Skipping native Python audit."
        elif target_file_path.endswith(".js") or target_file_path.endswith(".ts"):
            cwd = os.path.dirname(target_file_path)
            if os.path.exists(os.path.join(cwd, "package.json")):
                try:
                    out = subprocess.run(["npm", "audit"], cwd=cwd, capture_output=True, text=True)
                    native_report = out.stdout
                except FileNotFoundError:
                    native_report = "npm is not installed locally. Skipping native JS audit."
            else:
                native_report = "No package.json found, skipping npm audit."

        if not self.mind:
            logger.warning(f"🛡️ [Security-Morph] Нет ИИ движка для триажа уязвимостей. Вывод нативных тулзов:\n{native_report}")
            return "No issues" in native_report or "0 vulnerabilities" in native_report

        prompt = (
            f"ОПЕРАЦИЯ: Red-Team Аудит исходного кода (OWASP).\n"
            f"Найди критические уязвимости (SQL Injection, XSS, Command Injection, захардкоженные пароли).\n\n"
            f"ОТЧЕТ НАТИВНОГО СКАНЕРА (Bandit/npm audit):\n{native_report}\n\n"
            f"ДЕТАЛИ КОДА:\n```python\n{code}\n```\n"
            f"Если код и отчет АБСОЛЮТНО БЕЗОПАСНЫ, напиши в <security_status>SAFE</security_status>. "
            f"Если найдена хотя бы одна уязвимость (даже false positive из отчета, которую ты подтверждаешь кодом), напиши <security_status>VULNERABLE</security_status> "
            f"и перечисли эксплойты в <thought>."
        )

        schema = "<thought>Анализ вектора атак</thought>\n<security_status>SAFE/VULNERABLE</security_status>"
        
        try:
            res = self.mind.think_structured(prompt, schema)
            status = res.get("security_status", "VULNERABLE").strip().upper()
            thought = res.get("thought", "Нет детального анализа")
            
            if status == "SAFE":
                logger.info("✅ [Security-Morph] Аудит пройден. Уязвимостей не найдено.")
                return True
            else:
                logger.warning(f"🚨 [Security-Morph] Аудит провален! Найдена уязвимость: {thought[:250]}...")
                return False
        except Exception as e:
            logger.error(f"💥 [Security-Morph] Ошибка во время моделирования атак: {e}", exc_info=True)
            return False
