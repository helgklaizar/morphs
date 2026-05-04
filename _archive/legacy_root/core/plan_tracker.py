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
    A mathematically rigorous FSM for managing the execution plan.
    """
    task_id: str
    steps: List[PlanStep] = Field(default_factory=list)
    
    def create_plan(self, steps_data: List[dict]):
        """Initializes the FSM with new steps"""
        self.steps = []
        for s in steps_data:
            self.steps.append(PlanStep(**s))
        logger.info(f"📋 [PlanTracker] Plan for task {self.task_id} created. Steps: {len(self.steps)}")

    def update_step_status(self, step_id: str, new_status: PlanStatus, evidence: str = None) -> bool:
        """Atomic state transaction (state transition)."""
        for step in self.steps:
            if step.step_id == step_id:
                step.status = new_status
                if evidence:
                    step.evidence = evidence
                logger.info(f"🔄 [PlanTracker] Step '{step_id}' transitioned to status: {new_status.value.upper()}")
                return True
        logger.error(f"❌ [PlanTracker] Step '{step_id}' not found.")
        return False

    def get_current_step(self) -> Optional[PlanStep]:
        """Returns the first non-completed step."""
        for step in self.steps:
            if step.status in (PlanStatus.PENDING, PlanStatus.IN_PROGRESS, PlanStatus.FAILED):
                return step
        return None

    def verify_plan_execution(self) -> bool:
        """
        Invariant check: ∀ step ∈ Plan → status == SUCCESS (or SKIPPED).
        """
        for step in self.steps:
            if step.status not in (PlanStatus.SUCCESS, PlanStatus.SKIPPED):
                logger.warning(f"⚠️ [PlanTracker] Invariant violated at step: {step.step_id} (Status: {step.status.value})")
                return False
        logger.info(f"✅ [PlanTracker] Plan invariant holds. All steps are successful.")
        return True

    def get_plan_summary(self) -> str:
        """Returns a readable summary for the LLM."""
        summary = f"TASK PLAN {self.task_id}:\n"
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
