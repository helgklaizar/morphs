"""
lsp_tool.py — Task 32: Language Server Protocol Tool
Integrates Pyright (Python) and TSServer (TypeScript) as an LSP tool
for smart symbol and reference search instead of grep.
"""
import json
import os
import select
import subprocess
import time
import threading
from pathlib import Path
from typing import Optional
from core.logger import logger


class LSPClient:
    """
    A minimal LSP client over JSON-RPC stdio.
    Runs a language server as a subprocess and communicates via stdin/stdout.
    """
    def __init__(self, cmd: list[str], root_uri: str):
        self.cmd = cmd
        self.root_uri = root_uri
        self._proc: Optional[subprocess.Popen] = None
        self._req_id = 0
        self._lock = threading.Lock()
        self._initialized = False

    def _next_id(self) -> int:
        with self._lock:
            self._req_id += 1
            return self._req_id

    def start(self) -> bool:
        try:
            self._proc = subprocess.Popen(
                self.cmd,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL,
                text=False
            )
            self._initialize()
            return True
        except FileNotFoundError:
            logger.warning(f"⚠️ [LSP] Language server not found: {self.cmd[0]}")
            return False
        except Exception as e:
            logger.error(f"❌ [LSP] Failed to start server: {e}")
            return False

    def stop(self):
        if self._proc and self._proc.poll() is None:
            self._send_notification("shutdown", {})
            self._send_notification("exit", {})
            try:
                self._proc.wait(timeout=3)
            except subprocess.TimeoutExpired:
                self._proc.kill()
            self._proc = None
            self._initialized = False

    def _send(self, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False)
        header = f"Content-Length: {len(body.encode('utf-8'))}\r\n\r\n"
        self._proc.stdin.write((header + body).encode("utf-8"))
        self._proc.stdin.flush()

    def _readline_with_timeout(self, timeout: float) -> Optional[bytes]:
        """Reads one line with a real timeout using select()."""
        ready, _, _ = select.select([self._proc.stdout], [], [], timeout)
        if not ready:
            return None
        return self._proc.stdout.readline()

    def _read_bytes_with_timeout(self, n: int, timeout: float) -> Optional[bytes]:
        """Reads n bytes with a real timeout using select()."""
        ready, _, _ = select.select([self._proc.stdout], [], [], timeout)
        if not ready:
            return None
        return self._proc.stdout.read(n)

    def _recv(self, timeout: float = 10.0) -> Optional[dict]:
        """Reads a single JSON-RPC response with a real timeout using select()."""
        deadline = time.time() + timeout
        headers = {}
        # Read headers until an empty line
        while True:
            remaining = deadline - time.time()
            if remaining <= 0:
                return None
            raw = self._readline_with_timeout(remaining)
            if raw is None:
                return None  # timeout
            line = raw.decode("utf-8", errors="ignore").strip()
            if not line:
                break  # empty line = end of headers
            if ":" in line:
                k, v = line.split(":", 1)
                headers[k.strip()] = v.strip()

        length = int(headers.get("Content-Length", 0))
        if length == 0:
            return None

        remaining = deadline - time.time()
        if remaining <= 0:
            return None
        body = self._read_bytes_with_timeout(length, remaining)
        if not body:
            return None
        return json.loads(body.decode("utf-8", errors="ignore"))

    def _send_request(self, method: str, params: dict) -> Optional[dict]:
        req_id = self._next_id()
        self._send({"jsonrpc": "2.0", "id": req_id, "method": method, "params": params})
        # Skip notifications, wait for a response with our id
        for _ in range(20):
            resp = self._recv(timeout=8.0)
            if resp and resp.get("id") == req_id:
                return resp
        return None

    def _send_notification(self, method: str, params: dict) -> None:
        self._send({"jsonrpc": "2.0", "method": method, "params": params})

    def _initialize(self):
        resp = self._send_request("initialize", {
            "processId": os.getpid(),
            "rootUri": self.root_uri,
            "capabilities": {
                "textDocument": {
                    "definition": {"dynamicRegistration": False},
                    "references": {"dynamicRegistration": False},
                    "documentSymbol": {"dynamicRegistration": False},
                    "workspaceSymbol": {"dynamicRegistration": False},
                }
            },
            "initializationOptions": {}
        })
        if resp and "result" in resp:
            self._send_notification("initialized", {})
            self._initialized = True
            logger.info("✅ [LSP] Language server initialized.")
        else:
            logger.error("❌ [LSP] Initialization failed.")

    def open_document(self, filepath: str, language_id: str = "python"):
        """Notifies the LSP server that a file has been opened."""
        uri = Path(filepath).as_uri()
        try:
            content = Path(filepath).read_text(encoding="utf-8")
        except Exception:
            content = ""
        self._send_notification("textDocument/didOpen", {
            "textDocument": {
                "uri": uri,
                "languageId": language_id,
                "version": 1,
                "text": content
            }
        })

    def goto_definition(self, filepath: str, line: int, character: int) -> Optional[list]:
        uri = Path(filepath).as_uri()
        resp = self._send_request("textDocument/definition", {
            "textDocument": {"uri": uri},
            "position": {"line": line, "character": character}
        })
        if resp and "result" in resp:
            return resp["result"]
        return None

    def find_references(self, filepath: str, line: int, character: int) -> Optional[list]:
        uri = Path(filepath).as_uri()
        resp = self._send_request("textDocument/references", {
            "textDocument": {"uri": uri},
            "position": {"line": line, "character": character},
            "context": {"includeDeclaration": True}
        })
        if resp and "result" in resp:
            return resp["result"]
        return None

    def workspace_symbols(self, query: str) -> Optional[list]:
        resp = self._send_request("workspace/symbol", {"query": query})
        if resp and "result" in resp:
            return resp["result"]
        return None


class LSPTool:
    """
    Task 32 — A high-level LSP tool for ToolRegistry.
    Manages a pool of clients (Pyright for Python, TSServer for TS).
    """
    _clients: dict[str, LSPClient] = {}

    @classmethod
    def _get_client(cls, workspace_root: str, language: str = "python") -> Optional[LSPClient]:
        key = f"{workspace_root}:{language}"
        if key in cls._clients:
            client = cls._clients[key]
            # Check if the process is still alive
            if client._proc and client._proc.poll() is None:
                return client

        root_uri = Path(workspace_root).resolve().as_uri()

        if language == "python":
            # Pyright is the standard for Python LSP
            cmds_to_try = [
                ["pyright-langserver", "--stdio"],
                ["python", "-m", "pyright", "--stdio"],
                ["npx", "-y", "pyright", "--stdio"],
            ]
        else:
            # TSServer for TypeScript
            cmds_to_try = [
                ["typescript-language-server", "--stdio"],
                ["npx", "-y", "typescript-language-server", "--stdio"],
            ]

        for cmd in cmds_to_try:
            client = LSPClient(cmd, root_uri)
            if client.start():
                cls._clients[key] = client
                logger.info(f"🔌 [LSP] Started '{language}' server with: {' '.join(cmd)}")
                return client

        logger.warning(f"⚠️ [LSP] No working LSP server found for language '{language}'")
        return None

    @staticmethod
    def find_symbol(symbol_name: str, workspace_root: str = ".", language: str = "python") -> str:
        """
        [LSP] Searches for a symbol (class, function, variable) in the workspace via workspace/symbol.
        Much more accurate than grep — returns the symbol type, file, and exact position.
        """
        workspace_root = str(Path(workspace_root).resolve())
        client = LSPTool._get_client(workspace_root, language)
        if not client:
            return f"Error: Cannot start LSP server for '{language}'. Install pyright: npm i -g pyright"

        symbols = client.workspace_symbols(symbol_name)
        if symbols is None:
            return f"Error: LSP request failed for symbol '{symbol_name}'."
        if not symbols:
            return f"No symbols found matching '{symbol_name}'."

        lines = [f"🔍 LSP Symbol Search: '{symbol_name}' ({len(symbols)} results)\n"]
        kind_map = {
            1: "File", 2: "Module", 3: "Namespace", 4: "Package", 5: "Class",
            6: "Method", 7: "Property", 8: "Field", 9: "Constructor", 10: "Enum",
            11: "Interface", 12: "Function", 13: "Variable", 14: "Constant",
        }
        for sym in symbols[:20]:
            kind = kind_map.get(sym.get("kind", 0), "Unknown")
            name = sym.get("name", "?")
            loc = sym.get("location", {})
            uri = loc.get("uri", "").replace("file://", "")
            rng = loc.get("range", {}).get("start", {})
            line = rng.get("line", 0) + 1
            col = rng.get("character", 0) + 1
            container = sym.get("containerName", "")
            container_str = f" (in {container})" if container else ""
            lines.append(f"  [{kind}] {name}{container_str} — {uri}:{line}:{col}")

        return "\n".join(lines)

    @staticmethod
    def find_references(filepath: str, line: int, character: int, workspace_root: str = ".") -> str:
        """
        [LSP] Finds all references (usages) of a symbol at the cursor position.
        Args: filepath - absolute path to the file, line/character - 1-based position.
        """
        workspace_root = str(Path(workspace_root).resolve())
        abs_path = str(Path(filepath).resolve())

        lang = "typescript" if filepath.endswith((".ts", ".tsx")) else "python"
        client = LSPTool._get_client(workspace_root, lang)
        if not client:
            return f"Error: Cannot start LSP server for '{lang}'."

        client.open_document(abs_path, lang)
        # LSP uses 0-based indices
        refs = client.find_references(abs_path, line - 1, character - 1)
        if refs is None:
            return f"Error: LSP references request failed."
        if not refs:
            return f"No references found at {filepath}:{line}:{character}."

        lines = [f"📎 LSP References at {filepath}:{line}:{character} ({len(refs)} results)\n"]
        for ref in refs[:30]:
            uri = ref.get("uri", "").replace("file://", "")
            rng = ref.get("range", {}).get("start", {})
            ref_line = rng.get("line", 0) + 1
            ref_col = rng.get("character", 0) + 1
            lines.append(f"  {uri}:{ref_line}:{ref_col}")

        return "\n".join(lines)

    @staticmethod
    def goto_definition(filepath: str, line: int, character: int, workspace_root: str = ".") -> str:
        """
        [LSP] Returns the definition of the symbol under the cursor (textDocument/definition).
        """
        workspace_root = str(Path(workspace_root).resolve())
        abs_path = str(Path(filepath).resolve())

        lang = "typescript" if filepath.endswith((".ts", ".tsx")) else "python"
        client = LSPTool._get_client(workspace_root, lang)
        if not client:
            return f"Error: Cannot start LSP server for '{lang}'."

        client.open_document(abs_path, lang)
        defs = client.goto_definition(abs_path, line - 1, character - 1)
        if defs is None:
            return f"Error: LSP definition request failed."
        if not defs:
            return f"No definition found at {filepath}:{line}:{character}."

        # Normalize - defs can be a list or a dict
        if isinstance(defs, dict):
            defs = [defs]

        lines = [f"📍 LSP Definition at {filepath}:{line}:{character}\n"]
        for d in defs[:5]:
            uri = d.get("uri", "").replace("file://", "")
            rng = d.get("range", {}).get("start", {})
            def_line = rng.get("line", 0) + 1
            def_col = rng.get("character", 0) + 1
            lines.append(f"  → {uri}:{def_line}:{def_col}")

        return "\n".join(lines)

    @classmethod
    def shutdown_all(cls):
        """Gracefully shuts down all running LSP servers."""
        for key, client in cls._clients.items():
            client.stop()
            logger.info(f"🛑 [LSP] Server stopped: {key}")
        cls._clients.clear()
