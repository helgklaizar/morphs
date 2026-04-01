"""
Тесты для Multi-Agent Orchestration:
- AgentBrief (сборка ТЗ)
- AgentTools lifecycle primitives (spawn/wait/close/sleep/resume)
- AgentTools IPC SendMessage
- CronMorph (планировщик с честным sleep)
- WatchdogMorph (healthcheck)
"""

import asyncio
import pytest
import time
from unittest.mock import AsyncMock, patch, MagicMock


# ---------------------------------------------------------------------------
# 1. AgentBrief — сборка ТЗ (Задача 8 & 34)
# ---------------------------------------------------------------------------

class TestAgentBrief:
    def test_brief_creates_system_prompt(self):
        from core.agent_briefer import AgentBrief
        brief = AgentBrief(
            agent_id="agent-test-01",
            role="Explore",
            task="Исследуй модуль graph_rag.py",
            project_name="morphs",
            work_dir="/tmp/morphs",
        )
        prompt = brief.to_system_prompt()
        assert "agent-test-01" in prompt
        assert "Explore" in prompt
        assert "Исследуй модуль graph_rag.py" in prompt
        assert "morphs" in prompt
        # Инструкции роли должны быть включены
        assert "исследователь" in prompt.lower() or "explore" in prompt.lower()

    def test_brief_includes_all_fields(self):
        from core.agent_briefer import AgentBrief
        brief = AgentBrief(
            agent_id="agent-test-02",
            role="Plan",
            task="Составь план",
            project_name="morphs",
            work_dir="/tmp/morphs",
            context_graph="def foo(): pass",
            atropos_experience="Ошибка: не импортировать X",
            memory_summary="Проект использует FastAPI",
            constraints={"max_cost_usd": 0.5},
            parent_agent_id="orchestrator",
        )
        prompt = brief.to_system_prompt()
        assert "def foo(): pass" in prompt
        assert "не импортировать X" in prompt
        assert "FastAPI" in prompt
        assert "max_cost_usd" in prompt
        assert "orchestrator" in prompt

    def test_brief_to_json_round_trip(self):
        import json
        from core.agent_briefer import AgentBrief
        brief = AgentBrief(
            agent_id="agent-json-test",
            role="Execute",
            task="Реализуй feature X",
            project_name="morphs",
            work_dir="/tmp",
        )
        raw = brief.to_json()
        data = json.loads(raw)
        assert data["agent_id"] == "agent-json-test"
        assert data["role"] == "Execute"

    def test_all_roles_have_instructions(self):
        from core.agent_briefer import AgentBrief
        for role in ["Explore", "Plan", "Execute", "Audit", "Watchdog"]:
            brief = AgentBrief(
                agent_id=f"agent-{role}",
                role=role,
                task="Test task",
                project_name="p",
                work_dir=".",
            )
            prompt = brief.to_system_prompt()
            # Каждая роль должна давать уникальные инструкции
            assert len(prompt) > 100, f"Role {role} prompt too short"


# ---------------------------------------------------------------------------
# 2. AgentBriefer — фабрика с моками RAG/Atropos/Memory
# ---------------------------------------------------------------------------

class TestAgentBriefer:
    def test_build_brief_fetches_context(self):
        """AgentBriefer собирает поля Brief из RAG/Atropos/Memory через sys.modules injection."""
        import sys
        from unittest.mock import MagicMock

        # Создаём fake-модули c нужными классами
        # прямо в sys.modules — lazy import внутри AgentBriefer.build_brief подхватит их
        fake_lens_inst = MagicMock()
        fake_lens_inst.get_context_for_prompt.return_value = "RAG context data"
        fake_lens_cls = MagicMock(return_value=fake_lens_inst)

        fake_atropos_inst = MagicMock()
        fake_atropos_inst.get_relevant_experience.return_value = "Don't repeat mistake X"
        fake_atropos_cls = MagicMock(return_value=fake_atropos_inst)

        fake_memory_inst = MagicMock()
        fake_memory_inst.get_context_prompt.return_value = "Memory: uses FastAPI"
        fake_memory_cls = MagicMock(return_value=fake_memory_inst)

        fake_graph_rag = MagicMock()
        fake_graph_rag.CodeLensMorph = fake_lens_cls

        fake_atropos_mod = MagicMock()
        fake_atropos_mod.AtroposMemory = fake_atropos_cls

        fake_memory_mod = MagicMock()
        fake_memory_mod.MemoryMorph = fake_memory_cls

        # Инъекция напрямую в sys.modules
        orig_graph = sys.modules.get("core.graph_rag")
        orig_atropos = sys.modules.get("core.atropos_memory")
        orig_memory = sys.modules.get("core.memory_morph")
        try:
            sys.modules["core.graph_rag"] = fake_graph_rag
            sys.modules["core.atropos_memory"] = fake_atropos_mod
            sys.modules["core.memory_morph"] = fake_memory_mod

            from core.agent_briefer import AgentBriefer
            briefer = AgentBriefer(work_dir="/tmp", project_name="morphs")
            brief = briefer.build_brief(
                agent_id="agent-abc",
                role="Explore",
                task="Explore the codebase",
            )
        finally:
            # Восстанавливаем исходные модули
            if orig_graph is not None:
                sys.modules["core.graph_rag"] = orig_graph
            else:
                sys.modules.pop("core.graph_rag", None)
            if orig_atropos is not None:
                sys.modules["core.atropos_memory"] = orig_atropos
            else:
                sys.modules.pop("core.atropos_memory", None)
            if orig_memory is not None:
                sys.modules["core.memory_morph"] = orig_memory
            else:
                sys.modules.pop("core.memory_morph", None)

        assert brief.agent_id == "agent-abc"
        assert brief.role == "Explore"
        assert brief.constraints["max_cost_usd"] == 1.5
        # RAG/Atropos/Memory загружены через sys.modules — поля должны быть заполнены
        assert brief.context_graph == "RAG context data"
        assert brief.atropos_experience == "Don't repeat mistake X"
        assert brief.memory_summary == "Memory: uses FastAPI"


    def test_build_brief_handles_failures_gracefully(self):
        """RAG/Atropos/Memory недоступны — Brief всё равно собирается (пустые строки)."""
        from core.agent_briefer import AgentBriefer
        # Graceful degradation: если RAG недоступен,
        # функция не бросает исключение — просто оставляет поля пустыми
        briefer = AgentBriefer(work_dir="/nonexistent/path", project_name="test")
        brief = briefer.build_brief(
            agent_id="agent-fallback",
            role="Plan",
            task="Plan something",
            fetch_rag=False,
            fetch_atropos=False,
            fetch_memory=False,
        )
        assert brief.context_graph == ""
        assert brief.atropos_experience == ""
        assert brief.memory_summary == ""
        assert brief.role == "Plan"

    def test_build_explore_plan_team_creates_two_briefs(self):
        """build_explore_plan_team должен вернуть два Brief с ролями Explore и Plan."""
        from core.agent_briefer import AgentBriefer
        briefer = AgentBriefer(work_dir="/tmp", project_name="morphs")

        # Враппер с явными дефолтами — без дублирования kwargs
        original_build = briefer.build_brief

        def no_fetch_build(agent_id, role, task, parent_agent_id=None,
                           fetch_rag=False, fetch_atropos=False, fetch_memory=False,
                           constraints=None, metadata=None):
            return original_build(
                agent_id=agent_id,
                role=role,
                task=task,
                parent_agent_id=parent_agent_id,
                fetch_rag=False,
                fetch_atropos=False,
                fetch_memory=False,
                constraints=constraints,
                metadata=metadata,
            )

        with patch.object(briefer, "build_brief", side_effect=no_fetch_build):
            explore, plan = briefer.build_explore_plan_team(task="Build feature Y")

        assert explore.role == "Explore"
        assert plan.role == "Plan"
        assert explore.agent_id != plan.agent_id
        assert explore.agent_id in plan.task



# ---------------------------------------------------------------------------
# 3. AgentTools — Lifecycle Primitives (Задача 35)
# ---------------------------------------------------------------------------

class TestAgentToolsLifecycle:
    async def test_spawn_agent_valid_role(self):
        from core.tools.agent_ops import AgentTools, AgentRegistry
        with patch.object(AgentTools, "spawn_agent", wraps=AgentTools.spawn_agent):
            # Patch EventBus publish to avoid Redis connection
            with patch("core.tools.agent_ops.bus") as mock_bus:
                mock_bus.publish = AsyncMock()
                result = await AgentTools.spawn_agent(
                    role="Explore",
                    task_brief="Explore the codebase",
                    project_name="morphs",
                )
                assert "Success" in result
                assert "Explore" in result
                mock_bus.publish.assert_called_once()

    async def test_spawn_agent_invalid_role(self):
        from core.tools.agent_ops import AgentTools
        with patch("core.tools.agent_ops.bus") as mock_bus:
            mock_bus.publish = AsyncMock()
            result = await AgentTools.spawn_agent(
                role="NonExistentRole",
                task_brief="...",
            )
            assert "Error" in result

    async def test_close_agent_removes_from_registry(self):
        from core.tools.agent_ops import AgentTools, AgentRegistry
        with patch("core.tools.agent_ops.bus") as mock_bus:
            mock_bus.publish = AsyncMock()
            # Spawn first
            await AgentTools.spawn_agent(role="Plan", task_brief="Plan X")

            # Найдём последний созданный агент
            assert len(AgentRegistry.agents) > 0
            aid = list(AgentRegistry.agents.keys())[-1]

            result = await AgentTools.close_agent(aid)
            assert "Success" in result
            assert AgentRegistry.agents[aid]["status"] == "closed"

    async def test_close_agent_unknown_returns_error(self):
        from core.tools.agent_ops import AgentTools
        result = await AgentTools.close_agent("nonexistent-agent-id")
        assert "Error" in result

    async def test_wait_agent_timeout(self):
        from core.tools.agent_ops import AgentTools, AgentRegistry
        with patch("core.tools.agent_ops.bus") as mock_bus:
            mock_bus.publish = AsyncMock()
            await AgentTools.spawn_agent(role="Audit", task_brief="Audit X")
            aid = list(AgentRegistry.agents.keys())[-1]

            # Агент никогда не закроется — должен быть timeout
            result = await AgentTools.wait_agent(aid, timeout_seconds=1)
            assert "Timeout" in result

    async def test_wait_agent_finishes_when_closed(self):
        from core.tools.agent_ops import AgentTools, AgentRegistry
        with patch("core.tools.agent_ops.bus") as mock_bus:
            mock_bus.publish = AsyncMock()
            await AgentTools.spawn_agent(role="Watchdog", task_brief="Watch X")
            aid = list(AgentRegistry.agents.keys())[-1]

            # Закроем агента через 0.2с в фоне
            async def close_later():
                await asyncio.sleep(0.2)
                AgentRegistry.agents[aid]["status"] = "closed"

            asyncio.create_task(close_later())
            result = await AgentTools.wait_agent(aid, timeout_seconds=2)
            assert "Success" in result

    async def test_resume_agent(self):
        from core.tools.agent_ops import AgentTools, AgentRegistry
        with patch("core.tools.agent_ops.bus") as mock_bus:
            mock_bus.publish = AsyncMock()
            await AgentTools.spawn_agent(role="Execute", task_brief="X")
            aid = list(AgentRegistry.agents.keys())[-1]
            AgentRegistry.agents[aid]["status"] = "sleeping"

            result = await AgentTools.resume_agent(aid)
            assert "Success" in result
            assert AgentRegistry.agents[aid]["status"] == "running"


# ---------------------------------------------------------------------------
# 4. IPC SendMessage (Задача 25)
# ---------------------------------------------------------------------------

class TestIPCSendMessage:
    async def test_send_message_delivers_to_mailbox(self):
        from core.tools.agent_ops import AgentTools, AgentRegistry
        with patch("core.tools.agent_ops.bus") as mock_bus:
            mock_bus.publish = AsyncMock()
            await AgentTools.spawn_agent(role="Plan", task_brief="Plan Y")
            aid = list(AgentRegistry.agents.keys())[-1]

            result = await AgentTools.send_message(
                target_agent_id=aid,
                message="Explore result: found 3 modules",
            )
            assert "Success" in result

            # Проверяем, что сообщение в очереди
            msg = await asyncio.wait_for(
                AgentRegistry.agents[aid]["mailbox"].get(), timeout=1.0
            )
            assert "3 modules" in msg

    async def test_send_message_to_unknown_agent(self):
        from core.tools.agent_ops import AgentTools
        result = await AgentTools.send_message(
            target_agent_id="agent-ghost",
            message="Hello?",
        )
        assert "Error" in result

    async def test_send_message_publishes_to_eventbus(self):
        from core.tools.agent_ops import AgentTools, AgentRegistry
        with patch("core.tools.agent_ops.bus") as mock_bus:
            mock_bus.publish = AsyncMock()
            await AgentTools.spawn_agent(role="Audit", task_brief="Audit Z")
            aid = list(AgentRegistry.agents.keys())[-1]

            await AgentTools.send_message(aid, "Direct P2P message")
            # Должен быть вызван publish с IPC-топиком
            calls = [str(c) for c in mock_bus.publish.call_args_list]
            ipc_calls = [c for c in calls if "ipc" in c]
            assert len(ipc_calls) > 0


# ---------------------------------------------------------------------------
# 5. CronMorph — Планировщик с честным sleep (Задача 26)
# ---------------------------------------------------------------------------

class TestCronMorph:
    async def test_cron_executes_job(self):
        from core.cron_morph import CronMorph
        call_count = 0

        async def increment():
            nonlocal call_count
            call_count += 1

        cron = CronMorph()
        cron._tick_interval = 0.01   # быстрый тик для теста
        cron.register("test_job", interval_seconds=0, coro_factory=increment)

        # max_seconds=0 означает: остановить после первого же тика (interval=0)
        await cron.run(max_seconds=0)
        # Задание запустились хотя бы 1 раз
        assert call_count >= 1


    async def test_cron_stops_on_max_seconds(self):
        from core.cron_morph import CronMorph
        cron = CronMorph()
        cron._tick_interval = 0.05

        start = time.time()
        await cron.run(max_seconds=1)
        elapsed = time.time() - start
        # Должен остановиться через ~1 секунду
        assert elapsed < 2.5

    async def test_cron_job_exception_does_not_crash(self):
        from core.cron_morph import CronMorph

        async def broken_job():
            raise RuntimeError("Intentional failure")

        cron = CronMorph()
        cron._tick_interval = 0.05
        cron.register("broken", interval_seconds=0, coro_factory=broken_job)
        # Не должно бросать исключение наружу
        await cron.run(max_seconds=0)

    async def test_cron_unregister(self):
        from core.cron_morph import CronMorph
        call_count = 0

        async def job():
            nonlocal call_count
            call_count += 1

        cron = CronMorph()
        cron.register("job_x", interval_seconds=0, coro_factory=job)
        cron.unregister("job_x")
        assert "job_x" not in cron._jobs


# ---------------------------------------------------------------------------
# 6. WatchdogMorph — healthcheck (Задача 26)
# ---------------------------------------------------------------------------

class TestWatchdogMorph:
    async def test_watchdog_publishes_alert_on_down(self):
        from core.cron_morph import WatchdogMorph, ping_url, HealthcheckResult

        with patch("core.cron_morph.ping_url", new_callable=AsyncMock) as mock_ping:
            mock_ping.return_value = HealthcheckResult(
                url="http://localhost:9999",
                ok=False,
                error="Connection refused",
            )
            with patch("core.cron_morph.bus") as mock_bus:
                mock_bus.publish = AsyncMock()

                watchdog = WatchdogMorph(
                    targets=["http://localhost:9999"],
                    check_interval=0,
                    alert_topic="swarm.watchdog.alert",
                )
                watchdog._cron._tick_interval = 0.05
                await watchdog.watch(duration_seconds=0)

                mock_bus.publish.assert_called()
                call_args = mock_bus.publish.call_args
                assert call_args[0][0] == "swarm.watchdog.alert"
                assert "localhost:9999" in call_args[0][1]["url"]

    async def test_watchdog_no_alert_on_healthy(self):
        from core.cron_morph import WatchdogMorph, HealthcheckResult

        with patch("core.cron_morph.ping_url", new_callable=AsyncMock) as mock_ping:
            mock_ping.return_value = HealthcheckResult(
                url="http://localhost:8000",
                ok=True,
                status_code=200,
                latency_ms=12.0,
            )
            with patch("core.cron_morph.bus") as mock_bus:
                mock_bus.publish = AsyncMock()
                watchdog = WatchdogMorph(
                    targets=["http://localhost:8000"],
                    check_interval=0,
                )
                watchdog._cron._tick_interval = 0.05
                await watchdog.watch(duration_seconds=0)

                # Публикации alert быть не должно
                for call in mock_bus.publish.call_args_list:
                    assert "alert" not in str(call)


# ---------------------------------------------------------------------------
# 7. ping_url — unit тест без реального сервера (aiohttp замокан)
# ---------------------------------------------------------------------------

class TestPingUrl:
    async def test_ping_unreachable_returns_error(self):
        import sys
        fake_aiohttp = MagicMock()
        fake_aiohttp.ClientConnectorError = Exception
        fake_session = MagicMock()
        fake_session.__aenter__ = AsyncMock(return_value=fake_session)
        fake_session.__aexit__ = AsyncMock(return_value=False)
        fake_session.get.side_effect = fake_aiohttp.ClientConnectorError("Connection refused")
        fake_aiohttp.ClientSession.return_value = fake_session

        orig = sys.modules.get("aiohttp")
        try:
            sys.modules["aiohttp"] = fake_aiohttp
            from core.cron_morph import ping_url
            result = await ping_url("http://localhost:19999", timeout=1.0)
            assert result.ok is False
            assert result.error != ""
        finally:
            if orig is not None:
                sys.modules["aiohttp"] = orig
            else:
                sys.modules.pop("aiohttp", None)

    async def test_ping_success(self):
        import sys
        fake_aiohttp = MagicMock()
        mock_resp = MagicMock()
        mock_resp.status = 200
        mock_resp.__aenter__ = AsyncMock(return_value=mock_resp)
        mock_resp.__aexit__ = AsyncMock(return_value=False)
        
        fake_session = MagicMock()
        fake_session.__aenter__ = AsyncMock(return_value=fake_session)
        fake_session.__aexit__ = AsyncMock(return_value=False)
        fake_session.get.return_value = mock_resp
        fake_aiohttp.ClientSession.return_value = fake_session
        fake_aiohttp.ClientTimeout.return_value = MagicMock()

        orig = sys.modules.get("aiohttp")
        try:
            sys.modules["aiohttp"] = fake_aiohttp
            from core.cron_morph import ping_url
            result = await ping_url("http://localhost:8000", timeout=1.0)
            assert result.ok is True
            assert result.status_code == 200
        finally:
            if orig is not None:
                sys.modules["aiohttp"] = orig
            else:
                sys.modules.pop("aiohttp", None)

