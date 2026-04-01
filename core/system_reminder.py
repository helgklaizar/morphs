"""
SystemReminder — Задачи 19 & 21: Invisible Tags & Behavioral Correction.

Механика:
  1. Инжектирует скрытые <system-reminder> теги внутрь вывода инструментов
     перед передачей в LLM. LLM читает их как бихейвиоральные директивы.
  2. Автоматически подбирает релевантные напоминания по контексту вывода
     (через keyword matching).
  3. Никогда не показывает эти теги конечному пользователю (invisible).

Применение:
    reminder = SystemReminder()
    enriched_output = reminder.inject(tool_stdout, source="bash_harness")
    # enriched_output содержит <system-reminder>...</system-reminder> блоки
    # которые LLM воспримет как поведенческую директиву

Интеграция:
    Вызывать ПОСЛЕ InjectionGuard.scan() и ПЕРЕД передачей в LLM-промпт.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional

from core.logger import logger


# ===========================================================================
# Библиотека напоминаний
# ===========================================================================

@dataclass
class Reminder:
    id: str
    content: str
    triggers: list[str]  # ключевые слова для активации
    priority: int = 5    # 1 (высший) – 10 (низший)


_REMINDER_LIBRARY: list[Reminder] = [
    # ── Anti-Speculation ────────────────────────────────────────────────
    Reminder(
        id="no_speculation",
        content=(
            "CONTRACT-01 ACTIVE: Ты видишь вывод инструмента. "
            "Не добавляй фичи вне scope текущей задачи. "
            "Не расширяй код за пределы того, что явно запрошено."
        ),
        triggers=["function", "def ", "class ", "module", "import"],
        priority=3,
    ),
    Reminder(
        id="no_new_files",
        content=(
            "CONTRACT-02 ACTIVE: Перед созданием нового файла убедись, "
            "что ни один существующий файл не подходит для размещения этого кода. "
            "Предпочитай редактирование созданию."
        ),
        triggers=["create", "new file", "touch ", "open(", "with open"],
        priority=3,
    ),
    # ── No-Try/Except ────────────────────────────────────────────────────
    Reminder(
        id="no_silent_except",
        content=(
            "CONTRACT-03 ACTIVE: Ты обрабатываешь код. "
            "ЗАПРЕЩЕНО писать 'except Exception: pass' или 'except: pass' в бизнес-логике. "
            "Исключения должны propagate через raise или typed error."
        ),
        triggers=["try:", "except", "exception", "error handling"],
        priority=2,
    ),
    # ── OWASP ───────────────────────────────────────────────────────────
    Reminder(
        id="owasp_sql",
        content=(
            "CONTRACT-04 ACTIVE: Ты видишь SQL или ORM код. "
            "ОБЯЗАТЕЛЬНО используй параметризованные запросы. "
            "Никогда не интерполируй user input в SQL строки. "
            "Если сомневаешься — добавь # AUDIT-NEEDED: SQLi."
        ),
        triggers=["sql", "select ", "insert ", "update ", "delete ", "execute(", "query("],
        priority=2,
    ),
    Reminder(
        id="owasp_xss",
        content=(
            "CONTRACT-04b ACTIVE: Ты видишь HTML/JS код. "
            "ОБЯЗАТЕЛЬНО экранируй выводимые данные. "
            "Добавь Content-Security-Policy заголовок. "
            "Не используй innerHTML с user data без санитизации."
        ),
        triggers=["html", "innerhtml", "dangerouslysetinnerhtml", "render(", "jsx", "tsx", "template"],
        priority=2,
    ),
    # ── Reversibility ────────────────────────────────────────────────────
    Reminder(
        id="reversibility_destructive",
        content=(
            "CONTRACT-05 ACTIVE: Ты собираешься выполнить потенциально деструктивное действие. "
            "Классифицируй: REMOTE_DESTRUCTIVE (запись в БД, деплой, удаление, S3/GCS)? "
            "Если да — вызови confirm_destructive_command() ПЕРЕД исполнением."
        ),
        triggers=["delete", "drop ", "truncate", "deploy", "upload", "rm -", "push", "write", "s3://", "gcs://"],
        priority=1,
    ),
    Reminder(
        id="reversibility_db_write",
        content=(
            "CONTRACT-05b ACTIVE: Операция записи в базу данных обнаружена. "
            "Это REMOTE_DESTRUCTIVE. Требуется confirm_destructive_command() перед исполнением."
        ),
        triggers=["commit(", "session.add", "db.execute", "cursor.execute", ".save(", ".create(", "insert into"],
        priority=1,
    ),
    # ── General Reminder ─────────────────────────────────────────────────
    Reminder(
        id="stay_on_task",
        content=(
            "SCOPE REMINDER: Фокусируйся только на той части кода, которая относится к текущей задаче. "
            "Не рефакторь окружающий код опционально."
        ),
        triggers=["refactor", "cleanup", "improve", "optimize", "while we're here"],
        priority=4,
    ),
]


class SystemReminder:
    """
    Инжектор скрытых поведенческих директив в tool outputs.

    Работает по принципу: сканирует вывод инструмента на ключевые слова,
    подбирает релевантные напоминания и вставляет их в конец блока
    в виде XML тегов <system-reminder>...</system-reminder>.

    LLM обрабатывает эти теги как поведенческие директивы; они НЕ
    показываются пользователю в финальном ответе.
    """

    def __init__(
        self,
        max_reminders: int = 3,
        enabled: bool = True,
    ):
        self.max_reminders = max_reminders
        self.enabled = enabled

    def inject(
        self,
        tool_output: str,
        source: str = "tool",
        extra_context: Optional[str] = None,
    ) -> str:
        """
        Добавляет релевантные <system-reminder> теги в конец tool output.

        Args:
            tool_output:   Вывод инструмента (stdout, файл, API ответ).
            source:        Имя источника для логирования.
            extra_context: Дополнительный контекст для matching (задача, тип агента).

        Returns:
            Обогащённый вывод с системными напоминаниями.
        """
        if not self.enabled or not tool_output:
            return tool_output

        search_text = (tool_output + " " + (extra_context or "")).lower()

        matched: list[Reminder] = []
        for reminder in sorted(_REMINDER_LIBRARY, key=lambda r: r.priority):
            if len(matched) >= self.max_reminders:
                break
            if any(trigger.lower() in search_text for trigger in reminder.triggers):
                matched.append(reminder)

        if not matched:
            return tool_output

        tags = "\n".join(
            f"<system-reminder id=\"{r.id}\">{r.content}</system-reminder>"
            for r in matched
        )

        logger.debug(
            f"[SystemReminder] Инжектировано {len(matched)} напоминаний в '{source}': "
            f"{[r.id for r in matched]}"
        )

        return f"{tool_output}\n\n{tags}"

    def inject_manual(self, tool_output: str, reminder_ids: list[str]) -> str:
        """
        Инжекция конкретных напоминаний по ID (для детерминированных случаев).

        Args:
            tool_output:  Вывод инструмента.
            reminder_ids: Список ID напоминаний из _REMINDER_LIBRARY.
        """
        if not self.enabled:
            return tool_output

        id_map = {r.id: r for r in _REMINDER_LIBRARY}
        tags_parts: list[str] = []
        for rid in reminder_ids:
            if rid in id_map:
                r = id_map[rid]
                tags_parts.append(
                    f"<system-reminder id=\"{r.id}\">{r.content}</system-reminder>"
                )
            else:
                logger.warning(f"[SystemReminder] Напоминание '{rid}' не найдено в библиотеке.")

        if not tags_parts:
            return tool_output

        tags = "\n".join(tags_parts)
        return f"{tool_output}\n\n{tags}"

    @staticmethod
    def strip_reminders(text: str) -> str:
        """
        Удаляет <system-reminder> теги из финального ответа перед показом юзеру.
        Вызывать при форматировании output для пользователя.
        """
        return re.sub(
            r'\n*<system-reminder[^>]*>.*?</system-reminder>\n*',
            '',
            text,
            flags=re.DOTALL,
        )


# Singleton
_default_reminder = SystemReminder()


def inject_reminders(tool_output: str, source: str = "tool", extra_context: str = "") -> str:
    """Convenience wrapper для инжекции напоминаний."""
    return _default_reminder.inject(tool_output, source=source, extra_context=extra_context)


def strip_reminders(text: str) -> str:
    """Convenience wrapper для удаления напоминаний из финального ответа."""
    return SystemReminder.strip_reminders(text)
