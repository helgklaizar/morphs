import json
from core.tool_registry_morph import ToolRegistryMorph

def sample_mock_tool(arg_str: str, arg_int: int):
    pass

def test_tool_registry():
    registry = ToolRegistryMorph()
    registry.register_tool("mock_tool", sample_mock_tool, "Creates a mock tool", is_dangerous=True)
    
    manifest_str = registry.export_manifest()
    manifest = json.loads(manifest_str)
    
    assert "tools" in manifest
    assert "mock_tool" in manifest["tools"]
    
    tool = manifest["tools"]["mock_tool"]
    assert tool["description"] == "Creates a mock tool"
    assert tool["is_dangerous"] is True
    assert len(tool["parameters"]) == 2
    
    param1 = tool["parameters"][0]
    assert param1["name"] == "arg_str"
    assert param1["type"] == "<class 'str'>"

def test_lazy_tool_search():
    registry = ToolRegistryMorph()
    
    manifest_dict = registry.get_allowed_tools_manifest()
    
    assert "read_file" in manifest_dict
    assert "ask_tool_registry" in manifest_dict
    
    # Test semantic search
    res = registry.search_tools("editor")
    assert "edit_file" in res
    
    res = registry.search_tools("glob pattern")
    assert "glob_files" in res
