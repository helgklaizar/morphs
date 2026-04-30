import os
import subprocess
from core.logger import logger

class SecurityMorph:
    """
    Automatic Red-Team audit of freshly generated routers.
    Uses native tools (bandit, npm audit) along with LLM modeling (OWASP)
    to find XSS, SQLi, and Command Injection vulnerabilities.
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
        logger.info(f"🛡️ [Security-Morph] Starting hybrid security audit (Native + Red-Team): {target_file_path}")
        
        if not os.path.exists(target_file_path):
            logger.info("🛡️ [Security-Morph] File not found.")
            return False

        with open(target_file_path, "r", encoding="utf-8") as f:
            code = f.read()

        native_report = "Native Audit Not Run"
        # Native audit
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
            logger.warning(f"🛡️ [Security-Morph] No AI engine for vulnerability triage. Native tools output:\n{native_report}")
            return "No issues" in native_report or "0 vulnerabilities" in native_report

        prompt = (
            f"OPERATION: Red-Team Source Code Audit (OWASP).\n"
            f"Find critical vulnerabilities (SQL Injection, XSS, Command Injection, hardcoded passwords).\n\n"
            f"NATIVE SCANNER REPORT (Bandit/npm audit):\n{native_report}\n\n"
            f"CODE DETAILS:\n```python\n{code}\n```\n"
            f"If the code and report are ABSOLUTELY SAFE, write <security_status>SAFE</security_status>. "
            f"If at least one vulnerability is found (even a false positive from the report that you confirm with the code), write <security_status>VULNERABLE</security_status> "
            f"and list the exploits in <thought>."
        )

        schema = "<thought>Attack vector analysis</thought>\n<security_status>SAFE/VULNERABLE</security_status>"
        
        try:
            res = self.mind.think_structured(prompt, schema)
            status = res.get("security_status", "VULNERABLE").strip().upper()
            thought = res.get("thought", "No detailed analysis")
            
            if status == "SAFE":
                logger.info("✅ [Security-Morph] Audit passed. No vulnerabilities found.")
                return True
            else:
                logger.warning(f"🚨 [Security-Morph] Audit failed! Vulnerability found: {thought[:250]}...")
                return False
        except Exception as e:
            logger.error(f"💥 [Security-Morph] Error during attack simulation: {e}", exc_info=True)
            return False
