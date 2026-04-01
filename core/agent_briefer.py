"""
AgentBriefer — компонент сборки Brief (Задача 8 & 34).

Собирает четкое ТЗ (Brief) при инициализации "Fresh" субагента:
- Роль агента (Explore / Plan / Execute / ...)
- RAG-контекст проекта (CodeLens)
- Память прошлых ошибок (Atropos)
- Ограничения (Permissions, Cost limit)
- Начальная задача (task)
"""

import json
from dataclasses import dataclass, field, asdict
from typing import Optional
from core.logger import logger


# ---------------------------------------------------------------------------
# Data-классы Brief
# ---------------------------------------------------------------------------

@dataclass
class AgentBrief:
    """Формализованное ТЗ (Brief) для передачи субагенту при спауне."""
    agent_id: str
    role: str                          # Explore | Plan | Execute | Audit | Watchdog
    task: str                          # Первоначальная задача агента
    project_name: str
    work_dir: str
    context_graph: str = ""            # Контекст кодовой базы (CodeLens / GraphRAG)
    atropos_experience: str = ""       # Прошлые ошибки из Atropos RL
    memory_summary: str = ""           # Сжатая память MemoryMorph
    constraints: dict = field(default_factory=dict)  # { "max_cost_usd": 1.5, ... }
    parent_agent_id: Optional[str] = None  # Кто создал этого агента (для IPC)
    metadata: dict = field(default_factory=dict)

    def to_system_prompt(self) -> str:
        """Форматирует Brief в System Prompt для GeminiCore / CoreMind."""
        lines = [
            f"# Briefing для субагента [{self.role.upper()}] | ID: {self.agent_id}",
            f"## Задача\n{self.task}",
            f"## Проект\n{self.project_name} (workdir: {self.work_dir})",
        ]
        if self.context_graph:
            lines.append(f"## Контекст кодовой базы (CodeLens Graph)\n{self.context_graph}")
        if self.atropos_experience:
            lines.append(f"## Atropos RL (прошлые ошибки — НЕ ПОВТОРЯЙ)\n{self.atropos_experience}")
        if self.memory_summary:
            lines.append(f"## Память проекта\n{self.memory_summary}")
        if self.constraints:
            lines.append(f"## Ограничения\n{json.dumps(self.constraints, ensure_ascii=False, indent=2)}")
        if self.parent_agent_id:
            lines.append(f"## Связь\nРодитель (для IPC SendMessage): {self.parent_agent_id}")

        role_instructions = {
            "Explore": (
                "Ты агент-исследователь. Твоя цель — обойти кодовую базу, найти точки входа, "
                "зависимости и потенциальные проблемы. Не пиши код — только анализируй и докладывай."
            ),
            "Plan": (
                "Ты агент-планировщик. На основе анализа Explore-агента составь конкретный пошаговый план "
                "реализации. Декомпозируй Epic на атомарные задачи (≤2ч каждая). Не пиши код."
            ),
            "Execute": (
                "Ты агент-исполнитель. Реализуй задачи из плана шаг за шагом. "
                "Каждый шаг — тест → код → тест. Строго соблюдай ограничения Brief."
            ),
            "Audit": (
                "Ты агент-аудитор. Проверяй вывод других агентов на соответствие требованиям Brief, "
                "качество кода и безопасность. Выдавай чёткий вердикт: APPROVED / REJECTED + причина."
            ),
            "Watchdog": (
                "Ты агент-сторож. Периодически проверяй статус серверов и задач через healthcheck-запросы. "
                "Используй sleep_agent между проверками (не висни в активном цикле!). "
                "При обнаружении проблемы — публикуй событие в EventBus."
            ),
        }
        instr = role_instructions.get(self.role, "Выполняй задачу строго в рамках Brief.")
        lines.append(f"## Инструкции роли [{self.role}]\n{instr}")

        lines.append("\n---\nОтвечай чётко. Используй XML-теги для структурированного вывода.")
        return "\n\n".join(lines)

    def to_json(self) -> str:
        return json.dumps(asdict(self), ensure_ascii=False, indent=2)


# ---------------------------------------------------------------------------
# AgentBriefer — фабрика Brief
# ---------------------------------------------------------------------------

class AgentBriefer:
    """
    Мозговой центр сборки Brief.
    Собирает полный контекст (RAG + Atropos + Memory) и упаковывает в AgentBrief.
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
        Собирает полный Brief для нового субагента.

        Args:
            agent_id:         ID нового субагента
            role:             Роль (Explore | Plan | Execute | Audit | Watchdog)
            task:             Первоначальная задача
            parent_agent_id:  Родительский агент (для IPC)
            fetch_rag:        Загружать RAG-контекст из CodeLens
            fetch_atropos:    Загружать Atropos RL опыт
            fetch_memory:     Загружать сжатую память MemoryMorph
            constraints:      Переопределить ограничения
            metadata:         Дополнительные мета-данные
        """
        logger.info(f"📋 [AgentBriefer] Сборка Brief для [{role}] агента {agent_id}...")

        context_graph = ""
        if fetch_rag:
            try:
                from core.graph_rag import CodeLensMorph
                lens = CodeLensMorph(self.work_dir)
                lens.build_graph()
                context_graph = lens.get_context_for_prompt(task)
                logger.info(f"✅ [AgentBriefer] RAG контекст загружен ({len(context_graph)} chars)")
            except Exception as e:
                logger.warning(f"⚠️ [AgentBriefer] CodeLens RAG недоступен: {e}")

        atropos_experience = ""
        if fetch_atropos:
            try:
                from core.atropos_memory import AtroposMemory
                mem = AtroposMemory()
                atropos_experience = mem.get_relevant_experience(role, limit=5)
                logger.info(f"✅ [AgentBriefer] Atropos RL опыт загружен ({len(atropos_experience)} chars)")
            except Exception as e:
                logger.warning(f"⚠️ [AgentBriefer] AtroposMemory недоступна: {e}")

        memory_summary = ""
        if fetch_memory:
            try:
                from core.memory_morph import MemoryMorph
                memory = MemoryMorph()
                memory_summary = memory.get_context_prompt()
                logger.info(f"✅ [AgentBriefer] Память проекта загружена ({len(memory_summary)} chars)")
            except Exception as e:
                logger.warning(f"⚠️ [AgentBriefer] MemoryMorph недоступна: {e}")

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

        logger.info(f"✅ [AgentBriefer] Brief собран для {agent_id} ({role}). Размер промпта: {len(brief.to_system_prompt())} chars")
        return brief

    def build_explore_plan_team(
        self,
        task: str,
        parent_agent_id: Optional[str] = None,
    ) -> tuple["AgentBrief", "AgentBrief"]:
        """
        Готовит пару Brief для стандартной связки Explore → Plan.
        Мозг создаёт их вместе и запускает параллельно (Задача 37).
        """
        import uuid
        explore_id = f"agent-explore-{uuid.uuid4().hex[:6]}"
        plan_id = f"agent-plan-{uuid.uuid4().hex[:6]}"

        explore_brief = self.build_brief(
            agent_id=explore_id,
            role="Explore",
            task=f"Исследуй кодовую базу под задачу: {task}",
            parent_agent_id=parent_agent_id,
            fetch_rag=True,
            fetch_atropos=False,  # Планировщику — опыт; Исследователю — не нужен
            fetch_memory=True,
        )
        plan_brief = self.build_brief(
            agent_id=plan_id,
            role="Plan",
            task=f"Составь план на основе анализа Explore-агента ({explore_id}) для задачи: {task}",
            parent_agent_id=parent_agent_id,
            fetch_rag=False,     # Планировщик получит контекст от Explore через IPC
            fetch_atropos=True,
            fetch_memory=True,
        )

        return explore_brief, plan_brief
