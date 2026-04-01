import json
import os
import time
from core.logger import logger

class EconomyMorph:
    """
    Multi-Agent Economy (Токеномика).
    Управляет внутренним бюджетом агентов.
    Если задача становится слишком сложной или агент Healer-Morph уходит в бесконечный цикл,
    бюджет заканчивается и задача отменяется (Банкротство).
    """
    
    PRICE_LIST = {
        "architect_review": 10,  # Обычная проверка
        "coder_generate": 30,    # Написание нового компонента
        "healer_fix": 50,        # Хилер стоит дорого, чтобы ИИ старался не ошибаться
        "security_audit": 15,
        "browser_e2e": 25
    }

    def __init__(self, workspace_dir: str):
        self.workspace_dir = os.path.abspath(workspace_dir)
        self.tasks_dir = os.path.join(self.workspace_dir, ".tasks")
        
    def _get_budget_file(self, task_id: str):
        return os.path.join(self.tasks_dir, task_id, "finance.json")

    def init_task_budget(self, task_id: str, initial_credits: int = 500) -> dict:
        """Выделение гранта (Credits) на новую задачу."""
        finance_file = self._get_budget_file(task_id)
        
        # Если папка таски еще не создана, не падаем
        os.makedirs(os.path.dirname(finance_file), exist_ok=True)
        
        state = {
            "initial_budget": initial_credits,
            "current_balance": initial_credits,
            "transactions": []
        }
        
        with open(finance_file, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=4)
            
        logger.info(f"💰 [Economy-Morph] Выделен бюджет {initial_credits} 🪙 для Задачи: {task_id}")
        return state

    def charge(self, task_id: str, action_type: str, agent_name: str) -> bool:
        """
        Списывает кредиты за операцию агента.
        Возвращает True, если транзакция успешна (денег хватает). Возвращает False — Банкрот.
        """
        finance_file = self._get_budget_file(task_id)
        if not os.path.exists(finance_file):
            logger.info(f"⚠️ [Economy-Morph] Бюджет для {task_id} не найден. Работаем в кредит.")
            return True
            
        with open(finance_file, "r", encoding="utf-8") as f:
            state = json.load(f)
            
        cost = self.PRICE_LIST.get(action_type, 10)  # Дефолт 10
        
        if state["current_balance"] < cost:
            logger.info(f"💀 [Economy-Morph] БАНКРОТСТВО ({task_id}): {agent_name} попытался списать {cost} 🪙, но осталось лишь {state['current_balance']} 🪙.")
            return False
            
        state["current_balance"] -= cost
        
        tx = {
            "timestamp": time.time(),
            "agent": agent_name,
            "action": action_type,
            "cost": cost,
            "balance_after": state["current_balance"]
        }
        state["transactions"].append(tx)
        
        with open(finance_file, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=4)
            
        logger.info(f"💸 [Economy-Morph] Оплата {cost} 🪙 Агенту {agent_name} за '{action_type}'. Остаток: {state['current_balance']} 🪙")
        return True

    def get_financial_report(self, task_id: str):
        finance_file = self._get_budget_file(task_id)
        if not os.path.exists(finance_file):
            return None
        with open(finance_file, "r", encoding="utf-8") as f:
            return json.load(f)

if __name__ == "__main__":
    economy = EconomyMorph("../workspaces")
    economy.init_task_budget("T-123", 200)
    economy.charge("T-123", "coder_generate", "UI-Coder")
    economy.charge("T-123", "healer_fix", "Healer-Morph")
    economy.charge("T-123", "healer_fix", "Healer-Morph") # Третий раз сломается или будет близко к банкротству
    economy.charge("T-123", "healer_fix", "Healer-Morph") # <-- БАНКРОТ
