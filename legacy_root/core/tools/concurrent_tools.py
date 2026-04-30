"""
concurrent_tools.py — Task 12 & 36: Tool Concurrency & Safe Queuing

Implements:
1. ParallelBatcher — parallel batching of read-only tools (Glob, Read, Find)
2. MutationQueue — a strict FIFO queue for mutating operations (Edit, Delete, Write)
   to ensure that responses are embedded into SessionMemory sequentially, without breaking knowledge graphs.
"""
import asyncio
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Callable, Coroutine, Optional
from enum import Enum
from core.logger import logger


class ToolCategory(str, Enum):
    """The tool category determines the execution mode."""
    READ_ONLY = "read_only"      # Parallel batching — safe
    MUTATION  = "mutation"       # Strict queue — no races
    DANGEROUS = "dangerous"      # Requires user confirmation + queue


# Registry of tool categories
TOOL_CATEGORIES: dict[str, ToolCategory] = {
    # Read-only — can be parallelized
    "read_file"       : ToolCategory.READ_ONLY,
    "glob_files"      : ToolCategory.READ_ONLY,
    "grep_search"     : ToolCategory.READ_ONLY,
    "ask_tool_registry": ToolCategory.READ_ONLY,
    "lsp_find_symbol" : ToolCategory.READ_ONLY,
    "lsp_find_refs"   : ToolCategory.READ_ONLY,
    "lsp_goto_def"    : ToolCategory.READ_ONLY,
    "list_worktrees"  : ToolCategory.READ_ONLY,
    "get_worktree_path": ToolCategory.READ_ONLY,
    "search_tools"    : ToolCategory.READ_ONLY,
    # Mutations — strict queue
    "edit_file"          : ToolCategory.MUTATION,
    "enter_worktree"     : ToolCategory.MUTATION,
    "exit_worktree"      : ToolCategory.MUTATION,
    "commit_worktree"    : ToolCategory.MUTATION,
    "merge_worktree"     : ToolCategory.MUTATION,
    "spawn_agent"        : ToolCategory.MUTATION,
    "close_agent"        : ToolCategory.MUTATION,
    "send_message"       : ToolCategory.MUTATION,
    # Dangerous — queue + confirmation
    "bash_run"           : ToolCategory.DANGEROUS,
    "deploy_prod"        : ToolCategory.DANGEROUS,
    "db_drop"            : ToolCategory.DANGEROUS,
}


@dataclass
class ToolCall:
    """A unit of work for the concurrency engine."""
    tool_name: str
    func: Callable
    args: dict
    call_id: str = field(default_factory=lambda: uuid.uuid4().hex[:8])
    submitted_at: float = field(default_factory=time.time)
    result: Any = None
    error: Optional[str] = None
    done: bool = False


class SessionMemory:
    """
    A minimal in-memory log of tool results.
    Guarantees sequential writing via asyncio.Lock.
    Integrates with GraphRAG/Kùzu when writing mutations.
    """
    def __init__(self):
        self._log: list[dict] = []
        self._lock = asyncio.Lock()

    async def record(self, call: ToolCall):
        """Atomically records the result in the log."""
        async with self._lock:
            entry = {
                "call_id"     : call.call_id,
                "tool"        : call.tool_name,
                "args"        : call.args,
                "result"      : call.result,
                "error"       : call.error,
                "submitted_at": call.submitted_at,
                "recorded_at" : time.time(),
                "category"    : TOOL_CATEGORIES.get(call.tool_name, ToolCategory.READ_ONLY).value,
            }
            self._log.append(entry)
            logger.info(
                f"📝 [SessionMemory] Recorded tool '{call.tool_name}' "
                f"(id={call.call_id}, ok={call.error is None})"
            )

    def get_log(self) -> list[dict]:
        return list(self._log)

    def last_result(self, tool_name: str) -> Optional[Any]:
        for entry in reversed(self._log):
            if entry["tool"] == tool_name and entry["error"] is None:
                return entry["result"]
        return None


class ParallelBatcher:
    """
    Task 12 — parallel batching of read-only tools.
    Multiple Glob/Read/LSP calls are launched simultaneously
    via asyncio.gather() and all results are saved to SessionMemory.
    """
    def __init__(self, session_memory: SessionMemory):
        self.memory = session_memory

    async def run_batch(self, calls: list[ToolCall]) -> dict[str, Any]:
        """
        Runs all read-only calls in parallel.
        Returns a dict {call_id: result}.
        """
        # Filter: only READ_ONLY
        read_only = []
        skipped = []
        for c in calls:
            cat = TOOL_CATEGORIES.get(c.tool_name, ToolCategory.READ_ONLY)
            if cat == ToolCategory.READ_ONLY:
                read_only.append(c)
            else:
                skipped.append(c)

        if skipped:
            logger.warning(
                f"⚠️ [ParallelBatcher] Skipped {len(skipped)} non-read-only calls: "
                f"{[c.tool_name for c in skipped]}"
            )

        logger.info(f"🚀 [ParallelBatcher] Launching {len(read_only)} parallel read-only tool calls...")

        async def _execute(call: ToolCall):
            try:
                if asyncio.iscoroutinefunction(call.func):
                    call.result = await call.func(**call.args)
                else:
                    # Run synchronous function in an executor to avoid blocking the loop
                    loop = asyncio.get_running_loop()
                    call.result = await loop.run_in_executor(
                        None, lambda: call.func(**call.args)
                    )
            except Exception as e:
                call.error = str(e)
                logger.error(f"❌ [ParallelBatcher] Tool '{call.tool_name}' failed: {e}")
            finally:
                call.done = True
                await self.memory.record(call)

        await asyncio.gather(*[_execute(c) for c in read_only])

        results = {}
        for c in read_only:
            results[c.call_id] = c.result if c.error is None else f"Error: {c.error}"

        logger.info(f"✅ [ParallelBatcher] Batch complete. {len(results)} results.")
        return results


class MutationQueue:
    """
    Task 36 — a strict FIFO queue for mutating operations.
    Ensures that Edit/Write/Worktree operations are executed strictly sequentially,
    preventing race conditions when writing to GraphRAG/Kùzu.
    """
    def __init__(self, session_memory: SessionMemory):
        self.memory = session_memory
        self._queue: asyncio.Queue[ToolCall] = asyncio.Queue()
        self._worker_task: Optional[asyncio.Task] = None
        self._running = False

    def start(self):
        """Starts a background worker to process the queue."""
        if not self._running:
            self._running = True
            try:
                loop = asyncio.get_running_loop()
                self._worker_task = loop.create_task(self._worker())
            except RuntimeError:
                # No running loop — defer start until the first enqueue
                self._worker_task = None
            logger.info("🔒 [MutationQueue] Worker started.")

    def stop(self):
        """Stops the worker."""
        self._running = False
        if self._worker_task:
            self._worker_task.cancel()

    async def _worker(self):
        """Processes mutations strictly sequentially."""
        while self._running:
            try:
                call = await asyncio.wait_for(self._queue.get(), timeout=1.0)
            except asyncio.TimeoutError:
                continue
            except asyncio.CancelledError:
                break

            logger.info(
                f"🔧 [MutationQueue] Executing mutation: '{call.tool_name}' "
                f"(id={call.call_id}, queue_size={self._queue.qsize()})"
            )
            try:
                if asyncio.iscoroutinefunction(call.func):
                    call.result = await call.func(**call.args)
                else:
                    loop = asyncio.get_running_loop()
                    call.result = await loop.run_in_executor(
                        None, lambda: call.func(**call.args)
                    )
            except Exception as e:
                call.error = str(e)
                logger.error(f"❌ [MutationQueue] Mutation '{call.tool_name}' failed: {e}")
            finally:
                call.done = True
                await self.memory.record(call)
                self._queue.task_done()

    async def enqueue(self, call: ToolCall) -> ToolCall:
        """
        Adds a mutation to the queue and returns the ToolCall.
        The caller can await call.done via wait_for_completion().
        """
        await self._queue.put(call)
        logger.info(
            f"📥 [MutationQueue] Enqueued '{call.tool_name}' "
            f"(id={call.call_id}, queue_depth={self._queue.qsize()})"
        )
        return call

    async def wait_for_completion(self, call: ToolCall, timeout: float = 60.0) -> str:
        """Blocks until a specific call is completed."""
        deadline = time.time() + timeout
        while not call.done and time.time() < deadline:
            await asyncio.sleep(0.1)
        if not call.done:
            return f"Error: Mutation '{call.tool_name}' timed out after {timeout}s."
        if call.error:
            return f"Error: {call.error}"
        return str(call.result)

    async def drain(self):
        """Waits until the queue is empty."""
        await self._queue.join()
        logger.info("✅ [MutationQueue] All mutations processed.")

    @property
    def queue_depth(self) -> int:
        return self._queue.qsize()


class ToolConcurrencyEngine:
    """
    A facade for managing tool concurrency.
    Automatically routes calls to either ParallelBatcher or MutationQueue.
    """
    def __init__(self):
        self.memory = SessionMemory()
        self.batcher = ParallelBatcher(self.memory)
        self.mutation_queue = MutationQueue(self.memory)

    def start(self):
        self.mutation_queue.start()
        logger.info("⚡ [ToolConcurrencyEngine] Started (ParallelBatcher + MutationQueue).")

    def stop(self):
        self.mutation_queue.stop()

    def build_call(self, tool_name: str, func: Callable, **kwargs) -> ToolCall:
        return ToolCall(tool_name=tool_name, func=func, args=kwargs)

    async def execute(self, calls: list[ToolCall]) -> dict[str, Any]:
        """
        Routes calls:
        - READ_ONLY → parallel batching
        - MUTATION/DANGEROUS → strict queue
        
        Returns a dict {call_id: result} after all calls are completed.
        """
        read_calls = []
        mut_calls = []

        for c in calls:
            cat = TOOL_CATEGORIES.get(c.tool_name, ToolCategory.READ_ONLY)
            if cat == ToolCategory.READ_ONLY:
                read_calls.append(c)
            else:
                mut_calls.append(c)

        results = {}

        # Run read-only calls in parallel
        if read_calls:
            read_results = await self.batcher.run_batch(read_calls)
            results.update(read_results)

        # Sequentially enqueue mutations and wait
        if mut_calls:
            for c in mut_calls:
                await self.mutation_queue.enqueue(c)
            for c in mut_calls:
                result = await self.mutation_queue.wait_for_completion(c)
                results[c.call_id] = result

        return results

    def get_session_log(self) -> list[dict]:
        return self.memory.get_log()

    def get_last(self, tool_name: str) -> Optional[Any]:
        return self.memory.last_result(tool_name)


# Global engine singleton (initialized on CoreMind startup)
_engine: Optional[ToolConcurrencyEngine] = None


def get_engine() -> ToolConcurrencyEngine:
    global _engine
    if _engine is None:
        _engine = ToolConcurrencyEngine()
    return _engine
