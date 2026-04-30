"""
SystemReminder — Tasks 19 & 21: Invisible Tags & Behavioral Correction.

Mechanics:
  1. Injects hidden <system-reminder> tags into tool outputs
     before passing them to the LLM. The LLM reads them as behavioral directives.
  2. Automatically selects relevant reminders based on the output context
     (via keyword matching).
  3. Never shows these tags to the end user (invisible).

Usage:
    reminder = SystemReminder()
    enriched_output = reminder.inject(tool_stdout, source="bash_harness")
    # enriched_output contains <system-reminder>...</system-reminder> blocks
    # that the LLM will interpret as a behavioral directive

Integration:
    Call AFTER InjectionGuard.scan() and BEFORE passing to the LLM prompt.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional

from core.logger import logger


# ===========================================================================
# Reminder Library
# ===========================================================================

@dataclass
class Reminder:
    id: str
    content: str
    triggers: list[str]  # keywords for activation
    priority: int = 5    # 1 (highest) – 10 (lowest)


_REMINDER_LIBRARY: list[Reminder] = [
    # ── Anti-Speculation ────────────────────────────────────────────────
    Reminder(
        id="no_speculation",
        content=(
            "CONTRACT-01 ACTIVE: You are seeing tool output. "
            "Do not add features outside the scope of the current task. "
            "Do not expand the code beyond what is explicitly requested."
        ),
        triggers=["function", "def ", "class ", "module", "import"],
        priority=3,
    ),
    Reminder(
        id="no_new_files",
        content=(
            "CONTRACT-02 ACTIVE: Before creating a new file, make sure "
            "that no existing file is suitable for placing this code. "
            "Prefer editing over creating."
        ),
        triggers=["create", "new file", "touch ", "open(", "with open"],
        priority=3,
    ),
    # ── No-Try/Except ────────────────────────────────────────────────────
    Reminder(
        id="no_silent_except",
        content=(
            "CONTRACT-03 ACTIVE: You are processing code. "
            "It is FORBIDDEN to write 'except Exception: pass' or 'except: pass' in business logic. "
            "Exceptions must propagate via raise or a typed error."
        ),
        triggers=["try:", "except", "exception", "error handling"],
        priority=2,
    ),
    # ── OWASP ───────────────────────────────────────────────────────────
    Reminder(
        id="owasp_sql",
        content=(
            "CONTRACT-04 ACTIVE: You are seeing SQL or ORM code. "
            "You MUST use parameterized queries. "
            "Never interpolate user input into SQL strings. "
            "If in doubt, add # AUDIT-NEEDED: SQLi."
        ),
        triggers=["sql", "select ", "insert ", "update ", "delete ", "execute(", "query("],
        priority=2,
    ),
    Reminder(
        id="owasp_xss",
        content=(
            "CONTRACT-04b ACTIVE: You are seeing HTML/JS code. "
            "You MUST escape output data. "
            "Add a Content-Security-Policy header. "
            "Do not use innerHTML with user data without sanitization."
        ),
        triggers=["html", "innerhtml", "dangerouslysetinnerhtml", "render(", "jsx", "tsx", "template"],
        priority=2,
    ),
    # ── Reversibility ────────────────────────────────────────────────────
    Reminder(
        id="reversibility_destructive",
        content=(
            "CONTRACT-05 ACTIVE: You are about to perform a potentially destructive action. "
            "Classify: REMOTE_DESTRUCTIVE (DB write, deploy, delete, S3/GCS)? "
            "If yes, call confirm_destructive_command() BEFORE execution."
        ),
        triggers=["delete", "drop ", "truncate", "deploy", "upload", "rm -", "push", "write", "s3://", "gcs://"],
        priority=1,
    ),
    Reminder(
        id="reversibility_db_write",
        content=(
            "CONTRACT-05b ACTIVE: A database write operation has been detected. "
            "This is REMOTE_DESTRUCTIVE. confirm_destructive_command() is required before execution."
        ),
        triggers=["commit(", "session.add", "db.execute", "cursor.execute", ".save(", ".create(", "insert into"],
        priority=1,
    ),
    # ── General Reminder ─────────────────────────────────────────────────
    Reminder(
        id="stay_on_task",
        content=(
            "SCOPE REMINDER: Focus only on the part of the code that relates to the current task. "
            "Do not refactor surrounding code optionally."
        ),
        triggers=["refactor", "cleanup", "improve", "optimize", "while we're here"],
        priority=4,
    ),
]


class SystemReminder:
    """
    Injector for hidden behavioral directives into tool outputs.

    It works by scanning the tool output for keywords, selecting relevant
    reminders, and inserting them at the end of the block as XML tags
    <system-reminder>...</system-reminder>.

    The LLM processes these tags as behavioral directives; they are NOT
    shown to the user in the final response.
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
        Adds relevant <system-reminder> tags to the end of the tool output.

        Args:
            tool_output:   The tool's output (stdout, file, API response).
            source:        The name of the source for logging.
            extra_context: Additional context for matching (task, agent type).

        Returns:
            The enriched output with system reminders.
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
            f"[SystemReminder] Injected {len(matched)} reminders into '{source}': "
            f"{[r.id for r in matched]}"
        )

        return f"{tool_output}\n\n{tags}"

    def inject_manual(self, tool_output: str, reminder_ids: list[str]) -> str:
        """
        Injects specific reminders by ID (for deterministic cases).

        Args:
            tool_output:  The tool's output.
            reminder_ids: A list of reminder IDs from _REMINDER_LIBRARY.
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
                logger.warning(f"[SystemReminder] Reminder '{rid}' not found in the library.")

        if not tags_parts:
            return tool_output

        tags = "\n".join(tags_parts)
        return f"{tool_output}\n\n{tags}"

    @staticmethod
    def strip_reminders(text: str) -> str:
        """
        Removes <system-reminder> tags from the final response before showing it to the user.
        Should be called when formatting the output for the user.
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
    """Convenience wrapper for injecting reminders."""
    return _default_reminder.inject(tool_output, source=source, extra_context=extra_context)


def strip_reminders(text: str) -> str:
    """Convenience wrapper for stripping reminders from the final response."""
    return SystemReminder.strip_reminders(text)