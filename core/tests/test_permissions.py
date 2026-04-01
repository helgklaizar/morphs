from core.permissions import ToolPermissionContext, MCPHubConfig

def test_tool_permission_context():
    ctx = ToolPermissionContext()
    
    assert ctx.needs_confirmation("bash_delete") is True
    assert ctx.needs_confirmation("safe_read") is False
    
    ctx.block("test_tool")
    assert ctx.is_blocked("test_tool") is True
    assert "test_tool" not in ctx.allowed_tools
    
    ctx.allow("test_tool")
    assert ctx.is_blocked("test_tool") is False
    assert "test_tool" in ctx.allowed_tools

def test_mcp_routing():
    hub = MCPHubConfig()
    
    route = hub.get_mcp_route("telegram_send")
    assert route == "mcp-telegram-bot"
    
    route2 = hub.get_mcp_route("pare_git")
    assert route2 == "pare-mcp-cli"
    
    route3 = hub.get_mcp_route("unknown")
    assert route3 is None
