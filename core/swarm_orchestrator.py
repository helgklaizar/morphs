import asyncio
import os
import json
import subprocess
from workspace_manager import WorkspaceManager
from config import settings
from event_bus import bus
from task_proof_morph import TaskProofMorph
from git_morph import GitMorph
from graph_rag import CodeLensMorph
from memory_morph import MemoryMorph
from api_morph import APIMorph
from db_morph import DBMorph
from healer_morph import HealerMorph
from browser_morph import BrowserMorph
from core.logger import logger
from core.agent_briefer import AgentBriefer
from core.tools.agent_ops import AgentTools, AgentRegistry
from plan_tracker import PlanTracker, PlanStatus

class SwarmOrchestrator:
    """
    Decentralized Swarm Orchestrator.
    Listens to EventBus and coordinates Morphs asynchronously.
    Supports parallel agent pools via AgentBriefer + AgentTools (Sprint 25).
    """
    def __init__(self, watchdog):
        self.watchdog = watchdog
        # {epic_id: [agent_id, ...]} — реестр параллельных пулов (Задача 37)
        self._agent_pool: dict[str, list[str]] = {}

    async def setup_listeners(self):
        logger.info("🧠 [Orchestrator] Подписка на шину событий (Swarm Protocol)...")
        await bus.subscribe("swarm.task.created", self.on_task_created)
        await bus.subscribe("swarm.backend.generated", self.on_backend_generated)
        await bus.subscribe("swarm.ui.generated", self.on_ui_generated)
        await bus.subscribe("swarm.deployment.failed", self.on_deployment_failed)
        # Новый топик для эпиков с параллельными агентами (Задача 35)
        await bus.subscribe("swarm.epic.created", self.on_epic_task_created)

    async def trigger_task(self, task_id: str, business_type: str, message: str):
        logger.info(f"📡 [Orchestrator] Публикация задачи '{task_id}' в EventBus...")
        await bus.publish("swarm.task.created", {
            "task_id": task_id,
            "business_type": business_type,
            "message": message
        })

    # ------------------------------------------------------------------
    # Epic Orchestration — параллельные пулы Explore + Plan (Задача 35 & 37)
    # ------------------------------------------------------------------

    async def spawn_explore_plan_team(
        self,
        epic_id: str,
        task: str,
        work_dir: str,
        project_name: str,
    ) -> tuple[str, str]:
        """
        Создаёт параллельную команду Explore + Plan субагентов.
        Возвращает (explore_agent_id, plan_agent_id).
        Задача 35 & 37: Dynamic Team с пулом агентов.
        """
        briefer = AgentBriefer(work_dir=work_dir, project_name=project_name)
        explore_brief, plan_brief = briefer.build_explore_plan_team(
            task=task,
            parent_agent_id="orchestrator",
        )

        logger.info(f"🚀 [Orchestrator] Параллельный запуск команды Explore+Plan для Epic '{epic_id}'")

        # Запускаем параллельно (asyncio.gather)
        spawn_results = await asyncio.gather(
            AgentTools.spawn_agent(
                role=explore_brief.role,
                task_brief=explore_brief.to_system_prompt(),
                project_name=project_name,
            ),
            AgentTools.spawn_agent(
                role=plan_brief.role,
                task_brief=plan_brief.to_system_prompt(),
                project_name=project_name,
            ),
        )

        # Парсим agent_id из результатов
        explore_id = explore_brief.agent_id
        plan_id = plan_brief.agent_id

        # Регистрируем пул
        self._agent_pool[epic_id] = [explore_id, plan_id]
        logger.info(f"🧬 [Orchestrator] Пул для '{epic_id}': {self._agent_pool[epic_id]}")

        # IPC: оповещаем Plan-агента, к кому идти за результатами Explore
        await AgentTools.send_message(
            target_agent_id=plan_id,
            message=f"Explore agent ID для запроса результатов: {explore_id}",
        )

        return explore_id, plan_id

    async def close_epic_pool(self, epic_id: str) -> None:
        """Закрывает всех агентов из пула Epic."""
        agent_ids = self._agent_pool.pop(epic_id, [])
        for aid in agent_ids:
            result = await AgentTools.close_agent(aid)
            logger.info(f"🛑 [Orchestrator] {result}")

    async def on_epic_task_created(self, payload: dict):
        """
        Обработчик нового топика 'swarm.epic.created'.
        Для сложных эпиков — сразу формируем пул Explore+Plan.
        """
        epic_id = payload.get("epic_id", "epic-unknown")
        task = payload.get("task", "")
        work_dir = payload.get("work_dir", ".")
        project_name = payload.get("project_name", "default")

        self.watchdog.register_task(epic_id, f"Epic: {task[:50]}")
        logger.info(f"📋 [Orchestrator] Новый Epic '{epic_id}' получен — спауним команду агентов...")

        try:
            explore_id, plan_id = await self.spawn_explore_plan_team(
                epic_id=epic_id,
                task=task,
                work_dir=work_dir,
                project_name=project_name,
            )
            await bus.publish("swarm.epic.team_ready", {
                "epic_id": epic_id,
                "explore_agent_id": explore_id,
                "plan_agent_id": plan_id,
            })
        except Exception as e:
            logger.error(f"🔥 [Orchestrator] Ошибка при создании团队 для Epic '{epic_id}': {e}", exc_info=True)
            await bus.publish("swarm.deployment.failed", {"task_id": epic_id, "error": str(e)})

    async def on_task_created(self, payload: dict):
        task_id = payload.get("task_id")
        business_type = payload.get("business_type")
        message = payload.get("message")
        
        self.watchdog.register_task(task_id, "Генерация SaaS фичи через Чат")
        
        self.plan_tracker = PlanTracker(task_id=task_id)
        self.plan_tracker.create_plan([
            {"step_id": "init_workspace", "description": "Init workspace and context", "assigned_expert": "TaskProofMorph"},
            {"step_id": "generate_backend", "description": "Generate FastAPI Backend", "assigned_expert": "APIMorph"},
            {"step_id": "debate_architecture", "description": "Debate Architect vs Coder", "assigned_expert": "Architect"},
            {"step_id": "verify_ui", "description": "Verify UI with Tests and Browser", "assigned_expert": "VerificationMorph"},
            {"step_id": "deploy", "description": "Dockerize and Deploy", "assigned_expert": "DeployMorph"}
        ])
        
        logger.info(f"💬 [Task Created] Разворачиваем IDE для задачи: {task_id}")
        
        try:
            self.plan_tracker.update_step_status("init_workspace", PlanStatus.IN_PROGRESS)
            # 1. Workspace Init
            wm = WorkspaceManager()
            project_name = "".join(filter(str.isalnum, business_type.lower())) or "demo_saas"
            work_dir = wm.init_workspace(project_name)
            
            task_proof = TaskProofMorph(work_dir)
            task_proof.init_task(task_id, message)
            
            git_morph = GitMorph(work_dir)
            lens_morph = CodeLensMorph(work_dir)
            lens_morph.build_graph()
            context_graph = lens_morph.get_context_for_prompt(message)
            
            task_proof.generate_subagent_prompts(task_id, context_graph)
            frozen_spec = task_proof.freeze_spec(task_id)
            
            memory = MemoryMorph()
            memory_context = memory.get_context_prompt()
            
            if "используй" in message.lower() or "стиль" in message.lower():
                memory.add_preference(message)

            self.plan_tracker.update_step_status("init_workspace", PlanStatus.SUCCESS)
            self.plan_tracker.update_step_status("generate_backend", PlanStatus.IN_PROGRESS)
            
            logger.info("⚙️ [Core] Генерация API-Бэкенда...")
            api_agent = APIMorph(wm, project_name)
            
            from pydantic import BaseModel
            class ScaffoldReq(BaseModel):
                business_type: str
                modules: list[str]
                
            s_req = ScaffoldReq(business_type=business_type, modules=[message])
            backend_file, backend_code = api_agent.generate_backend(s_req)
            
            dbm = DBMorph(work_dir)
            dbm.apply_migrations()
            
            backend_dir = os.path.join(work_dir, "backend")
            try:
                from bash_harness import BashHarness, BashCommandInput
                harness = BashHarness()
                await harness.execute(BashCommandInput(
                    command=f"uvicorn main:app --port {settings.SAAS_BACKEND_PORT}",
                    run_in_background=True,
                    cwd=backend_dir
                ))
                logger.info(f"✅ [Workspace] Сервер ({settings.SAAS_BACKEND_PORT}) стартовал через Sandboxed BashHarness.")
            except Exception as e:
                logger.info(f"🔥 [BashHarness] Ошибка: {e}")

            self.plan_tracker.update_step_status("generate_backend", PlanStatus.SUCCESS)

            # Сигнализируем, что Бэкенд готов -> Призываем UI-Morph
            await bus.publish("swarm.backend.generated", {
                "task_id": task_id,
                "project_name": project_name,
                "work_dir": work_dir,
                "business_type": business_type,
                "frozen_spec": frozen_spec,
                "context_graph": context_graph,
                "memory_context": memory_context,
                "backend_code": backend_code,
                "message": message
            })
                
        except Exception as e:
            logger.info(f"🔥 [Task Error] {e}")
            await bus.publish("swarm.deployment.failed", {"task_id": task_id, "error": str(e)})

    async def on_backend_generated(self, payload: dict):
        logger.info("🎨 [Event: Backend Generated] Запуск UI Мутаций...")
        task_id = payload.get("task_id")
        project_name = payload.get("project_name")
        work_dir = payload.get("work_dir")
        
        if hasattr(self, "plan_tracker"):
            self.plan_tracker.update_step_status("debate_architecture", PlanStatus.IN_PROGRESS)

        
        # Получаем агента
        key = os.environ.get("GEMINI_API_KEY")
        if key:
            from core.gemini_agent import GeminiCore
            agent = GeminiCore(api_key=key)
        else:
            from mlx_agent import CoreMind
            agent = CoreMind()

        prompt = (
            f"Мы строим ФРОНТЕНД на React/Vite (TSX + Tailwind v4).\n"
            f"ЗАМОРОЖЕННОЕ ТЗ: {payload.get('frozen_spec')}\n"
            f"БЭКЕНД ПОРТ: {settings.SAAS_BACKEND_PORT}\n"
            f"АПИ КОД:\n{payload.get('backend_code')}\n\n"
            f"Вывод в XML: <file path=\"src/App.tsx\">...</file>\n"
        )
        schema = "<thought>Анализ</thought>\n<multi_file>XML</multi_file>"
        
        logger.info("🗣️ [Swarm Debate] Начинается спор Агентов (Coder vs Architect)...")
        res = agent.think_structured(prompt, schema)
        multi_file_xml = res.get("multi_file", "")
        
        from debate_bus import TeamDebateConsensus
        from ast_morph import ASTInvariantValidator
        import re
        
        async def ast_math_validator(payload: str) -> bool:
            # Mathematical invariant proof for TSX
            code_blocks = re.findall(r'<file.*?>(.*?)</file>', payload, re.DOTALL)
            if not code_blocks:
                logger.error("❌ AST Proof Failed: No files extracted from XML.")
                return False
                
            for code in code_blocks:
                is_valid, msg = ASTInvariantValidator.prove(code, language="tsx")
                if not is_valid:
                    logger.error(f"❌ AST Math Proof Failed: {msg}")
                    return False
            return True
            
        debater = TeamDebateConsensus(required_approvals=1)
        is_approved = await debater.run_debate(
            context_payload=multi_file_xml, 
            validators=[ast_math_validator]
        )
        
        if not is_approved:
            logger.info("❌ Архитектурный спор провален. Отправка на перегенерацию!")
            return # Future: add retry loop
            
        logger.info("✅ [Architect-Morph] Ревью пройдено честно!")
        
        if hasattr(self, "plan_tracker"):
            self.plan_tracker.update_step_status("debate_architecture", PlanStatus.SUCCESS)
                
        target_dir = "../configurator/src/components"
        await bus.publish("swarm.workspace.write_module", {
            "task_id": task_id,
            "project_name": project_name,
            "work_dir": work_dir,
            "target_dir": target_dir,
            "multi_file_xml": multi_file_xml
        })

    async def on_ui_generated(self, payload: dict):
        logger.info("🚀 [Event: UI Generated] Запуск Авто-Тестов и E2E (Хирург)...")
        task_id = payload.get("task_id")
        target_dir = payload.get("target_dir")
        work_dir = payload.get("work_dir")
        
        if hasattr(self, "plan_tracker"):
            self.plan_tracker.update_step_status("verify_ui", PlanStatus.IN_PROGRESS)
            
        task_proof = TaskProofMorph(work_dir)
        git_morph = GitMorph(work_dir)
        
        from verification_morph import VerificationMorph
        verifier = VerificationMorph("../configurator", work_dir, f"{target_dir}/GeneratedModule.tsx")
        is_valid, evidence = await verifier.run_verification()
        
        task_proof.collect_evidence(task_id, "build.txt", f"VERIFICATION LOG:\n{evidence}")
        
        if not is_valid:
            logger.info("🔥 [Verification] Тесты или E2E провалены! Healer-Morph лечит...")
            from healer_morph import HealerMorph
            healer = HealerMorph("../configurator", f"{target_dir}/GeneratedModule.tsx")
            prompt_heal, fixed_code = await healer.heal_code(task_proof.get_task_folder(task_id))
            
            # Вторая попытка верификации (Пост-фикс)
            is_valid2, evidence2 = await verifier.run_verification()
            if is_valid2:
                logger.info("✅ [Verification] Баг исправлен Healer'ом!")
                healer.record_trajectory(prompt_heal, "MLX Auto-Fix", 1, fixed_code)
            else:
                logger.info("❌ [Verification] Хил не помог. ВАЙП. Откат!")
                if hasattr(self, "plan_tracker"):
                    self.plan_tracker.update_step_status("verify_ui", PlanStatus.FAILED, evidence2)
                git_morph.rollback()
                self.watchdog.complete_task(task_id)
                await bus.publish("swarm.deployment.failed", {"task_id": task_id})
                return
                
        if hasattr(self, "plan_tracker"):
            self.plan_tracker.update_step_status("verify_ui", PlanStatus.SUCCESS)
            self.plan_tracker.update_step_status("deploy", PlanStatus.IN_PROGRESS)
            
        logger.info("📦 [DevOps] Пакуем готовое SaaS решение в Docker (Deploy-Morph)...")
        from deploy_morph import DeployMorph
        deployer = DeployMorph()
        deployer.generate_deploy_artifacts(work_dir, payload.get("project_name"))
        
        # Сохраняем Blueprint State для тестов (эмуляция BlueprintsMorph)
        blueprint_dir = "blueprints"
        os.makedirs(blueprint_dir, exist_ok=True)
        with open(f"{blueprint_dir}/{payload.get('project_name')}_state.json", "w") as f:
            import json
            json.dump({"business_type": payload.get("project_name"), "status": "deployed"}, f)
            
        task_proof.write_verdict(task_id, {"status": "success", "evidence_collected": True, "dockerized": True})
        
        if hasattr(self, "plan_tracker"):
            self.plan_tracker.update_step_status("deploy", PlanStatus.SUCCESS)
            if self.plan_tracker.verify_plan_execution():
                logger.info("🎯 [Orchestrator] FSM-Инвариант Плана Выполнен (Все шаги SUCCESS).")
            else:
                logger.warning("⚠️ [Orchestrator] План выполнен, но есть сломанные/пропущенные шаги.")
                
        self.watchdog.complete_task(task_id)
        logger.info(f"🎉 [Swarm] Задача '{task_id}' завершена успешно! Docker-контейнеры готовы для Production.")

    async def on_deployment_failed(self, payload: dict):
        logger.info(f"💀 [Fatal] Откат системы по задаче {payload.get('task_id')}: {payload.get('error')}")
        self.watchdog.complete_task(payload.get('task_id'))
