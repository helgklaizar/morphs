import glob
import os
from core.logger import logger

class APIMorph:
    def __init__(self, workspace_manager, project_name: str):
        self.wm = workspace_manager
        self.project_name = project_name
        self.mind = None # Lazy load

    def generate_backend(self, req):
        logger.info(f"🧬 [API-Morph] Designing DB and API architecture for '{req.business_type}'...")
        
        # Reading all architecture rules (RAG)
        rules_text = ""
        for f in glob.glob("rules/*.yaml"):
            with open(f, "r") as rules_file:
                rules_text += rules_file.read() + "\n"
        
        system_instructions = (
            f"You are API-Morph, a backend architect. Write a FastAPI router (with SQLAlchemy) for '{req.business_type}'.\n"
            f"MANDATORY RULES (RAG):\n{rules_text}\n"
            f"Implement the API (endpoints) for the modules: {', '.join(req.modules)}\n"
            "MANDATORY ARCHITECTURE (Rust libSQL):\n"
            "Add this hack for the multi-threaded Rust driver to the very top of the file:\n"
            "`import libsql_experimental as sqlite3`\n"
            "`import sys; sys.modules['sqlite3'] = sqlite3`\n"
            "And then the standard code: `engine = create_engine('sqlite:///[name].db', connect_args={'check_same_thread': False})`"
        )
        
        schema = (
            "<thought>\n"
            "Here, write a step-by-step plan: what tables are needed, what relationships, what data types.\n"
            "</thought>\n"
            "<code>\n"
            "Here, STRICTLY pure Python router code, starting with `from fastapi import ...`\n"
            "</code>"
        )
        
        
        logger.info("⚡️ [API-Morph] Generating the first version of the code (structured output)...")
        if self.mind is None:
            key = os.environ.get("GEMINI_API_KEY")
            if key:
                from core.gemini_agent import GeminiCore
                self.mind = GeminiCore(api_key=key)
            else:
                from mlx_agent import CoreMind
                self.mind = CoreMind()

        result = self.mind.think_structured(system_instructions, schema, max_tokens=8192, expert_adapter="fastapi_sql")
        logger.info(f"🤔 [API-Morph Thought]: {result.get('thought', 'No thoughts')}")
        code = result.get("code", "")

        # Starting ORM model generation in the background
        from db_morph import DBMorph
        db_morph = DBMorph(os.path.join(self.wm.base_dir, self.project_name))
        db_morph.generate_orm_schema(req.business_type, {"id": "int", "name": "str"})

        logger.info("🕵️ [Reviewer-Morph] Checking architecture for compliance with rules (Self-Correction)...")
        review_prompt = (
            f"You are Reviewer-Morph (a Strict Auditor). Review the generated code from another source.\n"
            f"ARCHITECTURE RULES:\n{rules_text}\n"
            f"CODE:\n```python\n{code}\n```\n"
            f"Task: If the code breaks the rules (no SQLAlchemy, no create_all, no Security checks), fix it.\n"
            f"If the code is perfect, just copy it to the code field without changes."
        )
        
        review_schema = (
            "<thought>\n"
            "Here, write a code audit: were any violations regarding SQLAlchemy or Security found?\n"
            "</thought>\n"
            "<code>\n"
            "Here is the corrected Python code.\n"
            "</code>"
        )
        res2 = self.mind.think_structured(review_prompt, review_schema, max_tokens=8192)
        logger.info(f"🧐 [Reviewer-Morph Verdict]: {res2.get('thought', 'No remarks')}")
        
        final_code = res2.get("code", "")
        # Safety cleanup of Markdown tails
        final_code = final_code.replace("```python", "").replace("```", "").strip()
        
        feature_name = f"router_{os.urandom(2).hex()}.py"
        
        # V2: Writing to an isolated Workspace, not to the local routers/
        file_path = self.wm.write_api_route(self.project_name, feature_name, final_code)
            
        logger.info(f"✨ [API-Morph & Reviewer-Morph] Backend generated and isolated: {file_path}")
        return file_path, final_code
