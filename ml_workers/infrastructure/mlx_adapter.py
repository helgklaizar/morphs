import logging
from typing import Optional
from ..core.application.ports import AIPort
from ..core.domain.models import BusinessEvent, BusinessAction
from mlx_agent import CoreMind

logger = logging.getLogger(__name__)

class MLXAgentAdapter(AIPort):
    def __init__(self, model_name: str = "mlx-agent"):
        self.mind = CoreMind()
        self.model_name = model_name

    async def analyze_business_rules(self, event: BusinessEvent, rules: str) -> BusinessAction:
        """
        Интерфейс к MLX-агенту (CoreMind).
        """
        prompt = (
            f"You are a Business Analyst (Reactor-Morph) in the Morphs system. Your rules (RAG):\n{rules}\n"
            f"An event has just occurred: '{event.event_type}'. Data: {event.payload}\n"
            "Return ONLY a valid SQL query (DML) for the SQLite database that implements the required logic. "
            "If no database actions are required, return exactly one word 'SKIP'. Do not write code in markdown."
        )
        
        # MLX Agent call (simulated async if needed)
        sql_raw = self.mind.think(prompt, max_tokens=512, temperature=0.1)
        action_sql = sql_raw.split("<|eot_id|>")[0].replace("```sql", "").replace("```", "").strip()
        
        if action_sql.upper() != "SKIP" and action_sql != "":
            return BusinessAction(action_type="SQL_MUTATION", command=action_sql)
        else:
            return BusinessAction(action_type="SKIP")
