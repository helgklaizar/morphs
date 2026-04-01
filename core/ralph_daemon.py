import asyncio
from typing import Callable, Any
from core.logger import logger

class RalphDaemonWorker:
    """
    $ralph Paradigm (Claw-Code port)
    Фоновый, настойчивый воркер для длительных задач.
    Петля работает, пока не будет получен pass от супервизора (или пока не OOM).
    """
    def __init__(self, task_name: str, max_iterations: int = 10):
        self.task_name = task_name
        self.max_iterations = max_iterations
        
        # Интеграция MCP хаба
        self.mcp_hub = None
        
    async def connect_mcp_plugins(self, tool_registry=None):
        """Регистрирует и запускает базовые плагины для связи с внешним миром"""
        from mcp_hub import MCPRouter
        self.mcp_hub = MCPRouter()
        
        # Регистрируем плагины
        self.mcp_hub.register_server("pare", ["npx", "-y", "@gitpare/pare-mcp-server"])
        self.mcp_hub.register_server("google-drive", ["npx", "-y", "@modelcontextprotocol/server-gdrive"])
        self.mcp_hub.register_server("github", ["npx", "-y", "@modelcontextprotocol/server-github"])
        
        # К примеру, мы можем поднять pare для работы с git/ssh
        try:
            await self.mcp_hub.start_server("pare")
            await self.mcp_hub.initialize_server("pare")
            
            if tool_registry:
                # Читаем тулзы из Pare и прошиваем их в разум CoreMind
                pare_tools = await self.mcp_hub.get_tools("pare")
                tool_registry.register_mcp_namespace("pare", pare_tools)
                
        except Exception as e:
            logger.info(f"⚠️ [$ralph Daemon] Не удалось запустить Pare MCP: {e}")

    async def run_persistent_loop(self, executor_func: Callable, validator_func: Callable, tool_registry=None) -> Any:
        logger.info(f"🌀 [$ralph Daemon] Процесс '{self.task_name}' запущен в фоне. Ограничение: {self.max_iterations} итераций.")
        
        # 🔌 Авто-коннект плагинов перед петлей
        if self.mcp_hub is None:
            await self.connect_mcp_plugins(tool_registry)
            
        iteration = 0
        
        try:
            from event_bus import bus
        except ImportError as e:
            logger.warning(f"⚠️ [$ralph Daemon] Не удалось импортировать Event Bus контур: {e}")
            bus = None

        while iteration < self.max_iterations:
            iteration += 1
            logger.info(f"🔄 [$ralph Daemon] Итерация {iteration}/{self.max_iterations}...")
            
            # Шаг 1: Выполнение кода (Coder/Healer)
            payload = await executor_func()
            
            # Шаг 2: Архитектурная или тестовая валидация (Architect)
            is_valid = await validator_func(payload)
            
            if is_valid:
                logger.info(f"✅ [$ralph Daemon] Успех на итерации {iteration}. Цикл завершен.")
                if bus:
                    try:
                        await bus.publish("ralph.success", {"task": self.task_name, "iteration": iteration})
                    except Exception as e:
                        logger.info(f"🔥 [RalphDaemon] Ошибка бродкаста success: {e}")
                return payload
            
            logger.info("⚠️ [$ralph Daemon] Валидация провалена. Заход на новый круг.")
            await asyncio.sleep(2)  # Пауза перед ретраем
            
        logger.info(f"💥 [$ralph Daemon] Достигнут лимит итераций ({self.max_iterations}). ПРОВАЛ.")
        if bus:
            try:
                await bus.publish("ralph.failed", {"task": self.task_name, "reason": "max_iterations_reached"})
            except Exception as e:
                logger.info(f"🔥 [RalphDaemon] Ошибка бродкаста failed: {e}")
        payload = None
            
        # 🧹 Очистка ресурсов MCP перед выходом
        if self.mcp_hub:
            for server in list(self.mcp_hub.active_processes.keys()):
                await self.mcp_hub.stop_server(server)
                
        return payload
