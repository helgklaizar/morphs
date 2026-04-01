"""
denial_handler.py — Task 29 & 30: Tool Denial & AskUser UX

Когда тулза заблокирована (Sandboxed), вместо слепого ретрая:
1. Немедленно вызывает AskUserQuestion с контекстом блокировки
2. Предлагает структурированные варианты A/B/C + свой ответ
3. Возвращает действие: allow_anyway / use_alternative / skip / custom_input
"""
import asyncio
import sys
from dataclasses import dataclass
from typing import Any, Callable, Optional
from enum import Enum
from core.logger import logger
from core.interactive_helpers import ask_user_question


class DenialAction(str, Enum):
    ALLOW_ANYWAY   = "allow_anyway"    # Пользователь разрешил несмотря на блокировку
    USE_FALLBACK   = "use_fallback"    # Использовать безопасную альтернативу
    SKIP           = "skip"            # Пропустить действие
    CUSTOM_INPUT   = "custom_input"    # Пользователь ввёл свою команду/путь
    ABORT_TASK     = "abort_task"      # Полностью прервать текущую задачу


@dataclass
class DenialContext:
    """Контекст блокировки тулзы."""
    tool_name: str
    reason: str
    args: dict
    sandbox_mode: bool = True
    alternatives: list[str] = None  # Список альтернативных безопасных тулзов


@dataclass  
class DenialResolution:
    """Решение пользователя после блокировки."""
    action: DenialAction
    custom_value: Optional[str] = None
    allow_once: bool = False   # Разрешить только этот один раз, не снимать блок


class ToolDenialHandler:
    """
    Task 29 & 30 — Обработчик блокировок тулзов.
    При Sandboxed-блокировке принудительно вызывает интерактивный AskUser,
    вместо того чтобы ретраить или молча завершить void.
    """

    # ANSI цвета для терминала
    R   = "\033[0m"
    B   = "\033[1m"
    RED = "\033[91m"
    YEL = "\033[93m"
    CYN = "\033[96m"
    GRN = "\033[92m"
    MAG = "\033[95m"
    DIM = "\033[2m"

    @classmethod
    def _box(cls, title: str, icon: str = "🚫"):
        print(f"\n{'═' * 56}")
        print(f"  {icon}  {cls.B}{cls.MAG}{title}{cls.R}")
        print(f"{'═' * 56}\n")

    @classmethod
    def _info(cls, label: str, value: str):
        print(f"  {cls.CYN}{label:<20}{cls.R} {value}")

    @classmethod
    def handle_denial(cls, ctx: DenialContext) -> DenialResolution:
        """
        Синхронный AskUser при блокировке тулзы.
        
        Показывает контекст блокировки и предлагает варианты:
        A) Разрешить один раз (переопределить sandbox)
        B) Использовать безопасную альтернативу (если есть)
        C) Пропустить это действие
        D) Ввести вручную (кастомный путь/команду)
        E) Прервать всю задачу
        """
        cls._box(f"Тулза заблокирована: {ctx.tool_name}", "🚫")
        cls._info("Инструмент:", f"{cls.RED}{ctx.tool_name}{cls.R}")
        cls._info("Причина блока:", ctx.reason)

        if ctx.args:
            args_preview = ", ".join(f"{k}={repr(v)[:40]}" for k, v in list(ctx.args.items())[:3])
            cls._info("Аргументы:", args_preview)

        if ctx.sandbox_mode:
            print(f"\n  {cls.DIM}🔒 Режим Sandbox активен. Прямой вызов недоступен.{cls.R}\n")

        # Строим варианты динамически
        options = [f"⚡ Разрешить один раз (YOLO Override)"]
        option_map = {"A": DenialAction.ALLOW_ANYWAY}

        if ctx.alternatives:
            alts_str = ", ".join(ctx.alternatives[:2])
            options.append(f"🔄 Использовать альтернативу: {alts_str}")
            option_map["B"] = DenialAction.USE_FALLBACK
        else:
            options.append(f"🔄 Использовать безопасную альтернативу")
            option_map["B"] = DenialAction.USE_FALLBACK

        options.append("⏭️  Пропустить это действие")
        option_map["C"] = DenialAction.SKIP

        options.append("✏️  Ввести вручную (кастомный аргумент)")
        option_map["D"] = DenialAction.CUSTOM_INPUT

        options.append("🛑 Прервать задачу")
        option_map["E"] = DenialAction.ABORT_TASK

        # Вызываем интерактивный AskUser из interactive_helpers
        choice, custom_val = ask_user_question(
            f"Что делать с заблокированным '{ctx.tool_name}'?",
            options=options
        )

        # Маппинг буквы → действие
        action = option_map.get(choice, DenialAction.SKIP)

        if action == DenialAction.CUSTOM_INPUT and not custom_val:
            # Запрашиваем кастомный ввод явно
            try:
                custom_val = input(f"\n{cls.YEL}▶ Введите значение/команду: {cls.R}").strip()
            except (EOFError, KeyboardInterrupt):
                custom_val = None
                action = DenialAction.SKIP

        resolution = DenialResolution(action=action, custom_value=custom_val)
        cls._log_resolution(ctx, resolution)
        return resolution

    @classmethod
    async def handle_denial_async(cls, ctx: DenialContext) -> DenialResolution:
        """Async вариант для использования в asyncio-контексте."""
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, lambda: cls.handle_denial(ctx))

    @classmethod
    def _log_resolution(cls, ctx: DenialContext, res: DenialResolution):
        icons = {
            DenialAction.ALLOW_ANYWAY: "⚡",
            DenialAction.USE_FALLBACK: "🔄",
            DenialAction.SKIP:         "⏭️",
            DenialAction.CUSTOM_INPUT: "✏️",
            DenialAction.ABORT_TASK:   "🛑",
        }
        icon = icons.get(res.action, "❓")
        logger.info(
            f"{icon} [DenialHandler] Tool '{ctx.tool_name}' → action='{res.action.value}' "
            f"custom='{res.custom_value}'"
        )


class SandboxedToolExecutor:
    """
    Task 29 — Интегрированный исполнитель тулзов с поддержкой Denial Flow.
    
    Вместо:
      result = registry.call("bash_run", cmd=cmd)  # падает с PermissionError
    
    Использовать:
      executor = SandboxedToolExecutor(registry, permissions)
      result = await executor.safe_call("bash_run", cmd=cmd, fallback_tool="grep_search")
    """
    def __init__(self, registry, permissions):
        self.registry = registry
        self.permissions = permissions

    async def safe_call(
        self,
        tool_name: str,
        fallback_tool: Optional[str] = None,
        alternatives: Optional[list[str]] = None,
        **kwargs
    ) -> str:
        """
        Безопасный вызов тулзы с автоматическим Denial Flow при блокировке.
        
        Flow:
        1. Проверяем ToolPermissionContext
        2. Если заблокировано → AskUser с вариантами A/B/C/D/E
        3. По ответу: override / fallback / skip / custom / abort
        4. Никогда не делаем слепой ретрай!
        """
        is_blocked = self.permissions.is_blocked(tool_name)

        if not is_blocked:
            # Нормальный путь: выполняем тулзу
            return await self._execute_tool(tool_name, **kwargs)

        # Тулза заблокирована — форсируем AskUser
        logger.warning(f"🚫 [SandboxedExecutor] Tool '{tool_name}' is BLOCKED. Forcing AskUser...")

        ctx = DenialContext(
            tool_name=tool_name,
            reason=f"Инструмент '{tool_name}' заблокирован политиками ToolPermissionContext.",
            args=kwargs,
            sandbox_mode=True,
            alternatives=alternatives or ([fallback_tool] if fallback_tool else []),
        )
        resolution = await ToolDenialHandler.handle_denial_async(ctx)

        if resolution.action == DenialAction.ALLOW_ANYWAY:
            logger.warning(f"⚡ [SandboxedExecutor] User overrode block for '{tool_name}' (once).")
            return await self._execute_tool(tool_name, force=True, **kwargs)

        elif resolution.action == DenialAction.USE_FALLBACK:
            alt = fallback_tool or (alternatives[0] if alternatives else None)
            if alt:
                logger.info(f"🔄 [SandboxedExecutor] Using fallback tool: '{alt}'")
                return await self._execute_tool(alt, **kwargs)
            return f"Warning: No fallback available for '{tool_name}'. Action skipped."

        elif resolution.action == DenialAction.CUSTOM_INPUT:
            custom = resolution.custom_value
            if not custom:
                return f"Warning: Custom input was empty. Action skipped."
            logger.info(f"✏️ [SandboxedExecutor] Custom input: {custom}")
            # Попытка выполнить с кастомным значением как первым аргументом
            first_key = next(iter(kwargs), None)
            if first_key:
                new_kwargs = {**kwargs, first_key: custom}
                return await self._execute_tool(tool_name, force=True, **new_kwargs)
            return f"Custom value recorded: {custom}"

        elif resolution.action == DenialAction.ABORT_TASK:
            raise RuntimeError(f"Task aborted by user at blocked tool '{tool_name}'.")

        else:  # SKIP
            return f"Action '{tool_name}' skipped by user (tool was sandboxed)."

    async def _execute_tool(self, tool_name: str, force: bool = False, **kwargs) -> str:
        """Внутренний вызов тулзы из реестра."""
        tool_meta = self.registry.registry.get(tool_name)
        if not tool_meta:
            return f"Error: Tool '{tool_name}' not found in registry."

        func = tool_meta.get("func")
        if not func:
            return f"Error: Tool '{tool_name}' has no callable registered."

        try:
            if asyncio.iscoroutinefunction(func):
                return await func(**kwargs)
            else:
                loop = asyncio.get_running_loop()
                return await loop.run_in_executor(None, lambda: func(**kwargs))
        except Exception as e:
            logger.error(f"❌ [SandboxedExecutor] Tool '{tool_name}' execution error: {e}")
            return f"Error: {e}"


class AskUserTool:
    """
    Task 30 — Улучшенный standalone AskUser как отдельная тулза в реестре.
    ИИ может явно вызвать эту тулзу, чтобы задать вопрос пользователю
    с форматированными вариантами A/B/C + свой вариант.
    """

    @staticmethod
    def ask(
        question: str,
        options: Optional[list[str]] = None,
        context: Optional[str] = None
    ) -> str:
        """
        [AskUser] Задаёт структурированный вопрос пользователю в терминале.
        
        Args:
            question: Вопрос для пользователя
            options: Список вариантов ответа (если None, используются дефолты)
            context: Дополнительный контекст/описание ситуации

        Returns: Строка с ответом пользователя (буква выбора или кастомный текст)
        """
        if context:
            print(f"\n\033[2m📌 Контекст: {context}\033[0m")

        default_opts = options or [
            "✅ Да, продолжить",
            "❌ Нет, пропустить",
            "✏️  Свой вариант",
        ]

        choice, custom = ask_user_question(question, options=default_opts)

        if custom:
            logger.info(f"👤 [AskUser] User custom input: '{custom}'")
            return f"Custom: {custom}"

        logger.info(f"👤 [AskUser] User choice: '{choice}'")
        return choice
