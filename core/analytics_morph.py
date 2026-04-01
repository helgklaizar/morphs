import asyncio
import sqlite3
import os
import glob
from core.logger import logger

class AnalyticsMorph:
    """
    Data Scientist in a box.
    Connects to the production databases of generated SaaS businesses
    in the workspaces/ folders and scans the tables.
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
            except ImportError as e:
                import logging
                logging.getLogger(__name__).warning("Failed to import CoreMind (MLX): %s", e)
        
    def analyze_db(self, db_path: str) -> str:
        if not os.path.exists(db_path):
            return "DB not found."
            
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = cursor.fetchall()
            
            db_context = ""
            for t_col in tables:
                table = t_col[0]
                if "sqlite_" in table.lower() or "alembic" in table.lower():
                    continue
                try:
                    cursor.execute(f"SELECT * FROM {table} LIMIT 5")
                    rows = cursor.fetchall()
                    cursor.execute(f"PRAGMA table_info({table})")
                    columns = [col[1] for col in cursor.fetchall()]
                    
                    db_context += f"\nTable: {table} (Columns: {columns})\n"
                    db_context += "Samples:\n"
                    for row in rows:
                        db_context += f"- {row}\n"
                except Exception as e:
                    logger.warning(f"🔥 [Analytics] Error reading {table}: {e}")
                
            conn.close()

            if not db_context.strip():
                return None

            if not self.mind:
                return f"Raw data (no LLM):\n{db_context}"

            prompt = (
                f"OPERATION: Predictive analytics of a business DB ({os.path.basename(os.path.dirname(db_path))}).\n"
                f"Analyze the database schema and data snippets.\n"
                f"Make 2 specific business conclusions: what sells best or where there are gaps.\n\n"
                f"DB DATA:\n{db_context}"
            )
            schema = "<thought>Table analysis</thought>\n<report>Strict short business report (3 sentences)</report>"
            
            res = self.mind.think_structured(prompt, schema)
            return res.get("report", "Error generating report.")
        except Exception as e:
            logger.error(f"Error parsing DB: {e}", exc_info=True)
            return None

    async def run_data_audit_loop(self):
        logger.info("📈 [Analytics-Morph] Listening to Workspaces for predictive analytics has started.")
        root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        workspaces_dir = os.path.join(root_dir, "../workspaces")
        
        while True:
            await asyncio.sleep(20) # Demo period
            
            try:
                # Searching for databases of generated projects
                reports = []
                if os.path.exists(workspaces_dir):
                    db_files = glob.glob(os.path.join(workspaces_dir, "**/*.db"), recursive=True)
                    for db_file in db_files:
                        if "morphs_system.db" in db_file:
                           continue
                        report = self.analyze_db(db_file)
                        if report and report != "DB not found.":
                            biz_name = os.path.basename(os.path.dirname(os.path.dirname(db_file)))
                            reports.append(f"🟢 **Project `{biz_name}`**:\n{report}")
                            
                if reports:
                    final_report = "\n\n".join(reports)
                    from core.event_bus import bus
                    await bus.publish("chat.notification", {
                        "msg": f"💡 [Analytics-Morph] Workspaces Database Audit Summary:\n{final_report}\n\nDo you want me to generate growth stimulation recommendations for these projects?"
                    })
                
                # Wait for an hour before the next audit (120 seconds for testing)
                await asyncio.sleep(120) 
            except Exception as e:
                logger.error(f"⚠️ [Analytics-Morph] Parsing error: {e}", exc_info=True)
                await asyncio.sleep(60)
