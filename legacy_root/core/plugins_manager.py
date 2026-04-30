import os
import json
import glob
from core.logger import logger

class PluginsManager:
    """
    Isolates external Plugin definitions from the MCP Hub core logic (Task 6).
    Each plugin contains connection metadata to launch Model Context Protocol servers.
    """
    def __init__(self, plugins_dir: str = "plugins"):
        self.plugins_dir = plugins_dir
        self.plugins = {}
        
    def discover_plugins(self):
        """Finds all plugin.json configuration files."""
        if not os.path.exists(self.plugins_dir):
            logger.info(f"🔌 [Plugins Manager] Directory '{self.plugins_dir}' not found.")
            return

        pattern = os.path.join(self.plugins_dir, "**", "plugin.json")
        files = glob.glob(pattern, recursive=True)
        # Also simple configs root
        files.extend(glob.glob(os.path.join(self.plugins_dir, "*.json")))
        
        count = 0
        for config_path in set(files):
            try:
                with open(config_path, "r", encoding="utf-8") as f:
                    cfg = json.load(f)
                    name = cfg.get("name", os.path.basename(os.path.dirname(config_path)))
                    if not name:
                        name = os.path.basename(config_path).replace(".json", "")
                    self.plugins[name] = cfg
                    count += 1
            except Exception as e:
                logger.error(f"Failed to load plugin {config_path}: {e}")
                
        logger.info(f"🧩 [Plugins Manager] Registered {count} MCP Plugin configurations.")

    def get_plugin_command(self, name: str):
        plugin = self.plugins.get(name)
        if plugin:
            return plugin.get("command")
        return None

    def inject_into_mcphub(self, mcp_router):
        """Passes discovered configurations into the MCP Router."""
        for name, cfg in self.plugins.items():
            cmd = cfg.get("command")
            if cmd:
                mcp_router.register_server(name, cmd)
                logger.info(f"✅ Injected plugin '{name}' into MCP Hub.")
