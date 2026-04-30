import asyncio
import uuid
import time
from core.logger import logger
from core.event_bus import bus

class AgentRegistry:
    """Global state for spawned subagents."""
    agents = {}

class AgentTools:
    """
    Subagent Orchestration Tools (Codex-style Lifecycle Primitives).
    Supports spawning 'Explore'/'Plan' roles, passing Briefings, and IPC P2P messaging.
    """

    @staticmethod
    async def spawn_agent(role: str, task_brief: str, project_name: str = "default_project") -> str:
        """
        [Primitive: spawn_agent] Dynamically creates a new subagent with a specific role and Briefing.
        Returns a unique agent_id.
        """
        valid_roles = {"Explore", "Plan", "Execute", "Audit", "Watchdog"}
        if role not in valid_roles:
            return f"Error: Role {role} is not recognized. Try one of: {valid_roles}"
            
        agent_id = f"agent-{uuid.uuid4().hex[:8]}"
        logger.info(f"🧬 [Agent-Ops] Brain is creating a new subagent {agent_id} with role '{role}'")
        logger.info(f"📋 [Agent-Ops] Brief (ToR): {task_brief[:50]}...")
        
        AgentRegistry.agents[agent_id] = {
            "role": role,
            "status": "running",
            "brief": task_brief,
            "project_name": project_name,
            "task": None,
            "mailbox": asyncio.Queue()
        }
        
        async def background_agent_loop(aid):
            try:
                # In the future: an instance of GeminiCore/CoreMind will be launched here and run in a loop
                while AgentRegistry.agents[aid]["status"] != "closed":
                    if AgentRegistry.agents[aid]["status"] == "sleeping":
                        await asyncio.sleep(1)
                        continue
                        
                    try:
                        # Listening to the P2P mailbox (Task 25 - IPC SendMessage)
                        msg = await asyncio.wait_for(AgentRegistry.agents[aid]["mailbox"].get(), timeout=1.0)
                        logger.info(f"📩 [Subagent {aid} ({role})] Received IPC message: {msg}")
                    except asyncio.TimeoutError:
                        pass
            except asyncio.CancelledError:
                logger.info(f"💀 [Subagent {aid}] Background task cancelled.")

        try:
            loop = asyncio.get_running_loop()
            t = loop.create_task(background_agent_loop(agent_id))
            AgentRegistry.agents[agent_id]["task"] = t
        except RuntimeError:
            # If no loop is running
            pass
            
        # Notify the entire Swarm about initialization via EventBus
        try:
            await bus.publish("swarm.agent.spawned", {
                "agent_id": agent_id,
                "role": role,
                "brief": task_brief
            })
        except Exception as e:
            logger.error(f"⚠️ [AgentTools] EventBus error: {e}")
            
        return f"Success: Spawned '{role}' subagent. ID: {agent_id}. Brief transmitted."

    @staticmethod
    async def send_message(target_agent_id: str, message: str) -> str:
        """
        [Primitive: send_input / IPC SendMessage] Direct P2P inter-agent communication via EventBus.
        Bypasses bloated Orchestrator history logs.
        """
        if target_agent_id not in AgentRegistry.agents:
            return f"Error: Agent {target_agent_id} not found in pool."
            
        logger.info(f"📨 [IPC SendMessage] Sending message '{message[:30]}...' -> {target_agent_id}")
        await AgentRegistry.agents[target_agent_id]["mailbox"].put(message)
        
        try:
            await bus.publish(f"swarm.agent.ipc.{target_agent_id}", {"message": message})
        except Exception as e:
            logger.error(f"⚠️ [AgentTools] EventBus IPC error: {e}")
            
        return f"Success: Sent direct IPC message to {target_agent_id}."

    @staticmethod
    async def wait_agent(agent_id: str, timeout_seconds: int = 10) -> str:
        """
        [Primitive: wait_agent] Asynchronously waits for a specific agent to report completion or closes.
        """
        if agent_id not in AgentRegistry.agents:
            return f"Error: Agent {agent_id} not found."
            
        logger.info(f"⏳ [Agent-Ops] Brain is waiting for subagent {agent_id} (Timeout: {timeout_seconds}s)")
        
        start = time.time()
        while time.time() - start < timeout_seconds:
            if AgentRegistry.agents[agent_id]["status"] == "closed":
                return f"Success: Agent {agent_id} has closed/finished successfully."
            await asyncio.sleep(1)
            
        return f"Timeout: Agent {agent_id} did not finish within {timeout_seconds} seconds."

    @staticmethod
    async def close_agent(agent_id: str) -> str:
        """
        [Primitive: close_agent] Gracefully closes/destroys a subagent lifecycle.
        """
        if agent_id not in AgentRegistry.agents:
            return f"Error: Agent {agent_id} not found."
            
        AgentRegistry.agents[agent_id]["status"] = "closed"
        task = AgentRegistry.agents[agent_id].get("task")
        if task:
            task.cancel()
            
        logger.info(f"🛑 [Agent-Ops] Subagent {agent_id} has been forcibly shut down.")
        return f"Success: Agent {agent_id} properly closed."

    @staticmethod
    async def sleep_agent(agent_id: str, duration_seconds: int) -> str:
        """
        [Primitive: sleep / cron] Suspends an agent strictly for X seconds to save CPU & Tokens (Watchdog style).
        """
        if agent_id not in AgentRegistry.agents:
            return f"Error: Agent {agent_id} not found."
            
        AgentRegistry.agents[agent_id]["status"] = "sleeping"
        logger.info(f"💤 [Agent-Ops] Agent {agent_id} is put into deep sleep (Cron {duration_seconds}s)...")
        
        # Async suspension simulating real sleep
        await asyncio.sleep(duration_seconds)
        
        # Re-awake
        if AgentRegistry.agents[agent_id]["status"] == "sleeping":
            AgentRegistry.agents[agent_id]["status"] = "running"
            logger.info(f"⏰ [Agent-Ops] Agent {agent_id} has woken up automatically!")
            return f"Success: Agent awoke automatically after {duration_seconds} seconds."
            
        return "Info: Agent state changed before sleep finished."

    @staticmethod
    async def resume_agent(agent_id: str) -> str:
        """
        [Primitive: resume_agent] Forcefully wakes up an explicitly sleeping/paused agent.
        """
        if agent_id not in AgentRegistry.agents:
            return f"Error: Agent {agent_id} not found."
            
        if AgentRegistry.agents[agent_id]["status"] in ["sleeping", "paused"]:
            AgentRegistry.agents[agent_id]["status"] = "running"
            logger.info(f"🔔 [Agent-Ops] Agent {agent_id} has been forcibly woken up!")
            return f"Success: Agent {agent_id} forcefully resumed."
        return f"Info: Agent {agent_id} is already running."
