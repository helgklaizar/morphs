"""
test_tooling_epic.py — Tests for the "Tooling & Execution Engine" Epic
Covers Tasks 32, 33, 12/36, 29/30
"""
import asyncio
import pytest
import tempfile
import os
import subprocess
from pathlib import Path
from pathlib import Path


# ─── Task 32: LSP Tool ────────────────────────────────────────────────────────

class TestLSPTool:
    """Tests for lsp_tool.py — language server integration."""

    def test_lsp_client_init(self):
        from core.tools.lsp_tool import LSPClient
        client = LSPClient(["echo", "test"], "file:///tmp")
        assert client.cmd == ["echo", "test"]
        assert client.root_uri == "file:///tmp"
        assert client._initialized is False

    def test_lsp_client_fails_gracefully_when_server_missing(self):
        from core.tools.lsp_tool import LSPClient
        client = LSPClient(["nonexistent-lsp-server-12345", "--stdio"], "file:///tmp")
        result = client.start()
        assert result is False  # Should fail gracefully, not raise an exception

    def test_lsp_tool_find_symbol_no_server(self, monkeypatch):
        """If the LSP server is unavailable, it should return a clear error."""
        from core.tools.lsp_tool import LSPTool
        monkeypatch.setattr(LSPTool, '_get_client', lambda *args: None)
        result = LSPTool.find_symbol("SomeClass", "/tmp")
        assert "Error" in result
        assert "pyright" in result.lower() or "install" in result.lower()

    def test_lsp_tool_find_symbol_with_mock_client(self, monkeypatch):
        """Check the output formatting when there are results from LSP."""
        from core.tools.lsp_tool import LSPTool
        
        class DummyProc:
            def poll(self): return None
            
        class DummyClient:
            def __init__(self):
                self._proc = DummyProc()
                
            def workspace_symbols(self, query):
                return [{
                    "name": "WorktreeTools",
                    "kind": 5,  # Class
                    "location": {
                        "uri": "file:///Users/klai/AI/morphs/core/tools/worktree_ops.py",
                        "range": {"start": {"line": 19, "character": 0}}
                    }
                }]
                
        monkeypatch.setattr(LSPTool, '_get_client', lambda *args: DummyClient())
        result = LSPTool.find_symbol("WorktreeTools", "/Users/klai/AI/morphs")
        assert "WorktreeTools" in result
        assert "Class" in result
        assert "worktree_ops.py" in result
        assert "20" in result  # 0-based 19 → 1-based 20

    def test_lsp_tool_find_refs_no_server(self, monkeypatch):
        from core.tools.lsp_tool import LSPTool
        monkeypatch.setattr(LSPTool, '_get_client', lambda *args: None)
        result = LSPTool.find_references("/tmp/test.py", 1, 1)
        assert "Error" in result

    def test_lsp_tool_goto_def_no_refs(self, monkeypatch):
        from core.tools.lsp_tool import LSPTool
        class DummyProc:
            def poll(self): return None
        class DummyClient:
            def __init__(self):
                self._proc = DummyProc()
            def goto_definition(self, uri, line, char):
                return []
            def open_document(self, path, lang):
                pass
            def close_document(self, path):
                pass
        
        monkeypatch.setattr(LSPTool, '_get_client', lambda *args: DummyClient())
        result = LSPTool.goto_definition("/tmp/test.py", 5, 10)
        assert "No definition found" in result

    def test_lsp_shutdown_all(self):
        from core.tools.lsp_tool import LSPTool
        class DummyClient:
            def __init__(self):
                self.stopped = False
            def stop(self):
                self.stopped = True
                
        dummy = DummyClient()
        LSPTool._clients["test:python"] = dummy
        LSPTool.shutdown_all()
        assert dummy.stopped
        assert len(LSPTool._clients) == 0


# ─── Task 33: Git Worktree ────────────────────────────────────────────────────

class TestWorktreeTools:
    """Tests for worktree_ops.py."""

    def test_worktree_tools_import(self):
        from core.tools.worktree_ops import WorktreeTools, WorktreeRegistry
        assert WorktreeTools is not None
        assert WorktreeRegistry is not None

    def test_enter_worktree_non_git_dir(self, tmp_path):
        """A non-git directory should return an error."""
        from core.tools.worktree_ops import WorktreeTools
        non_git = str(tmp_path)
        result = WorktreeTools.enter_worktree(non_git)
        assert "Error" in result
        assert "git" in result.lower()

    def test_get_worktree_path_unknown_session(self):
        from core.tools.worktree_ops import WorktreeTools
        result = WorktreeTools.get_worktree_path("nonexistent-session")
        assert "Error" in result

    def test_exit_worktree_unknown_session(self):
        from core.tools.worktree_ops import WorktreeTools
        result = WorktreeTools.exit_worktree("nonexistent-session")
        assert "Error" in result

    def test_list_worktrees_non_git(self, tmp_path):
        from core.tools.worktree_ops import WorktreeTools
        result = WorktreeTools.list_worktrees(str(tmp_path))
        assert "Error" in result

    def test_enter_exit_worktree_git_repo(self, tmp_path):
        """Full cycle Enter → Exit in a real git repo."""
        from core.tools.worktree_ops import WorktreeTools, WorktreeRegistry

        # Initialize a git repo
        subprocess.run(["git", "init"], cwd=str(tmp_path), capture_output=True)
        subprocess.run(["git", "config", "user.email", "test@test.com"], cwd=str(tmp_path), capture_output=True)
        subprocess.run(["git", "config", "user.name", "Test"], cwd=str(tmp_path), capture_output=True)

        # Create an initial commit (worktree add doesn't work without it)
        (tmp_path / "README.md").write_text("init")
        subprocess.run(["git", "add", "."], cwd=str(tmp_path), capture_output=True)
        subprocess.run(["git", "commit", "-m", "init"], cwd=str(tmp_path), capture_output=True)

        enter_result = WorktreeTools.enter_worktree(str(tmp_path), branch_name="test/morph-sandbox")

        if "Error" in enter_result:
            pytest.skip(f"Git worktree not supported in this env: {enter_result}")

        # Extract session_id from the response
        session_id = None
        for line in enter_result.splitlines():
            if "session_id" in line:
                session_id = line.split(":")[-1].strip()
                break

        assert session_id is not None
        assert session_id in WorktreeRegistry._sessions

        wt_path = WorktreeTools.get_worktree_path(session_id)
        assert os.path.isdir(wt_path)

        # Exit without applying changes
        exit_result = WorktreeTools.exit_worktree(session_id, apply_changes=False)
        assert "Success" in exit_result
        assert session_id not in WorktreeRegistry._sessions


# ─── Task 12 & 36: Tool Concurrency ──────────────────────────────────────────

class TestToolConcurrency:
    """Tests for concurrent_tools.py."""

    def test_imports(self):
        from core.tools.concurrent_tools import (
            ToolCategory, TOOL_CATEGORIES, ToolCall,
            SessionMemory, ParallelBatcher, MutationQueue, ToolConcurrencyEngine, get_engine
        )
        assert ToolCategory.READ_ONLY == "read_only"
        assert ToolCategory.MUTATION == "mutation"
        assert "read_file" in TOOL_CATEGORIES
        assert TOOL_CATEGORIES["read_file"] == ToolCategory.READ_ONLY
        assert "edit_file" in TOOL_CATEGORIES
        assert TOOL_CATEGORIES["edit_file"] == ToolCategory.MUTATION

    def test_tool_call_creation(self):
        from core.tools.concurrent_tools import ToolCall
        call = ToolCall(tool_name="read_file", func=lambda: "ok", args={"filepath": "/tmp/x"})
        assert call.tool_name == "read_file"
        assert call.done is False
        assert call.call_id is not None
        assert len(call.call_id) == 8

    @pytest.mark.asyncio
    async def test_session_memory_atomic_write(self):
        from core.tools.concurrent_tools import SessionMemory, ToolCall

        memory = SessionMemory()

        async def write_many():
            calls = []
            for i in range(10):
                c = ToolCall(tool_name="read_file", func=lambda: f"result_{i}", args={})
                c.result = f"result_{i}"
                c.done = True
                calls.append(c)
            await asyncio.gather(*[memory.record(c) for c in calls])

        await write_many()
        log = memory.get_log()
        assert len(log) == 10
        # All entries should be in the log without duplicates
        ids = [e["call_id"] for e in log]
        assert len(ids) == len(set(ids))

    @pytest.mark.asyncio
    async def test_parallel_batcher_runs_read_only(self):
        from core.tools.concurrent_tools import SessionMemory, ParallelBatcher, ToolCall

        results_order = []

        async def slow_read(filepath: str):
            await asyncio.sleep(0.01)
            results_order.append(filepath)
            return f"Content of {filepath}"

        memory = SessionMemory()
        batcher = ParallelBatcher(memory)

        calls = [
            ToolCall("read_file", slow_read, {"filepath": f"/tmp/file_{i}.py"})
            for i in range(5)
        ]
        results = await batcher.run_batch(calls)

        assert len(results) == 5
        for c in calls:
            assert c.call_id in results
            assert "Content of" in results[c.call_id]

    @pytest.mark.asyncio
    async def test_parallel_batcher_skips_mutations(self):
        from core.tools.concurrent_tools import SessionMemory, ParallelBatcher, ToolCall

        memory = SessionMemory()
        batcher = ParallelBatcher(memory)

        calls = [
            ToolCall("read_file", lambda filepath: "ok", {"filepath": "/tmp/x"}),
            ToolCall("edit_file", lambda filepath, old_text, new_text: "edited", {
                "filepath": "/tmp/x", "old_text": "a", "new_text": "b"
            }),
        ]
        results = await batcher.run_batch(calls)
        # Only read_file should be executed in the batch
        read_call = calls[0]
        edit_call = calls[1]
        assert read_call.call_id in results
        assert edit_call.call_id not in results  # mutation skipped

    @pytest.mark.asyncio
    async def test_mutation_queue_sequential_order(self):
        from core.tools.concurrent_tools import SessionMemory, MutationQueue, ToolCall

        execution_order = []
        lock = asyncio.Lock()

        async def track_mutation(name: str):
            async with lock:
                execution_order.append(name)
            return f"done: {name}"

        memory = SessionMemory()
        queue = MutationQueue(memory)
        queue.start()

        calls = [
            ToolCall("edit_file", track_mutation, {"name": f"mutation_{i}"})
            for i in range(5)
        ]
        for c in calls:
            await queue.enqueue(c)

        await queue.drain()
        queue.stop()

        assert len(execution_order) == 5
        # The order should match (FIFO)
        assert execution_order == [f"mutation_{i}" for i in range(5)]

    @pytest.mark.asyncio
    async def test_concurrency_engine_routes_correctly(self):
        from core.tools.concurrent_tools import ToolConcurrencyEngine, ToolCall

        engine = ToolConcurrencyEngine()
        engine.start()

        read_results = []
        mut_results = []

        def read_fn(filepath: str):
            read_results.append(filepath)
            return f"read:{filepath}"

        async def mut_fn(filepath: str, old_text: str, new_text: str):
            mut_results.append(filepath)
            return f"edited:{filepath}"

        calls = [
            ToolCall("read_file", read_fn, {"filepath": "/tmp/a.py"}),
            ToolCall("read_file", read_fn, {"filepath": "/tmp/b.py"}),
            ToolCall("edit_file", mut_fn, {"filepath": "/tmp/c.py", "old_text": "x", "new_text": "y"}),
        ]
        results = await engine.execute(calls)

        engine.stop()
        assert len(results) == 3
        assert len(read_results) == 2
        assert len(mut_results) == 1

    def test_get_engine_singleton(self):
        from core.tools.concurrent_tools import get_engine, _engine
        e1 = get_engine()
        e2 = get_engine()
        assert e1 is e2  # singleton


# ─── Task 29 & 30: Tool Denial ────────────────────────────────────────────────

class TestDenialHandler:
    """Tests for denial_handler.py."""

    def test_imports(self):
        from core.tools.denial_handler import (
            DenialAction, DenialContext, DenialResolution,
            ToolDenialHandler, SandboxedToolExecutor, AskUserTool
        )
        assert DenialAction.ALLOW_ANYWAY == "allow_anyway"
        assert DenialAction.SKIP == "skip"

    def test_denial_context_creation(self):
        from core.tools.denial_handler import DenialContext
        ctx = DenialContext(
            tool_name="bash_run",
            reason="Sandbox mode active",
            args={"command": "rm -rf /"},
            sandbox_mode=True,
            alternatives=["grep_search"]
        )
        assert ctx.tool_name == "bash_run"
        assert ctx.sandbox_mode is True
        assert "grep_search" in ctx.alternatives

    def test_handle_denial_allow_anyway(self, monkeypatch):
        """Simulation of user selecting A (Allow)."""
        from core.tools.denial_handler import ToolDenialHandler, DenialAction, DenialContext
        import core.tools.denial_handler

        ctx = DenialContext(
            tool_name="bash_run",
            reason="Sandboxed",
            args={"command": "ls"},
        )
        monkeypatch.setattr(core.tools.denial_handler, "ask_user_question", lambda *args, **kwargs: ("A", None))
        resolution = ToolDenialHandler.handle_denial(ctx)

        assert resolution.action == DenialAction.ALLOW_ANYWAY

    def test_handle_denial_skip(self, monkeypatch):
        """Simulation of selecting C (Skip)."""
        from core.tools.denial_handler import ToolDenialHandler, DenialAction, DenialContext
        import core.tools.denial_handler

        ctx = DenialContext(tool_name="bash_run", reason="Sandboxed", args={})
        monkeypatch.setattr(core.tools.denial_handler, "ask_user_question", lambda *args, **kwargs: ("C", None))
        resolution = ToolDenialHandler.handle_denial(ctx)
        assert resolution.action == DenialAction.SKIP

    def test_handle_denial_custom_input(self, monkeypatch):
        """Simulation of selecting D (Custom) with custom value input."""
        from core.tools.denial_handler import ToolDenialHandler, DenialAction, DenialContext
        import core.tools.denial_handler

        ctx = DenialContext(tool_name="bash_run", reason="Sandboxed", args={})
        monkeypatch.setattr(core.tools.denial_handler, "ask_user_question", lambda *args, **kwargs: ("D", "ls -la"))
        resolution = ToolDenialHandler.handle_denial(ctx)
        assert resolution.action == DenialAction.CUSTOM_INPUT
        assert resolution.custom_value == "ls -la"

    def test_handle_denial_abort_task(self, monkeypatch):
        """Simulation of selecting E (Abort)."""
        from core.tools.denial_handler import ToolDenialHandler, DenialAction, DenialContext
        import core.tools.denial_handler

        ctx = DenialContext(tool_name="deploy_prod", reason="Sandboxed", args={})
        monkeypatch.setattr(core.tools.denial_handler, "ask_user_question", lambda *args, **kwargs: ("E", None))
        resolution = ToolDenialHandler.handle_denial(ctx)
        assert resolution.action == DenialAction.ABORT_TASK

    @pytest.mark.asyncio
    async def test_sandboxed_executor_calls_allowed_tool(self):
        """An unblocked tool is called directly without the Denial Flow."""
        from core.tools.denial_handler import SandboxedToolExecutor
        from core.permissions import ToolPermissionContext

        perm = ToolPermissionContext()
        class DummyRegistry:
            def __init__(self, reg=None):
                self.registry = reg or {}

        perm = ToolPermissionContext()
        reg = DummyRegistry({
            "read_file": {
                "func": lambda filepath: f"Content of {filepath}",
                "description": "read"
            }
        })
        executor = SandboxedToolExecutor(reg, perm)
        result = await executor.safe_call("read_file", filepath="/tmp/test.py")
        assert "Content of" in result

    @pytest.mark.asyncio
    async def test_sandboxed_executor_forces_ask_user_on_block(self, monkeypatch):
        """Blocked tool -> forces AskUser -> Skip."""
        from core.tools.denial_handler import SandboxedToolExecutor, DenialAction
        from core.permissions import ToolPermissionContext
        import core.tools.denial_handler

        perm = ToolPermissionContext()
        perm.block("dangerous_tool")

        class DummyRegistry:
            def __init__(self, reg=None):
                self.registry = reg or {}

        reg = DummyRegistry({
            "dangerous_tool": {"func": lambda: "DANGER", "description": "bad"}
        })
        executor = SandboxedToolExecutor(reg, perm)

        monkeypatch.setattr(core.tools.denial_handler, "ask_user_question", lambda *args, **kwargs: ("C", None))
        result = await executor.safe_call("dangerous_tool")

        assert "skipped" in result.lower() or "skip" in result.lower()

    @pytest.mark.asyncio
    async def test_sandboxed_executor_abort_raises(self, monkeypatch):
        """Selecting Abort → RuntimeError."""
        from core.tools.denial_handler import SandboxedToolExecutor
        from core.permissions import ToolPermissionContext
        import core.tools.denial_handler

        perm = ToolPermissionContext()
        perm.block("dangerous_tool")

        class DummyRegistry:
            def __init__(self, reg=None):
                self.registry = reg or {}

        executor = SandboxedToolExecutor(DummyRegistry(), perm)

        monkeypatch.setattr(core.tools.denial_handler, "ask_user_question", lambda *args, **kwargs: ("E", None))
        with pytest.raises(RuntimeError, match="aborted"):
            await executor.safe_call("dangerous_tool")

    def test_ask_user_tool_returns_choice(self, monkeypatch):
        """AskUserTool correctly returns the letter choice."""
        from core.tools.denial_handler import AskUserTool
        import core.tools.denial_handler

        monkeypatch.setattr(core.tools.denial_handler, "ask_user_question", lambda *args, **kwargs: ("A", None))
        result = AskUserTool.ask("Continue the task?", options=["Yes", "No"])
        assert result == "A"

    def test_ask_user_tool_returns_custom(self, monkeypatch):
        """AskUserTool returns custom input."""
        from core.tools.denial_handler import AskUserTool
        import core.tools.denial_handler

        monkeypatch.setattr(core.tools.denial_handler, "ask_user_question", lambda *args, **kwargs: ("Custom", "my_custom_value"))
        result = AskUserTool.ask("Enter path:")
        assert "my_custom_value" in result


# ─── Integration: ToolRegistryMorph with new tools ──────────────────────────

class TestToolRegistryIntegration:
    """Check that all new tools are registered."""

    def test_new_tools_registered(self):
        from core.tool_registry_morph import ToolRegistryMorph
        registry = ToolRegistryMorph()
        registered = set(registry.registry.keys())

        expected_tools = {
            # LSP
            "lsp_find_symbol", "lsp_find_refs", "lsp_goto_def",
            # Worktree
            "enter_worktree", "exit_worktree", "get_worktree_path",
            "commit_worktree", "list_worktrees",
            # Denial/AskUser
            "ask_user",
            # Existing
            "read_file", "edit_file", "glob_files", "grep_search",
            "spawn_agent", "close_agent",
        }
        missing = expected_tools - registered
        assert not missing, f"Missing tools in registry: {missing}"

    def test_concurrency_engine_available(self):
        from core.tool_registry_morph import ToolRegistryMorph
        registry = ToolRegistryMorph()
        assert registry.concurrency_engine is not None

    def test_sandboxed_executor_available(self):
        from core.tool_registry_morph import ToolRegistryMorph
        registry = ToolRegistryMorph()
        executor = registry.get_sandboxed_executor()
        assert executor is not None

    def test_manifest_includes_new_tools(self):
        from core.tool_registry_morph import ToolRegistryMorph
        import json
        registry = ToolRegistryMorph()
        manifest = json.loads(registry.export_manifest())
        tools = manifest["tools"]
        assert "lsp_find_symbol" in tools
        assert "enter_worktree" in tools
        assert "ask_user" in tools
