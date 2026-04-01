import asyncio
import subprocess
from dataclasses import dataclass
from typing import Optional, Dict
from core.yolo_classifier import classify_command, RiskLevel
from core.injection_guard import scan_tool_output, ThreatLevel
from core.system_reminder import inject_reminders

@dataclass
class BashCommandInput:
    command: str
    timeout: Optional[int] = None
    description: Optional[str] = None
    run_in_background: bool = False
    dangerously_disable_sandbox: bool = False
    cwd: Optional[str] = None

@dataclass
class BashCommandOutput:
    stdout: str
    stderr: str
    interrupted: bool
    background_task_id: Optional[int] = None
    return_code: Optional[int] = None
    error_message: Optional[str] = None

class BashHarness:
    """
    Isolated bash execution sandbox inspired by claw-code rust implementation.
    Handles background tasks, timeouts, and basic sandboxing logic.
    """
    def __init__(self):
        self._background_tasks: Dict[int, subprocess.Popen] = {}
        self._task_counter = 0

    async def execute(self, input_data: BashCommandInput) -> BashCommandOutput:
        from core.logger import logger

        # ── Sandboxing: YOLO Classifier (Task 18) ──────────────────────────
        if not input_data.dangerously_disable_sandbox:
            from core.interactive_helpers import ask_user_question

            clf_result = classify_command(input_data.command)

            # CRITICAL → immediate block without prompt
            if clf_result.is_blocked:
                logger.error(
                    f"🔴 [YOLO] CRITICAL block: '{input_data.command}' — {clf_result.reason}"
                )
                return BashCommandOutput(
                    stdout="",
                    stderr=f"Sandbox Error: CRITICAL risk command blocked. Reason: {clf_result.reason}",
                    interrupted=True,
                    return_code=1,
                    error_message=f"YOLO CRITICAL Block: {clf_result.reason}",
                )

            # HIGH / MEDIUM → user prompt
            if clf_result.requires_confirmation:
                import os
                if "PYTEST_CURRENT_TEST" in os.environ or os.environ.get("CI") == "true":
                    logger.warning(
                        f"🟡 [YOLO] {clf_result.risk_level.value}: '{input_data.command}' — rejected by autotests."
                    )
                    return BashCommandOutput(
                        stdout="",
                        stderr=f"Sandbox Error: Command requires confirmation but running in non-interactive CI mode. Reason: {clf_result.reason}",
                        interrupted=True,
                        return_code=1,
                        error_message="CI Autoreject Block",
                    )
                
                logger.warning(
                    f"🟡 [YOLO] {clf_result.risk_level.value}: '{input_data.command}' — "
                    f"{clf_result.reason} [cat: {clf_result.categories}]"
                )
                loop = asyncio.get_running_loop()

                def _ask():
                    return ask_user_question(
                        f"Command classified as {clf_result.risk_level.value}:\n"
                        f"`{input_data.command}`\n"
                        f"Reason: {clf_result.reason}",
                        options=["Allow", "Deny", "Modify command"],
                    )

                choice_str, modified_cmd = await loop.run_in_executor(None, _ask)

                if "Deny" in choice_str:
                    return BashCommandOutput(
                        stdout="",
                        stderr="Sandbox Error: Command execution denied by User.",
                        interrupted=True,
                        return_code=1,
                        error_message="Human Intervention Block",
                    )
                elif modified_cmd:
                    input_data.command = modified_cmd
                    logger.info(f"[YOLO] Command replaced by user with: {input_data.command}")

            elif clf_result.risk_level.value == "LOW":
                logger.warning(f"🔵 [YOLO] LOW risk: '{input_data.command}' — {clf_result.reason}")

            # ── Directory Traversal Check ──────────────────────────────────
            if input_data.cwd:
                import os
                abs_cwd = os.path.abspath(input_data.cwd)
                if abs_cwd == "/" or abs_cwd.startswith("/etc") or abs_cwd.startswith("/var/run"):
                    return BashCommandOutput(
                        stdout="",
                        stderr="Sandbox Error: Attempted execution in restricted system directory.",
                        interrupted=True,
                        return_code=1,
                        error_message="Path Traversal Violation",
                    )

        if input_data.run_in_background:
            return self._run_in_background(input_data.command, input_data.cwd)
        else:
            result = await self._run_async(input_data)

            # ── Prompt Injection Defense on stdout (Task 27) ───────────────
            if result.stdout and not input_data.dangerously_disable_sandbox:
                scan = scan_tool_output(result.stdout, source=f"bash:{input_data.command[:60]}")
                if scan.threat_level == ThreatLevel.INJECTION:
                    from core.logger import logger
                    logger.error(
                        f"🛡️ [InjectionGuard] Prompt Injection in stdout of command '{input_data.command[:80]}'. "
                        f"Content blocked. Patterns: {scan.matched_patterns}"
                    )
                    result.stdout = scan.sanitized_content
                    result.stderr = (
                        f"[INJECTION GUARD] Command output contained Prompt Injection. "
                        f"Patterns: {scan.matched_patterns}. Content sanitized.\n" + result.stderr
                    )
                elif scan.threat_level == ThreatLevel.SUSPICIOUS:
                    from core.logger import logger
                    logger.warning(
                        f"🛡️ [InjectionGuard] Suspicious output from command '{input_data.command[:60]}'. "
                        f"Score={scan.score:.2f}. Passing sanitized version."
                    )
                    result.stdout = scan.sanitized_content

                # ── SystemReminder: injection of behavioral directives ──────────
                # Enriching CLEAN stdout with <system-reminder> tags.
                # The LLM will perceive them as contractual behavioural directives.
                result.stdout = inject_reminders(
                    result.stdout,
                    source=f"bash:{input_data.command[:60]}",
                    extra_context=input_data.command,
                )

            return result

    def _run_in_background(self, command: str, cwd: Optional[str] = None) -> BashCommandOutput:
        self._task_counter += 1
        task_id = self._task_counter
        # Popen executes in the background non-blocking
        process = subprocess.Popen(
            command,
            shell=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True, # Detach from parent
            cwd=cwd
        )
        self._background_tasks[task_id] = process
        return BashCommandOutput(
            stdout=f"Started background process with PID {process.pid}",
            stderr="",
            interrupted=False,
            background_task_id=task_id
        )

    async def _run_async(self, input_data: BashCommandInput) -> BashCommandOutput:
        process = await asyncio.create_subprocess_shell(
            input_data.command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=input_data.cwd
        )

        try:
            if input_data.timeout:
                stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=input_data.timeout)
            else:
                stdout, stderr = await process.communicate()
            
            return BashCommandOutput(
                stdout=stdout.decode() if stdout else "",
                stderr=stderr.decode() if stderr else "",
                interrupted=False,
                return_code=process.returncode
            )
        except asyncio.TimeoutError:
            process.kill()
            await process.communicate() # wait for it to die
            return BashCommandOutput(
                stdout="",
                stderr=f"Command exceeded timeout of {input_data.timeout} seconds.",
                interrupted=True,
                return_code=-1,
                error_message="Timeout Error"
            )

    def get_background_status(self, task_id: int) -> str:
        if task_id not in self._background_tasks:
            return "Task not found"
        
        process = self._background_tasks[task_id]
        pollcode = process.poll()
        if pollcode is None:
            return "Running"
        return f"Finished with return code {pollcode}"

# Example instantiation
harness = BashHarness()
