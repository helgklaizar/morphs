"""
AgentBriefer is a component for assembling the Brief (Task 8 & 34).

Gathers a clear technical specification (Brief) when initializing a "Fresh" sub-agent:
- Agent's role (Explore / Plan / Execute / ...)
- Project's RAG context (CodeLens)
- Memory of past mistakes (Atropos)
- Constraints (Permissions, Cost limit)
- Initial task (task)
"""

import json
from dataclasses import dataclass, field, asdict
from typing import Optional
from core.logger import logger


# ---------------------------------------------------------------------------
# Brief data classes
# ---------------------------------------------------------------------------

@dataclass
class AgentBrief:
    """A formalized technical specification (Brief) to be passed to a sub-agent upon spawning."""
    agent_id: str
    role: str                          # Explore | Plan | Execute | Audit | Watchdog
    task: str                          # The agent's initial task
    project_name: str
    work_dir: str
    context_graph: str = ""            # Codebase context (CodeLens / GraphRAG)
    atropos_experience: str = ""       # Past mistakes from Atropos RL
    memory_summary: str = ""           # Condensed MemoryMorph memory
    constraints: dict = field(default_factory=dict)  # { "max_cost_usd": 1.5, ... }
    parent_agent_id: Optional[str] = None  # Who created this agent (for IPC)
    metadata: dict = field(default_factory=dict)

    def to_system_prompt(self) -> str:
        """Formats the Brief into a System Prompt for GeminiCore / CoreMind."""
        lines = [
            f"# Briefing for sub-agent [{self.role.upper()}] | ID: {self.agent_id}",
            f"## Task\n{self.task}",
            f"## Project\n{self.project_name} (workdir: {self.work_dir})",
        ]
        if self.context_graph:
            lines.append(f"## Codebase Context (CodeLens Graph)\n{self.context_graph}")
        if self.atropos_experience:
            lines.append(f"## Atropos RL (past mistakes — DO NOT REPEAT)\n{self.atropos_experience}")
        if self.memory_summary:
            lines.append(f"## Project Memory\n{self.memory_summary}")
        if self.constraints:
            lines.append(f"## Constraints\n{json.dumps(self.constraints, ensure_ascii=False, indent=2)}")
        if self.parent_agent_id:
            lines.append(f"## Communication\nParent (for IPC SendMessage): {self.parent_agent_id}")

        role_instructions = {
            "Explore": (
                "You are an explorer agent. Your goal is to traverse the codebase, find entry points, "
                "dependencies, and potential issues. Do not write code—only analyze and report."
            ),
            "Plan": (
                "You are a planner agent. Based on the analysis of the Explore agent, create a concrete step-by-step "
                "implementation plan. Decompose the Epic into atomic tasks (≤2h each). Do not write code."
            ),
            "Execute": (
                "You are an executor agent. Implement the tasks from the plan step by step. "
                "Each step is test → code → test. Strictly adhere to the Brief's constraints."
            ),
            "Audit": (
                "You are an auditor agent. Check the output of other agents for compliance with the Brief's requirements, "
                "code quality, and security. Provide a clear verdict: APPROVED / REJECTED + reason."
            ),
            "Watchdog": (
                "You are a watchdog agent. Periodically check the status of servers and tasks via healthcheck requests. "
                "Use sleep_agent between checks (don't get stuck in an active loop!). "
                "If a problem is detected, publish an event to the EventBus."
            ),
        }
        instr = role_instructions.get(self.role, "Perform the task strictly within the framework of the Brief.")
        lines.append(f"## Role Instructions [{self.role}]\n{instr}")

        lines.append("\n---\nRespond clearly. Use XML tags for structured output.")
        return "\n\n".join(lines)

    def to_json(self) -> str:
        return json.dumps(asdict(self), ensure_ascii=False, indent=2)


# ---------------------------------------------------------------------------
# AgentBriefer — The Brief factory
# ---------------------------------------------------------------------------

class AgentBriefer:
    """
    The brain center for assembling Briefs.
    Gathers the full context (RAG + Atropos + Memory) and packages it into an AgentBrief.
    """

    def __init__(self, work_dir: str, project_name: str):
        self.work_dir = work_dir
        self.project_name = project_name

    def build_brief(
        self,
        agent_id: str,
        role: str,
        task: str,
        parent_agent_id: Optional[str] = None,
        fetch_rag: bool = True,
        fetch_atropos: bool = True,
        fetch_memory: bool = True,
        constraints: Optional[dict] = None,
        metadata: Optional[dict] = None,
    ) -> AgentBrief:
        """
        Assembles a complete Brief for a new sub-agent.

        Args:
            agent_id:         ID of the new sub-agent
            role:             Role (Explore | Plan | Execute | Audit | Watchdog)
            task:             Initial task
            parent_agent_id:  Parent agent (for IPC)
            fetch_rag:        Load RAG context from CodeLens
            fetch_atropos:    Load Atropos RL experience
            fetch_memory:     Load condensed MemoryMorph memory
            constraints:      Override constraints
            metadata:         Additional metadata
        """
        logger.info(f"📋 [AgentBriefer] Assembling Brief for [{role}] agent {agent_id}...")

        context_graph = ""
        if fetch_rag:
            try:
                from core.graph_rag import CodeLensMorph
                lens = CodeLensMorph(self.work_dir)
                lens.build_graph()
                context_graph = lens.get_context_for_prompt(task)
                logger.info(f"✅ [AgentBriefer] RAG context loaded ({len(context_graph)} chars)")
            except Exception as e:
                logger.warning(f"⚠️ [AgentBriefer] CodeLens RAG is unavailable: {e}")

        atropos_experience = ""
        if fetch_atropos:
            try:
                from core.atropos_memory import AtroposMemory
                mem = AtroposMemory()
                atropos_experience = mem.get_relevant_experience(role, limit=5)
                logger.info(f"✅ [AgentBriefer] Atropos RL experience loaded ({len(atropos_experience)} chars)")
            except Exception as e:
                logger.warning(f"⚠️ [AgentBriefer] AtroposMemory is unavailable: {e}")

        memory_summary = ""
        if fetch_memory:
            try:
                from core.memory_morph import MemoryMorph
                memory = MemoryMorph()
                memory_summary = memory.get_context_prompt()
                logger.info(f"✅ [AgentBriefer] Project memory loaded ({len(memory_summary)} chars)")
            except Exception as e:
                logger.warning(f"⚠️ [AgentBriefer] MemoryMorph is unavailable: {e}")

        default_constraints = {
            "max_cost_usd": 1.5,
            "max_iterations": 10,
            "sandbox_only": True,
        }
        if constraints:
            default_constraints.update(constraints)

        brief = AgentBrief(
            agent_id=agent_id,
            role=role,
            task=task,
            project_name=self.project_name,
            work_dir=self.work_dir,
            context_graph=context_graph,
            atropos_experience=atropos_experience,
            memory_summary=memory_summary,
            constraints=default_constraints,
            parent_agent_id=parent_agent_id,
            metadata=metadata or {},
        )

        logger.info(f"✅ [AgentBriefer] Brief assembled for {agent_id} ({role}). Prompt size: {len(brief.to_system_prompt())} chars")
        return brief

    def build_explore_plan_team(
        self,
        task: str,
        parent_agent_id: Optional[str] = None,
    ) -> tuple["AgentBrief", "AgentBrief"]:
        """
        Prepares a pair of Briefs for the standard Explore → Plan sequence.
        The Brain creates them together and runs them in parallel (Task 37).
        """
        import uuid
        explore_id = f"agent-explore-{uuid.uuid4().hex[:6]}"
        plan_id = f"agent-plan-{uuid.uuid4().hex[:6]}"

        explore_brief = self.build_brief(
            agent_id=explore_id,
            role="Explore",
            task=f"Explore the codebase for the task: {task}",
            parent_agent_id=parent_agent_id,
            fetch_rag=True,
            fetch_atropos=False,  # Experience for the Planner; not needed for the Explorer
            fetch_memory=True,
        )
        plan_brief = self.build_brief(
            agent_id=plan_id,
            role="Plan",
            task=f"Create a plan based on the analysis of the Explore agent ({explore_id}) for the task: {task}",
            parent_agent_id=parent_agent_id,
            fetch_rag=False,     # The Planner will receive context from Explore via IPC
            fetch_atropos=True,
            fetch_memory=True,
        )

        return explore_brief, plan_brief