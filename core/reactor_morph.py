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
        logger.info(f"🕵️‍♂️ [Reactor-Morph] Анализ события: {event_type}")
        rules = self.load_rules()
        
        prompt = (
            f"Ты Бизнес-Аналитик (Reactor-Morph) в системе Morphs. Твои правила (RAG):\n{rules}\n"
            f"Только что в системе произошло событие: '{event_type}'. Данные: {payload}\n"
            "Верни ТОЛЬКО валидный SQL запрос (DML - INSERT, UPDATE, DELETE) для базы SQLite, который реализует нужную логику (например, изменение баланса, запись лога, списание, применение скидки). "
            "Если действий в базе не требуется, верни ровно одно слово 'SKIP'. Не пиши код в markdown, верни сырой текст."
        )
        
        sql_raw = self.mind.think(prompt, max_tokens=512, temperature=0.1)
        action_sql = sql_raw.split("<|eot_id|>")[0].replace("```sql", "").replace("```", "").strip()
        
        if action_sql.upper() != "SKIP" and action_sql != "":
            logger.info(f"🕵️‍♂️ [Reactor-Morph] Выполняю SQL мутацию: {action_sql}")
            try:
                execute_sql(action_sql)
                logger.info("✅ [Reactor-Morph] Транзакция успешна.")
            except Exception as e:
                logger.info(f"❌ [Reactor-Morph] Ошибка SQL: {e}")
        else:
            logger.info("🕵️‍♂️ [Reactor-Morph] Бизнес-логика не требует SQL действий. SKIP.")
