from dataclasses import dataclass, field
from typing import Set, Optional
from core.logger import logger

@dataclass
class ToolPermissionContext:
    """
    Manages granular access control for AI tools.
    Prevents the agent from executing destructive actions blindly.
    Inspired by claw-code permission structures.
    """
    blocked_tools: Set[str] = field(default_factory=set)
    allowed_tools: Set[str] = field(default_factory=set)
    require_user_confirmation: Set[str] = field(default_factory=lambda: {"bash_delete", "db_drop", "deploy_prod"})
    
    def block(self, tool_name: str):
        self.blocked_tools.add(tool_name)
        if tool_name in self.allowed_tools:
            self.allowed_tools.remove(tool_name)

    def allow(self, tool_name: str):
        self.allowed_tools.add(tool_name)
        if tool_name in self.blocked_tools:
            self.blocked_tools.remove(tool_name)

    def is_blocked(self, tool_name: str) -> bool:
        return tool_name in self.blocked_tools
        
    def needs_confirmation(self, tool_name: str) -> bool:
        return tool_name in self.require_user_confirmation
        
    def check_execution_safety(self, tool_name: str, args: dict) -> bool:
        """
        Secondary runtime guard: even if a tool is allowed, runtime arguments 
        might make it dangerous (e.g. executing rm -rf from a generic run_command tool).
        """
        if self.is_blocked(tool_name):
            return False
            
        if tool_name == "bash_run":
            cmd = args.get("command", "")
            forbidden = ["rm -rf", "mkfs", "chmod -R 777"]
            if any(f in cmd for f in forbidden):
                logger.info(f"🚨 [Security] Заблокировано выполнение деструктивной команды: {cmd}")
                return False
                
        return True

class MCPHubConfig:
    """
    Configuration mapping for Model Context Protocol servers.
    Provides standard routing to external specialized tools instead of building custom python wrappers.
    """
    def __init__(self):
        self.active_mcp_servers = {
            "telegram": "mcp-telegram-bot",
            "pare": "pare-mcp-cli",
            "gdrive": "mcp-gdrive-api"
        }

    def get_mcp_route(self, tool_name: str) -> Optional[str]:
        # Simple router finding the designated MCP server
        for srv, id_str in self.active_mcp_servers.items():
            if tool_name.startswith(f"{srv}_"):
                return id_str
        return None
