import asyncio
from typing import Callable, Any
from core.logger import logger

class RalphDaemonWorker:
    """
    $ralph Paradigm (Claw-Code port)
    A background, persistent worker for long-running tasks.
    The loop runs until a pass is received from the supervisor (or until OOM).
    """
    def __init__(self, task_name: str, max_iterations: int = 10):
        self.task_name = task_name
        self.max_iterations = max_iterations
        
        # MCP hub integration
        self.mcp_hub = None
        
    async def connect_mcp_plugins(self, tool_registry=None):
        """Registers and starts basic plugins for communication with the outside world"""
        from mcp_hub import MCPRouter
        self.mcp_hub = MCPRouter()
        
        # Register plugins
        self.mcp_hub.register_server("pare", ["npx", "-y", "@gitpare/pare-mcp-server"])
        self.mcp_hub.register_server("google-drive", ["npx", "-y", "@modelcontextprotocol/server-gdrive"])
        self.mcp_hub.register_server("github", ["npx", "-y", "@modelcontextprotocol/server-github"])
        
        # For example, we can bring up pare to work with git/ssh
        try:
            await self.mcp_hub.start_server("pare")
            await self.mcp_hub.initialize_server("pare")
            
            if tool_registry:
                # Read tools from Pare and flash them into the CoreMind
                pare_tools = await self.mcp_hub.get_tools("pare")
                tool_registry.register_mcp_namespace("pare", pare_tools)
                
        except Exception as e:
            logger.info(f"⚠️ [$ralph Daemon] Failed to start Pare MCP: {e}")

    async def run_persistent_loop(self, executor_func: Callable, validator_func: Callable, tool_registry=None) -> Any:
        logger.info(f"🌀 [$ralph Daemon] Process '{self.task_name}' started in the background. Limit: {self.max_iterations} iterations.")
        
        # 🔌 Auto-connect plugins before the loop
        if self.mcp_hub is None:
            await self.connect_mcp_plugins(tool_registry)
            
        iteration = 0
        
        try:
            from event_bus import bus
        except ImportError as e:
            logger.warning(f"⚠️ [$ralph Daemon] Failed to import Event Bus circuit: {e}")
            bus = None

        while iteration < self.max_iterations:
            iteration += 1
            logger.info(f"🔄 [$ralph Daemon] Iteration {iteration}/{self.max_iterations}...")
            
            # Step 1: Code execution (Coder/Healer)
            payload = await executor_func()
            
            # Step 2: Architectural or test validation (Architect)
            is_valid = await validator_func(payload)
            
            if is_valid:
                logger.info(f"✅ [$ralph Daemon] Success on iteration {iteration}. Loop finished.")
                if bus:
                    try:
                        await bus.publish("ralph.success", {"task": self.task_name, "iteration": iteration})
                    except Exception as e:
                        logger.info(f"🔥 [RalphDaemon] Error broadcasting success: {e}")
                return payload
            
            logger.info("⚠️ [$ralph Daemon] Validation failed. Starting a new round.")
            await asyncio.sleep(2)  # Pause before retry
            
        logger.info(f"💥 [$ralph Daemon] Iteration limit reached ({self.max_iterations}). FAILURE.")
        if bus:
            try:
                await bus.publish("ralph.failed", {"task": self.task_name, "reason": "max_iterations_reached"})
            except Exception as e:
                logger.info(f"🔥 [RalphDaemon] Error broadcasting failed: {e}")
        payload = None
            
        # 🧹 Clean up MCP resources before exiting
        if self.mcp_hub:
            for server in list(self.mcp_hub.active_processes.keys()):
                await self.mcp_hub.stop_server(server)
                
        return payload
