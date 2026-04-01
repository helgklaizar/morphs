from enum import Enum
from typing import List, Dict, Optional
from pydantic import BaseModel, Field
from core.logger import logger

class PlanStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    SUCCESS = "success"
    FAILED = "failed"
    SKIPPED = "skipped"

class PlanStep(BaseModel):
    step_id: str
    description: str
    status: PlanStatus = PlanStatus.PENDING
    assigned_expert: Optional[str] = None
    evidence: Optional[str] = None

class PlanTracker(BaseModel):
    """
    Математически строгая FSM для управления планом выполнения.
    """
    task_id: str
    steps: List[PlanStep] = Field(default_factory=list)
    
    def create_plan(self, steps_data: List[dict]):
        """Инициализация FSM новыми шагами"""
        self.steps = []
        for s in steps_data:
            self.steps.append(PlanStep(**s))
        logger.info(f"📋 [PlanTracker] План для задачи {self.task_id} создан. Шагов: {len(self.steps)}")

    def update_step_status(self, step_id: str, new_status: PlanStatus, evidence: str = None) -> bool:
        """Атомарная стейт-транзакция (state transition)."""
        for step in self.steps:
            if step.step_id == step_id:
                step.status = new_status
                if evidence:
                    step.evidence = evidence
                logger.info(f"🔄 [PlanTracker] Шаг '{step_id}' перешел в статус: {new_status.value.upper()}")
                return True
        logger.error(f"❌ [PlanTracker] Шаг '{step_id}' не найден.")
        return False

    def get_current_step(self) -> Optional[PlanStep]:
        """Возвращает первый не пройденный шаг."""
        for step in self.steps:
            if step.status in (PlanStatus.PENDING, PlanStatus.IN_PROGRESS, PlanStatus.FAILED):
                return step
        return None

    def verify_plan_execution(self) -> bool:
        """
        Проверка инварианта: ∀ step ∈ Plan → status == SUCCESS (или SKIPPED).
        """
        for step in self.steps:
            if step.status not in (PlanStatus.SUCCESS, PlanStatus.SKIPPED):
                logger.warning(f"⚠️ [PlanTracker] Инвариант нарушен на шаге: {step.step_id} (Статус: {step.status.value})")
                return False
        logger.info(f"✅ [PlanTracker] Инвариант плана выполнен. Все шаги успешны.")
        return True

    def get_plan_summary(self) -> str:
        """Возвращает читабельную сводку для LLM."""
        summary = f"ПЛАН ЗАДАЧИ {self.task_id}:\n"
        for step in self.steps:
            mark = "[ ]"
            if step.status == PlanStatus.SUCCESS:
                mark = "[x]"
            elif step.status == PlanStatus.FAILED:
                mark = "[!]"
            elif step.status == PlanStatus.IN_PROGRESS:
                mark = "[~]"
            summary += f"{mark} {step.step_id}: {step.description} (Expert: {step.assigned_expert})\n"
        return summary
