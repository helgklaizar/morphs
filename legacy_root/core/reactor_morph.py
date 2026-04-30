from mlx_agent import CoreMind
from db import execute_sql
import glob
from core.logger import logger

class ReactorMorph:
    def __init__(self):
        self.mind = CoreMind()

    def load_rules(self):
        rules = ""
        for file in glob.glob("rules/*.yaml"):
            with open(file, "r") as f:
                rules += f.read() + "\n"
        return rules

    def react(self, event_type: str, payload: str):
        logger.info(f"🕵️‍♂️ [Reactor-Morph] Analyzing event: {event_type}")
        rules = self.load_rules()
        
        prompt = (
            f"You are a Business Analyst (Reactor-Morph) in the Morphs system. Your rules (RAG):\n{rules}\n"
            f"An event has just occurred in the system: '{event_type}'. Data: {payload}\n"
            "Return ONLY a valid SQL query (DML - INSERT, UPDATE, DELETE) for the SQLite database that implements the required logic (e.g., changing a balance, writing a log, debiting, applying a discount). "
            "If no database actions are required, return exactly one word 'SKIP'. Do not write code in markdown, return raw text."
        )
        
        sql_raw = self.mind.think(prompt, max_tokens=512, temperature=0.1)
        action_sql = sql_raw.split("<|eot_id|>")[0].replace("```sql", "").replace("```", "").strip()
        
        if action_sql.upper() != "SKIP" and action_sql != "":
            logger.info(f"🕵️‍♂️ [Reactor-Morph] Executing SQL mutation: {action_sql}")
            try:
                execute_sql(action_sql)
                logger.info("✅ [Reactor-Morph] Transaction successful.")
            except Exception as e:
                logger.info(f"❌ [Reactor-Morph] SQL Error: {e}")
        else:
            logger.info("🕵️‍♂️ [Reactor-Morph] Business logic does not require SQL actions. SKIP.")
