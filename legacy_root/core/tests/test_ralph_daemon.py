import asyncio
from core.ralph_daemon import RalphDaemonWorker

def test_ralph_daemon_success():
    async def run_test():
        daemon = RalphDaemonWorker("test_task", max_iterations=3)
        attempts = {'count': 0}
        async def mock_executor():
            attempts['count'] += 1
            return {"attempt": attempts['count']}
        async def mock_validator(payload):
            return payload["attempt"] == 2
        result = await daemon.run_persistent_loop(mock_executor, mock_validator)
        assert result is not None
        assert result["attempt"] == 2
    asyncio.run(run_test())

def test_ralph_daemon_fail_max_iterations():
    async def run_test():
        daemon = RalphDaemonWorker("test_task", max_iterations=2)
        async def mock_executor():
            return {}
        async def mock_validator(payload):
            return False
        result = await daemon.run_persistent_loop(mock_executor, mock_validator)
        assert result is None
    asyncio.run(run_test())
