import os
import json
from datetime import datetime
from core.logger import logger

class CostHook:
    """
    Интеграция механизма трекинга затрат на API (Cost Hook).
    Жесткий биллинг-контроль и учет лимитов для каждой сессии Swarm/MCTS.
    """
    def __init__(self, limits_file: str = "cost_limits.json"):
        self.limits_file = os.path.join(os.path.dirname(__file__), limits_file)
        self.session_tokens = {"prompt": 0, "completion": 0}
        self.session_cost = 0.0
        self.total_cost = 0.0
        
        # Стоимость: Gemini 1.5 Pro ($1.25 in / $3.75 out per 1M tokens) => 0.00125 and 0.00375 per 1k
        self.cost_per_1k_prompt = 0.00125
        self.cost_per_1k_completion = 0.00375
        
        # Лимит сессии $1.50
        self.max_session_cost = 1.50
        
        self._load_state()

    def _load_state(self):
        if os.path.exists(self.limits_file):
            try:
                with open(self.limits_file, "r") as f:
                    data = json.load(f)
                    self.total_cost = data.get("total_cost", 0.0)
            except Exception:
                self.total_cost = 0.0

    def _save_state(self):
        try:
            with open(self.limits_file, "w") as f:
                json.dump({
                    "total_cost": self.total_cost,
                    "last_updated": str(datetime.now())
                }, f)
        except BaseException:
            pass # Если не смогли сохранить - продолжаем работу

    def add_usage(self, model_name: str, prompt_tokens: int, completion_tokens: int):
        self.session_tokens["prompt"] += prompt_tokens
        self.session_tokens["completion"] += completion_tokens
        
        cost = (prompt_tokens / 1000.0 * self.cost_per_1k_prompt) + \
               (completion_tokens / 1000.0 * self.cost_per_1k_completion)
               
        self.session_cost += cost
        self.total_cost += cost
        self._save_state()
        
        logger.info(f"💸 [CostHook] Использовано: {prompt_tokens} in / {completion_tokens} out токенов. Списано: ${cost:.5f} (Сессия: ${self.session_cost:.5f}, Всего: ${self.total_cost:.5f})")
        
        if self.session_cost >= self.max_session_cost:
            logger.error("🛑 [CostHook] Достигнут жесткий лимит затрат на сессию! ЭКСТРЕННОЕ ПРЕРЫВАНИЕ API.")
            raise RuntimeError(f"Cost limit exceeded: ${self.session_cost} >= ${self.max_session_cost}")

global_cost_manager = CostHook()
