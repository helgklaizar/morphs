import os
import subprocess
from mlx_agent import CoreMind
from core.logger import logger

class DataMorph:
    def __init__(self):
        # We don't instantiate CoreMind here to avoid early loading, we fetch the global if possible
        # Or we just create one (it's a singleton pattern inside mlx_agent if we implement it, but wait: CoreMind() loads model)
        # Actually in main.py boot_mind() sets a global mind. 
        # But we can just import from main! Actually no, circular import.
        # Let's just create a new one, MLX caches weights if it's the same process.
        pass

    def generate_mock_data(self, router_file_path: str, business_type: str):
        logger.info(f"🧬 [Data-Morph] Analyzing {router_file_path} to generate mock data...")
        
        # We use the existing mind from main or create a new instance (which is fast if weights are in memory)
        mind = CoreMind()
        
        with open(router_file_path, "r") as f:
            router_code = f.read()
            
        module_name = os.path.basename(router_file_path)[:-3]
            
        prompt = f"""
You are Data-Morph. Your task is to populate the database with realistic data (Mock Data).
Here is the generated FastAPI router code (SQLAlchemy) for a "{business_type}" business:

```python
{router_code}
```

Write a Python script that generates 50 beautiful, realistic, meaningful records for EACH table found in this code and saves them to the database.
Use ONLY standard libraries (random, datetime, uuid, string). Come up with arrays of beautiful, realistic names for generation.

Rules for the script:
1. It must be in the same folder as the router.
2. Import the necessary SQLAlchemy classes and the `session` object directly from the `{module_name}` module.
For example: `from {module_name} import session, CafeTable` (see what the tables are named in the code).
3. Add a commit() call: `session.commit()`.
4. Return ONLY pure Python code without Markdown formatting. WITHOUT ```python ``` wrappers.
5. Be sure to include an `if __name__ == '__main__':` block!
"""
        schema = (
            "<thought>\n"
            "Here, describe step-by-step: which table classes to import, how to create fake records, and how to commit them.\n"
            "</thought>\n"
            "<code>\n"
            "Here, STRICTLY the final, clean Python script code, ready for execution.\n"
            "</code>"
        )
        
        logger.info("⚡️ [Data-Morph] Writing DB population script (structured)...")
        result = mind.think_structured(prompt, schema, max_tokens=2048)
        logger.info(f"🤔 [Data-Morph Thought]: {result.get('thought', 'No thoughts')}")
        
        script_code = result.get("code", "")
        # Clean up trailing characters (just in case)
        script_code = script_code.replace("```python", "").replace("```", "").strip()
        
        logger.info("🚀 [Data-Morph] Validating script security (AST-Sandbox)...")
        
        # 🛡️ Point 3: Secure Sandbox (AST Scanning)
        import ast
        try:
            tree = ast.parse(script_code)
            banned_modules = {"os", "sys", "subprocess", "shutil", "pathlib", "socket", "urllib", "requests"}
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for name in node.names:
                        if name.name.split('.')[0] in banned_modules:
                            raise ValueError(f"Hallucination: The AI tried to import a dangerous module '{name.name}'!")
                elif isinstance(node, ast.ImportFrom):
                    if node.module and node.module.split('.')[0] in banned_modules:
                        raise ValueError(f"Hallucination: The AI tried to import from '{node.module}'!")
            logger.info("✅ [AST-Sandbox] Script is safe. No malicious imports found.")
        except Exception as e:
            logger.info(f"❌ [AST-Sandbox] Security threat! Script rejected: {e}")
            return
            
        script_path = os.path.join(os.path.dirname(router_file_path), f"seed_{module_name}.py")
        with open(script_path, "w") as f:
            f.write(script_code)
            
        logger.info(f"🚀 [Data-Morph] Running data seeding script: {script_path}...")
        
        # Add routers/ to PYTHONPATH so the import works
        env = os.environ.copy()
        core_dir = os.path.abspath(os.path.dirname(os.path.dirname(router_file_path))) # path to core/
        routers_dir = os.path.abspath(os.path.dirname(router_file_path))
        env["PYTHONPATH"] = routers_dir
        
        # Run from core directory so 'sqlite:///name.db' is created in core
        result = subprocess.run(["python", script_path], cwd=core_dir, env=env, capture_output=True, text=True)
        if result.returncode == 0:
            logger.info(f"✅ [Data-Morph] Success! Database populated. Output: {result.stdout}")
        else:
            logger.info(f"❌ [Data-Morph] Error during population: {result.stderr}")
            # Optional: We could call HealerMorph here if we wanted!

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 2:
        DataMorph().generate_mock_data(sys.argv[1], sys.argv[2])