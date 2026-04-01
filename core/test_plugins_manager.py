import os
import json
import pytest
from core.plugins_manager import PluginsManager

def test_plugins_discovery(tmp_path):
    plugins_dir = tmp_path / "plugins"
    test_plugin = plugins_dir / "test_mcp"
    os.makedirs(test_plugin)
    
    plugin_manifest = {
        "name": "test_server",
        "command": "node",
        "args": ["build/index.js"],
        "env": {"API_KEY": "123"}
    }
    
    (test_plugin / "plugin.json").write_text(json.dumps(plugin_manifest), encoding="utf-8")
    
    manager = PluginsManager(plugins_dir=str(plugins_dir))
    manager.discover_plugins()
    
    assert "test_server" in manager.plugins
    assert manager.plugins["test_server"]["command"] == "node"

def test_missing_plugin_json(tmp_path):
    plugins_dir = tmp_path / "plugins"
    test_plugin = plugins_dir / "empty_plugin"
    os.makedirs(test_plugin)
    
    manager = PluginsManager(plugins_dir=str(plugins_dir))
    manager.discover_plugins()
    assert len(manager.plugins) == 0
