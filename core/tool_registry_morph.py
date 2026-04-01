import json
import inspect
import os
from typing import Dict, Callable, List, Optional
from core.logger import logger
from core.tools.concurrent_tools import get_engine, ToolConcurrencyEngine

class ToolRegistryMorph:
    """
    Port Manifests (Claw-Code port)
    Сканирует и динамически экспортирует доступные тулзы, передавая их Рою.
    Защищает от галлюцинаций (ИИ точно знает свои API).
    Includes Lazy Tool Search & Permissions filtering (Sprint 20).
    """
    def __init__(self, permission_context=None):
        self.registry: Dict[str, dict] = {}
        
        from core.permissions import ToolPermissionContext
        self.permissions = permission_context or ToolPermissionContext()

        # Авто-регистрация строгих File Tools вместо свободного Bash
        self._register_internal_file_tools()
        
        # Регистрация агентов и примитивов Swarm Lifecycle
        self._register_internal_agent_tools()

        # Task 32: LSP (Language Server Protocol)
        self._register_lsp_tools()

        # Task 33: Git Worktree tools
        self._register_worktree_tools()

        # Task 29 & 30: AskUser enhanced tool
        self._register_denial_tools()

        # Task 12 & 36: Concurrency engine reference
        self.concurrency_engine: ToolConcurrencyEngine = get_engine()

    def _register_internal_file_tools(self):
        from core.tools.file_ops import FileTools
        self.register_tool("read_file", FileTools.read_file, "Strict file reader tool", False)
        self.register_tool("edit_file", FileTools.edit_file, "Strict file editor tool (replace text)", False)
        self.register_tool("glob_files", FileTools.glob_files, "Strict file glob pattern finder", False)
        self.register_tool("grep_search", FileTools.grep_search, "Strict regex pattern searcher inside a file", False)
        # Register the lazy search itself as a tool!
        self.register_tool("ask_tool_registry", self.search_tools, "Lazy query to find available tools (e.g., 'tools for editing files')", False)

    def _register_internal_agent_tools(self):
        from core.tools.agent_ops import AgentTools
        self.register_tool("spawn_agent", AgentTools.spawn_agent, "Dynamically creates a new subagent with a specific role (Explore, Plan, Execute, Audit, Watchdog) and Briefing", False)
        self.register_tool("wait_agent", AgentTools.wait_agent, "Asynchronously waits for a specific agent to report completion or closes", False)
        self.register_tool("resume_agent", AgentTools.resume_agent, "Forcefully wakes up an explicitly sleeping/paused agent", False)
        self.register_tool("close_agent", AgentTools.close_agent, "Gracefully closes/destroys a subagent lifecycle", False)
        self.register_tool("send_message", AgentTools.send_message, "Direct P2P inter-agent communication via EventBus", False)
        self.register_tool("sleep_agent", AgentTools.sleep_agent, "Suspends an agent strictly for X seconds to save CPU & Tokens", False)

    def _register_lsp_tools(self):
        from core.tools.lsp_tool import LSPTool
        self.register_tool(
            "lsp_find_symbol", LSPTool.find_symbol,
            "[LSP] Find a symbol (class/function/var) by name in the workspace using Pyright/TSServer — much more accurate than grep",
            False
        )
        self.register_tool(
            "lsp_find_refs", LSPTool.find_references,
            "[LSP] Find all usages/references to a symbol at a given file:line:char position",
            False
        )
        self.register_tool(
            "lsp_goto_def", LSPTool.goto_definition,
            "[LSP] Go to definition of the symbol under cursor at file:line:char",
            False
        )

    def _register_worktree_tools(self):
        from core.tools.worktree_ops import WorktreeTools
        self.register_tool(
            "enter_worktree", WorktreeTools.enter_worktree,
            "[Worktree] Create an isolated git worktree branch for safe compilation/experiments without touching main directory",
            False
        )
        self.register_tool(
            "exit_worktree", WorktreeTools.exit_worktree,
            "[Worktree] Close a worktree session: optionally merge changes to main branch, then clean up temp directory",
            False
        )
        self.register_tool(
            "get_worktree_path", WorktreeTools.get_worktree_path,
            "[Worktree] Get the filesystem path for an active worktree session — use this path for build tools",
            False
        )
        self.register_tool(
            "commit_worktree", WorktreeTools.commit_worktree_changes,
            "[Worktree] Commit all changes inside a worktree session to its isolated branch",
            False
        )
        self.register_tool(
            "list_worktrees", WorktreeTools.list_worktrees,
            "[Worktree] List all active git worktrees for a project",
            False
        )

    def _register_denial_tools(self):
        from core.tools.denial_handler import AskUserTool
        self.register_tool(
            "ask_user", AskUserTool.ask,
            "[AskUser] Ask the user a structured question with A/B/C options + custom input. Use when blocked or need human decision.",
            False
        )

    def register_tool(self, name: str, func: Callable, description: str, is_dangerous: bool = False):
        if self.permissions.is_blocked(name):
            logger.info(f"🚫 [Tool-Registry] Инструмент '{name}' ЗАБЛОКИРОВАН политиками безопасности (ToolPermissionContext).")
            return
            
        sig = inspect.signature(func)
        params = []
        for param_name, param in sig.parameters.items():
            params.append({
                "name": param_name,
                "type": str(param.annotation) if param.annotation != inspect.Parameter.empty else "Any"
            })
            
        self.registry[name] = {
            "description": description,
            "parameters": params,
            "is_dangerous": is_dangerous,
            "requires_user_confirmation": self.permissions.needs_confirmation(name),
            "mcp_server": None, # Локальный тулз
            "func": func  # Сохраняем ссылку для локального вызова
        }
        logger.info(f"🛠️ [Tool-Registry] Локальный инструмент '{name}' зарегистрирован.")

    def register_mcp_namespace(self, server_name: str, mcp_tools_list: list):
        """Регистрирует инструменты из ответа MCP сервера tools/list"""
        count = 0
        for tool in mcp_tools_list:
            t_name = f"{server_name}_{tool.get('name')}"
            
            if self.permissions.is_blocked(t_name):
                logger.info(f"🚫 [Tool-Registry] MCP-тулз '{t_name}' ЗАБЛОКИРОВАН политиками (ToolPermissionContext).")
                continue
                
            params = []
            props = tool.get('inputSchema', {}).get('properties', {})
            for p_name, p_data in props.items():
                params.append({
                    "name": p_name,
                    "type": p_data.get("type", "Any"),
                    "description": p_data.get("description", "")
                })

            self.registry[t_name] = {
                "description": tool.get('description', ''),
                "parameters": params,
                "is_dangerous": True, # MCP-тулзы всегда опасные
                "requires_user_confirmation": self.permissions.needs_confirmation(t_name),
                "mcp_server": server_name,
                "mcp_original_name": tool.get('name')
            }
            count += 1
        logger.info(f"🌐 [Tool-Registry] Зарегистрировано {count} плагинов из MCP сервера '{server_name}'.")

    def search_tools(self, query: str, limit: int = 5) -> str:
        """
        [Lazy Tool Search] (Task 13) 
        Ищет тулзы по описанию, чтобы не раздувать System Prompt.
        """
        import difflib
        q = query.lower()
        results = []
        
        # Simple string matching + semantic closeness
        for name, meta in self.registry.items():
            if self.permissions.is_blocked(name):
                continue
                
            desc = meta["description"].lower()
            if q in name.lower() or q in desc:
                results.append((name, meta))
            else:
                sim = difflib.SequenceMatcher(None, q, desc).ratio()
                if sim > 0.3:
                    results.append((name, meta))
                    
        # Sort by relevance roughly
        results.sort(key=lambda x: len(x[1]["description"]))
        results = results[:limit]
        
        if not results:
            return "No matching tools found. Consider refining your search query."
            
        out = f"Found {len(results)} matches for '{query}':\n"
        for name, meta in results:
            out += f"- {name}: {meta['description']} (Requires confirmation: {meta['requires_user_confirmation']})\n"
        return out

    def get_allowed_tools_manifest(self) -> dict:
        """Возвращает только разрешенные и безопасные тулзы."""
        allowed = {}
        for name, meta in self.registry.items():
            if not self.permissions.is_blocked(name):
                # Hide all tools except basics by default to keep prompt small 
                # (unless Lazy Search is strictly not used)
                allowed[name] = {k: v for k, v in meta.items() if k != 'func'}
        return allowed

    def export_manifest(self) -> str:
        manifest = {
            "version": "1.1",
            "tools": self.get_allowed_tools_manifest()
        }
        return json.dumps(manifest, indent=2, ensure_ascii=False)
        
    def save_manifest_to_file(self, filepath: str = "core/blueprints/tool_manifest.json"):
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(self.export_manifest())
        logger.info(f"📄 [Tool-Registry] Манифест тулзов успешно сброшен в {filepath}.")

    def get_sandboxed_executor(self):
        """Возвращает SandboxedToolExecutor для безопасного вызова тулзов с Denial Flow."""
        from core.tools.denial_handler import SandboxedToolExecutor
        return SandboxedToolExecutor(self, self.permissions)

    def start_concurrency_engine(self):
        """Запускает фоновый MutationQueue worker."""
        self.concurrency_engine.start()
        logger.info("⚡ [Tool-Registry] ConcurrencyEngine started.")

    def stop_concurrency_engine(self):
        """Останавливает ConcurrencyEngine при shutdown."""
        self.concurrency_engine.stop()
        logger.info("🛑 [Tool-Registry] ConcurrencyEngine stopped.")
