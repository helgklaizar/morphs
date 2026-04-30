import pytest
import json
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from core.mcp_hub import MCPRouter
from core.logger import logger

@pytest.fixture
def mcp_router():
    return MCPRouter()

def test_register_server(mcp_router):
    mcp_router.register_server("test_server", ["python", "-c", "logger.info('hello')"])
    assert "test_server" in mcp_router.servers
    assert mcp_router.servers["test_server"] == ["python", "-c", "logger.info('hello')"]

def test_start_server(mcp_router):
    mcp_router.register_server("dummy", ["echo", "test"])
    
    async def run_test():
        with patch("asyncio.create_subprocess_exec", new_callable=AsyncMock) as mock_exec:
            mock_process = MagicMock()
            mock_process.pid = 1234
            mock_exec.return_value = mock_process
            
            proc = await mcp_router.start_server("dummy")
            
            assert proc == mock_process
            assert "dummy" in mcp_router.active_processes
            mock_exec.assert_called_once()
            
    asyncio.run(run_test())

def test_call_tool(mcp_router):
    mcp_router.active_processes["test_mcp"] = MagicMock()
    mock_proc = mcp_router.active_processes["test_mcp"]
    
    # Mock stdin/stdout
    mock_proc.stdin = AsyncMock()
    mock_proc.stdin.write = MagicMock()
    mock_proc.stdout = AsyncMock()
    
    # Simulate a JSON-RPC response
    fake_response = {"jsonrpc": "2.0", "result": "success", "id": 1}
    mock_proc.stdout.readline.return_value = (json.dumps(fake_response) + "\n").encode("utf-8")
    
    async def run_test():
        result = await mcp_router.call_tool("test_mcp", "test_method", {"param": 1})
        assert result == fake_response
        mock_proc.stdin.write.assert_called_once()
        mock_proc.stdin.drain.assert_called_once()
        
    asyncio.run(run_test())
