import json
import os
import time
from core.logger import logger

class EconomyMorph:
    """
    Multi-Agent Economy (Tokenomics).
    Manages the internal budget of agents.
    If a task becomes too complex or the Healer-Morph agent enters an infinite loop,
    the budget runs out and the task is canceled (Bankruptcy).
    """
    
    PRICE_LIST = {
        "architect_review": 10,  # Regular review
        "coder_generate": 30,    # Writing a new component
        "healer_fix": 50,        # Healer is expensive to encourage the AI to avoid mistakes
        "security_audit": 15,
        "browser_e2e": 25
    }

    def __init__(self, workspace_dir: str):
        self.workspace_dir = os.path.abspath(workspace_dir)
        self.tasks_dir = os.path.join(self.workspace_dir, ".tasks")
        
    def _get_budget_file(self, task_id: str):
        return os.path.join(self.tasks_dir, task_id, "finance.json")

    def init_task_budget(self, task_id: str, initial_credits: int = 500) -> dict:
        """Allocates a grant (Credits) for a new task."""
        finance_file = self._get_budget_file(task_id)
        
        # If the task folder doesn't exist yet, don't fail
        os.makedirs(os.path.dirname(finance_file), exist_ok=True)
        
        state = {
            "initial_budget": initial_credits,
            "current_balance": initial_credits,
            "transactions": []
        }
        
        with open(finance_file, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=4)
            
        logger.info(f"💰 [Economy-Morph] Budget of {initial_credits} 🪙 allocated for Task: {task_id}")
        return state

    def charge(self, task_id: str, action_type: str, agent_name: str) -> bool:
        """
        Charges credits for an agent's operation.
        Returns True if the transaction is successful (enough money). Returns False — Bankrupt.
        """
        finance_file = self._get_budget_file(task_id)
        if not os.path.exists(finance_file):
            logger.info(f"⚠️ [Economy-Morph] Budget for {task_id} not found. Working on credit.")
            return True
            
        with open(finance_file, "r", encoding="utf-8") as f:
            state = json.load(f)
            
        cost = self.PRICE_LIST.get(action_type, 10)  # Default 10
        
        if state["current_balance"] < cost:
            logger.info(f"💀 [Economy-Morph] BANKRUPTCY ({task_id}): {agent_name} tried to charge {cost} 🪙, but only {state['current_balance']} 🪙 remains.")
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
            
        logger.info(f"💸 [Economy-Morph] Payment of {cost} 🪙 to Agent {agent_name} for '{action_type}'. Balance: {state['current_balance']} 🪙")
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
    economy.charge("T-123", "healer_fix", "Healer-Morph") # The third time it will break or be close to bankruptcy
    economy.charge("T-123", "healer_fix", "Healer-Morph") # <-- BANKRUPT
