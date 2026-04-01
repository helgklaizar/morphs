import asyncio
from core.bash_harness import BashHarness, BashCommandInput

def test_bash_harness_safe_command(monkeypatch):
    monkeypatch.delenv("PYTEST_CURRENT_TEST", raising=False)
    async def run_test():
        from unittest.mock import patch
        with patch('core.interactive_helpers.ask_user_question', return_value=('Разрешить', None)):
            harness = BashHarness()
            inp = BashCommandInput(command="echo 'hello world'")
            out = await harness.execute(inp)
            assert not out.interrupted
            assert "hello world" in out.stdout
    asyncio.run(run_test())

def test_bash_harness_forbidden_command(monkeypatch):
    monkeypatch.delenv("PYTEST_CURRENT_TEST", raising=False)
    async def run_test():
        from unittest.mock import patch
        with patch('core.interactive_helpers.ask_user_question', return_value=('Запретить', None)):
            harness = BashHarness()
            inp = BashCommandInput(command="rm -rf /test")
            out = await harness.execute(inp)
            assert out.interrupted
            assert "Sandbox Error" in out.stderr
    asyncio.run(run_test())

def test_bash_harness_timeout_command(monkeypatch):
    monkeypatch.delenv("PYTEST_CURRENT_TEST", raising=False)
    async def run_test():
        from unittest.mock import patch
        with patch('core.interactive_helpers.ask_user_question', return_value=('Разрешить', None)):
            harness = BashHarness()
            inp = BashCommandInput(command="sleep 2", timeout=1)
            out = await harness.execute(inp)
            assert out.interrupted
            assert "Timeout Error" in out.error_message
    asyncio.run(run_test())

def test_bash_harness_background_command(monkeypatch):
    monkeypatch.delenv("PYTEST_CURRENT_TEST", raising=False)
    async def run_test():
        from unittest.mock import patch
        with patch('core.interactive_helpers.ask_user_question', return_value=('Разрешить', None)):
            harness = BashHarness()
            inp = BashCommandInput(command="echo 'bg'", run_in_background=True)
            out = await harness.execute(inp)
            assert not out.interrupted
            assert out.background_task_id is not None
            
            status = harness.get_background_status(out.background_task_id)
            assert status is not None
    asyncio.run(run_test())
