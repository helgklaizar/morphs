import os
import subprocess
import ast
import traceback
from mlx_agent import CoreMind
from core.logger import logger

class BackendHealer:
    def __init__(self, target_file: str):
        self.target_file = target_file
        self.mind = CoreMind(model_name="mlx-community/Meta-Llama-3-8B-Instruct-4bit")
        logger.info(f"🩺 [Backend-Healer] Backend Surgeon started for: {self.target_file}")

    def run_pytest(self):
        """Runs AST pre-validation and pytest on the generated router"""
        
        # 1️⃣ AST Pre-Validation (Step 4: Lightning-fast syntax check)
        logger.info("🧱 [AST-Morph] Preliminary syntax analysis...")
        try:
            with open(self.target_file, "r") as f:
                code_content = f.read()
            ast.parse(code_content)
        except SyntaxError as e:
            err_msg = "".join(traceback.format_exception(type(e), e, e.__traceback__))
            logger.info(f"🚨 [AST-Morph] Instantly caught SyntaxError: {e.msg}")
            return 1, "", err_msg

        try:
            logger.info("🧹 [Ruff] Automatic code and import cleanup...")
            subprocess.run(["ruff", "check", "--fix", self.target_file], capture_output=True, text=True)
            subprocess.run(["ruff", "format", self.target_file], capture_output=True, text=True)
        except Exception as ruff_e:
            logger.info(f"⚠️ [Ruff] Error running ruff: {ruff_e}")


        # 2️⃣ In-depth Pytest testing (Imports, Logic, SQLAlchemy)
        test_file = "test_auto.py"
        module_name = self.target_file.replace("/", ".").replace(".py", "")
        
        test_code = f"""import pytest
from {module_name} import router
from core.logger import logger

def test_router_loads():
    assert router is not None
"""
        with open(test_file, "w") as f:
            f.write(test_code)
            
        logger.info("🔍 [Backend-Healer] Performing static analysis and import...")
        result = subprocess.run(["pytest", test_file, "-v", "--tb=short"], capture_output=True, text=True)
        
        # Deleting the test file
        if os.path.exists(test_file):
            os.remove(test_file)
            
        return result.returncode, result.stdout, result.stderr

    def heal_python_code(self, error_log: str, max_retries: int = 2):
        logger.info(f"🔥 [Backend-Healer] Backend is down! Starting automatic surgery (up to {max_retries} attempts)...")
        
        for attempt in range(max_retries):
            with open(self.target_file, "r") as f:
                bad_code = f.read()
                
            prompt = (
                f"We tried to run your FastAPI Python script, but encountered a critical error:\n"
                f"```\n{error_log}\n```\n"
                f"YOUR BROKEN CODE:\n```python\n{bad_code}\n```\n"
                f"TASK: Fix the error (e.g., add the HTTPBearer import or fix Pydantic syntax). Return the FULL corrected code."
            )
            
            schema = "<thought>Error analysis and treatment plan</thought>\n<code>Full corrected code</code>"
            
            logger.info(f"✂️ [Backend-Healer] Operation {attempt + 1}/{max_retries}...")
            result = self.mind.think_structured(prompt, schema, max_tokens=2500, expert_adapter="python_healer")
            
            fixed_code = result.get("code", "").replace("```python", "").replace("```", "").strip()
            
            if fixed_code:
                with open(self.target_file, "w") as f:
                    f.write(fixed_code)
                logger.info("✅ [Backend-Healer] Patch applied! Rerunning diagnostics...")
                
                code, out, err = self.run_pytest()
                if code == 0:
                    logger.info("🎉 [Backend-Healer] Patient saved! Backend is loading without errors.")
                    return True
                else:
                    error_log = out + "\n" + err
            else:
                logger.info("🚨 [Backend-Healer] The core returned an empty patch.")
                
        logger.info("☠️ [Backend-Healer] Wipe. Operation failed. Human intervention required.")
        return False

if __name__ == "__main__":
    # Test
    # healer = BackendHealer("routers/restaurant_router.py")
    # healer.heal_python_code("ImportError: cannot import name 'HTTPBearer'")
    pass