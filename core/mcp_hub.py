import os
import json
import asyncio
import subprocess
from core.logger import logger
from core.plugins_manager import PluginsManager

class MCPRouter:
    """
    Model Context Protocol (MCP) Hub.
    Отвечает за подключение к внешним плагинам (Telegram, Google Drive, Github, Pare) 
    без написания ручных драйверов.
    Использует стандартный stdin/stdout JSON-RPC для связи с MCP серверами.
    """
    def __init__(self):
        self.servers = {}
        self.active_processes = {}
        
        # Load external plugins configuration automatically
        self.plugins_manager = PluginsManager("plugins")
        self.plugins_manager.discover_plugins()
        self.plugins_manager.inject_into_mcphub(self)
        
    def register_server(self, name: str, command: list):
        """
        Регистрирует новый MCP-совместимый сервер (CLI команду).
        Пример: register_server("github", ["npx", "-y", "@modelcontextprotocol/server-github"])
        """
        self.servers[name] = command
        logger.info(f"🔌 [MCP Hub] Зарегистрирован сервер: {name}")

    async def start_server(self, name: str):
        if name not in self.servers:
            raise ValueError(f"Сервер {name} не зарегистрирован!")
            
        cmd = self.servers[name]
        logger.info(f"🚀 [MCP Hub] Запуск MCP сервера {name}...")
        
        # Запускаем как subprocess, общаясь по stdin/stdout
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=os.environ.copy()
        )
        self.active_processes[name] = process
        logger.info(f"✅ [MCP Hub] Сервер {name} активен (PID: {process.pid})")
        return process

    async def stop_server(self, name: str):
        process = self.active_processes.get(name)
        if process:
            try:
                process.terminate()
                await process.wait()
            except ProcessLookupError as e:
                logger.warning(f"⚠️ [MCP Hub] Игнорируем ProcessLookupError для {name} (процесс уже завершен): {e}")
            if name in self.active_processes:
                del self.active_processes[name]
            logger.info(f"🛑 [MCP Hub] Сервер {name} остановлен.")

    async def send_notification(self, server_name: str, method: str, params: dict = None):
        """Отправляет одностороннее уведомление (без id и ожидания)"""
        process = self.active_processes.get(server_name)
        if not process:
            return
        notification = {
            "jsonrpc": "2.0",
            "method": method,
            "params": params or {}
        }
        process.stdin.write((json.dumps(notification) + "\n").encode("utf-8"))
        await process.stdin.drain()

    async def initialize_server(self, server_name: str):
        """Выполняет MCP handshake (initialize -> initialized)"""
        params = {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {"name": "MorphsOS", "version": "1.0"}
        }
        # Шлем initialize
        init_resp = await self.call_tool(server_name, "initialize", params)
        # Отвечаем notification/initialized
        await self.send_notification(server_name, "notifications/initialized")
        logger.info(f"🤝 [MCP Hub] Рукопожатие с {server_name} успешно.")
        return init_resp

    async def get_tools(self, server_name: str) -> list:
        """Запрашивает список доступных тулзов у плагина"""
        resp = await self.call_tool(server_name, "tools/list")
        return resp.get("result", {}).get("tools", [])

    async def call_tool(self, server_name: str, method: str, params: dict = None) -> dict:
        """
        Универсальный вызов инструмента на любом MCP-сервере.
        Инкапсулирует JSON-RPC запрос.
        """
        process = self.active_processes.get(server_name)
        if not process:
            raise RuntimeError(f"Сервер {server_name} не запущен!")

        # Формируем JSON-RPC
        request = {
            "jsonrpc": "2.0",
            "method": method,
            "params": params or {},
            "id": 1
        }
        
        # Отправляем в stdin
        payload = json.dumps(request) + "\n"
        process.stdin.write(payload.encode("utf-8"))
        await process.stdin.drain()

        # Ждем ответ из stdout
        response_line = await process.stdout.readline()
        if not response_line:
            err = await process.stderr.read()
            raise RuntimeError(f"❌ [MCP Hub] Ошибка сервера {server_name}: {err.decode('utf-8')}")
            
        return json.loads(response_line.decode("utf-8"))
