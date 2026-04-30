"""
denial_handler.py — Task 29 & 30: Tool Denial & AskUser UX

When a tool is blocked (Sandboxed), instead of a blind retry:
1. Immediately calls AskUserQuestion with the blocking context
2. Offers structured options A/B/C + custom input
3. Returns an action: allow_anyway / use_alternative / skip / custom_input
"""
import asyncio
import sys
from dataclasses import dataclass
from typing import Any, Callable, Optional
from enum import Enum
from core.logger import logger
from core.interactive_helpers import ask_user_question


class DenialAction(str, Enum):
    ALLOW_ANYWAY   = "allow_anyway"    # User allowed despite the block
    USE_FALLBACK   = "use_fallback"    # Use a safe alternative
    SKIP           = "skip"            # Skip the action
    CUSTOM_INPUT   = "custom_input"    # User entered their own command/path
    ABORT_TASK     = "abort_task"      # Completely abort the current task


@dataclass
class DenialContext:
    """Context of a tool denial."""
    tool_name: str
    reason: str
    args: dict
    sandbox_mode: bool = True
    alternatives: list[str] = None  # List of alternative safe tools


@dataclass  
class DenialResolution:
    """User's resolution after a denial."""
    action: DenialAction
    custom_value: Optional[str] = None
    allow_once: bool = False   # Allow just this once, do not unblock permanently


class ToolDenialHandler:
    """
    Task 29 & 30 — Tool denial handler.
    On a Sandboxed block, it forces an interactive AskUser call,
    instead of retrying or silently failing.
    """

    # ANSI colors for the terminal
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
        Synchronous AskUser upon tool denial.
        
        Shows the denial context and offers options:
        A) Allow once (override sandbox)
        B) Use a safe alternative (if available)
        C) Skip this action
        D) Enter manually (custom path/command)
        E) Abort the entire task
        """
        cls._box(f"Tool blocked: {ctx.tool_name}", "🚫")
        cls._info("Tool:", f"{cls.RED}{ctx.tool_name}{cls.R}")
        cls._info("Reason for block:", ctx.reason)

        if ctx.args:
            args_preview = ", ".join(f"{k}={repr(v)[:40]}" for k, v in list(ctx.args.items())[:3])
            cls._info("Arguments:", args_preview)

        if ctx.sandbox_mode:
            print(f"\n  {cls.DIM}🔒 Sandbox mode is active. Direct execution is not available.{cls.R}\n")

        # Build options dynamically
        options = [f"⚡ Allow once (YOLO Override)"]
        option_map = {"A": DenialAction.ALLOW_ANYWAY}

        if ctx.alternatives:
            alts_str = ", ".join(ctx.alternatives[:2])
            options.append(f"🔄 Use alternative: {alts_str}")
            option_map["B"] = DenialAction.USE_FALLBACK
        else:
            options.append(f"🔄 Use a safe alternative")
            option_map["B"] = DenialAction.USE_FALLBACK

        options.append("⏭️  Skip this action")
        option_map["C"] = DenialAction.SKIP

        options.append("✏️  Enter manually (custom argument)")
        option_map["D"] = DenialAction.CUSTOM_INPUT

        options.append("🛑 Abort task")
        option_map["E"] = DenialAction.ABORT_TASK

        # Call interactive AskUser from interactive_helpers
        choice, custom_val = ask_user_question(
            f"What to do with the blocked '{ctx.tool_name}'?",
            options=options
        )

        # Map letter -> action
        action = option_map.get(choice, DenialAction.SKIP)

        if action == DenialAction.CUSTOM_INPUT and not custom_val:
            # Explicitly request custom input
            try:
                custom_val = input(f"\n{cls.YEL}▶ Enter value/command: {cls.R}").strip()
            except (EOFError, KeyboardInterrupt):
                custom_val = None
                action = DenialAction.SKIP

        resolution = DenialResolution(action=action, custom_value=custom_val)
        cls._log_resolution(ctx, resolution)
        return resolution

    @classmethod
    async def handle_denial_async(cls, ctx: DenialContext) -> DenialResolution:
        """Async version for use in an asyncio context."""
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
    Task 29 — Integrated tool executor with Denial Flow support.
    
    Instead of:
      result = registry.call("bash_run", cmd=cmd)  # fails with PermissionError
    
    Use:
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
        Safe tool call with automatic Denial Flow on block.
        
        Flow:
        1. Check ToolPermissionContext
        2. If blocked → AskUser with options A/B/C/D/E
        3. Based on the answer: override / fallback / skip / custom / abort
        4. Never do a blind retry!
        """
        is_blocked = self.permissions.is_blocked(tool_name)

        if not is_blocked:
            # Normal path: execute the tool
            return await self._execute_tool(tool_name, **kwargs)

        # Tool is blocked — forcing AskUser
        logger.warning(f"🚫 [SandboxedExecutor] Tool '{tool_name}' is BLOCKED. Forcing AskUser...")

        ctx = DenialContext(
            tool_name=tool_name,
            reason=f"Tool '{tool_name}' is blocked by ToolPermissionContext policies.",
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
            # Attempt to execute with the custom value as the first argument
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
        """Internal call to a tool from the registry."""
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
    Task 30 — Improved standalone AskUser as a separate tool in the registry.
    The AI can explicitly call this tool to ask the user a question
    with formatted options A/B/C + a custom option.
    """

    @staticmethod
    def ask(
        question: str,
        options: Optional[list[str]] = None,
        context: Optional[str] = None
    ) -> str:
        """
        [AskUser] Asks a structured question to the user in the terminal.
        
        Args:
            question: The question for the user
            options: A list of answer options (if None, defaults are used)
            context: Additional context/description of the situation

        Returns: A string with the user's answer (choice letter or custom text)
        """
        if context:
            print(f"\n\033[2m📌 Context: {context}\033[0m")

        default_opts = options or [
            "✅ Yes, continue",
            "❌ No, skip",
            "✏️  Custom option",
        ]

        choice, custom = ask_user_question(question, options=default_opts)

        if custom:
            logger.info(f"👤 [AskUser] User custom input: '{custom}'")
            return f"Custom: {custom}"

        logger.info(f"👤 [AskUser] User choice: '{choice}'")
        return choice
