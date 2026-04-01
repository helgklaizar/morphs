import os
import json
import asyncio
import subprocess
from core.logger import logger
from core.plugins_manager import PluginsManager

class MCPRouter:
    """
    Model Context Protocol (MCP) Hub.
    Responsible for connecting to external plugins (Telegram, Google Drive, Github, Pare) 
    without writing manual drivers.
    Uses standard stdin/stdout JSON-RPC for communication with MCP servers.
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
        Registers a new MCP-compatible server (CLI command).
        Example: register_server("github", ["npx", "-y", "@modelcontextprotocol/server-github"])
        """
        self.servers[name] = command
        logger.info(f"🔌 [MCP Hub] Server registered: {name}")

    async def start_server(self, name: str):
        if name not in self.servers:
            raise ValueError(f"Server {name} is not registered!")
            
        cmd = self.servers[name]
        logger.info(f"🚀 [MCP Hub] Starting MCP server {name}...")
        
        # Running as a subprocess, communicating via stdin/stdout
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=os.environ.copy()
        )
        self.active_processes[name] = process
        logger.info(f"✅ [MCP Hub] Server {name} is active (PID: {process.pid})")
        return process

    async def stop_server(self, name: str):
        process = self.active_processes.get(name)
        if process:
            try:
                process.terminate()
                await process.wait()
            except ProcessLookupError as e:
                logger.warning(f"⚠️ [MCP Hub] Ignoring ProcessLookupError for {name} (process already terminated): {e}")
            if name in self.active_processes:
                del self.active_processes[name]
            logger.info(f"🛑 [MCP Hub] Server {name} stopped.")

    async def send_notification(self, server_name: str, method: str, params: dict = None):
        """Sends a one-way notification (without id and waiting for a response)"""
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
        """Performs the MCP handshake (initialize -> initialized)"""
        params = {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {"name": "MorphsOS", "version": "1.0"}
        }
        # Sending initialize
        init_resp = await self.call_tool(server_name, "initialize", params)
        # Responding with notification/initialized
        await self.send_notification(server_name, "notifications/initialized")
        logger.info(f"🤝 [MCP Hub] Handshake with {server_name} successful.")
        return init_resp

    async def get_tools(self, server_name: str) -> list:
        """Requests the list of available tools from the plugin"""
        resp = await self.call_tool(server_name, "tools/list")
        return resp.get("result", {}).get("tools", [])

    async def call_tool(self, server_name: str, method: str, params: dict = None) -> dict:
        """
        Universal tool call on any MCP server.
        Encapsulates the JSON-RPC request.
        """
        process = self.active_processes.get(server_name)
        if not process:
            raise RuntimeError(f"Server {server_name} is not running!")

        # Forming the JSON-RPC request
        request = {
            "jsonrpc": "2.0",
            "method": method,
            "params": params or {},
            "id": 1
        }
        
        # Sending to stdin
        payload = json.dumps(request) + "\n"
        process.stdin.write(payload.encode("utf-8"))
        await process.stdin.drain()

        # Waiting for a response from stdout
        response_line = await process.stdout.readline()
        if not response_line:
            err = await process.stderr.read()
            raise RuntimeError(f"❌ [MCP Hub] Server error {server_name}: {err.decode('utf-8')}")
            
        return json.loads(response_line.decode("utf-8"))
