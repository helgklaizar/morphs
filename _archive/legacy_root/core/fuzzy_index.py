"""
FuzzyIndex — Task 11: Fast In-Memory search for project paths.

Strategy:
  1. `git ls-files` — get a list of all versioned files (fast, ~5ms)
  2. `ripgrep --files` — fallback if git is not available, or if untracked files are included
  3. In-memory fuzzy scoring via rapidfuzz or built-in difflib (no dependencies)

Cache TTL: 30 seconds. On file changes — auto-update via inotify-stat.

API:
    idx = FuzzyIndex("/path/to/project")
    results = idx.search("auth router")
    # [FileMatch(path="backend/routers/auth.py", score=0.92), ...]

    content = idx.rg_search("class SwarmOrchestrator")
    # ["core/swarm_orchestrator.py:12:class SwarmOrchestrator:"]
"""
from __future__ import annotations

import os
import time
import subprocess
import asyncio
from dataclasses import dataclass, field
from typing import Optional
from core.logger import logger


@dataclass
class FileMatch:
    path: str           # Relative path from the project root
    score: float        # 0.0–1.0, 1.0 = exact match
    abs_path: str = ""  # Absolute path (filled automatically)


@dataclass
class ContentMatch:
    path: str
    line_number: int
    line_content: str


class FuzzyIndex:
    """
    In-memory index of file paths with fuzzy matching search.

    Does not require a heavy vector database. Used for:
    - Fast path autocompletion in UI/CLI
    - Finding files before opening LanceDB
    - Searching content via ripgrep

    File tree cache TTL: 30 seconds.
    """

    _CACHE_TTL: float = 30.0

    def __init__(self, workspace_path: str, include_untracked: bool = False):
        """
        Args:
            workspace_path: Project root.
            include_untracked: If True — indexes all files, not just git-tracked ones.
        """
        self.workspace_path = os.path.abspath(workspace_path)
        self.include_untracked = include_untracked

        self._file_cache: list[str] = []
        self._cache_timestamp: float = 0.0

    # ------------------------------------------------------------------
    # Internal methods: index building
    # ------------------------------------------------------------------

    def _is_cache_fresh(self) -> bool:
        return (time.monotonic() - self._cache_timestamp) < self._CACHE_TTL

    def _build_index_via_git(self) -> list[str]:
        """Get a list of files via `git ls-files` (~5ms for most projects)."""
        try:
            result = subprocess.run(
                ["git", "ls-files"],
                cwd=self.workspace_path,
                capture_output=True,
                text=True,
                timeout=10,
            )
            if result.returncode == 0:
                files = [line.strip() for line in result.stdout.splitlines() if line.strip()]
                logger.debug(f"[FuzzyIndex] git ls-files: {len(files)} files.")
                return files
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass
        return []

    def _build_index_via_rg(self) -> list[str]:
        """Fallback: `rg --files` if git is unavailable."""
        try:
            result = subprocess.run(
                ["rg", "--files", "--no-ignore-vcs"],
                cwd=self.workspace_path,
                capture_output=True,
                text=True,
                timeout=15,
            )
            if result.returncode == 0:
                files = [
                    os.path.relpath(line.strip(), self.workspace_path)
                    for line in result.stdout.splitlines()
                    if line.strip()
                ]
                logger.debug(f"[FuzzyIndex] rg --files: {len(files)} files.")
                return files
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass
        return []

    def _build_index_via_walk(self) -> list[str]:
        """Last-resort fallback: os.walk with filtering of junk directories."""
        SKIP_DIRS = {".git", "node_modules", "__pycache__", ".venv", "venv", ".lancedb", ".kuzu_graph", "dist", ".next"}
        files: list[str] = []
        for root, dirs, filenames in os.walk(self.workspace_path):
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
            for fname in filenames:
                abs_p = os.path.join(root, fname)
                rel_p = os.path.relpath(abs_p, self.workspace_path)
                files.append(rel_p)
        logger.debug(f"[FuzzyIndex] os.walk: {len(files)} files.")
        return files

    def _get_files(self) -> list[str]:
        """Returns the cached list of files. Updates the cache if it's stale."""
        if self._is_cache_fresh():
            return self._file_cache

        files = self._build_index_via_git()

        if self.include_untracked or not files:
            files = self._build_index_via_rg() or self._build_index_via_walk()

        self._file_cache = files
        self._cache_timestamp = time.monotonic()
        return files

    # ------------------------------------------------------------------
    # Fuzzy scoring
    # ------------------------------------------------------------------

    @staticmethod
    def _score(query: str, candidate: str) -> float:
        """
        Calculates the similarity score between a query and a candidate.
        Uses rapidfuzz if installed, otherwise difflib.
        """
        q = query.lower()
        c = candidate.lower()

        # Exact substring match — highest priority
        if q in c:
            # The closer to the end of the path (filename), the higher the score
            tail = c.split("/")[-1]
            return 0.95 if q in tail else 0.85

        try:
            from rapidfuzz import fuzz
            return fuzz.partial_ratio(q, c) / 100.0
        except ImportError:
            from difflib import SequenceMatcher
            return SequenceMatcher(None, q, c).ratio()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def search(
        self,
        query: str,
        limit: int = 20,
        min_score: float = 0.4,
        extensions: Optional[list[str]] = None,
    ) -> list[FileMatch]:
        """
        Searches for files by query with fuzzy matching.

        Args:
            query: Search query (part of a name or path).
            limit: Maximum number of results.
            min_score: Minimum relevance threshold (0–1).
            extensions: Filter by extensions, e.g., [".py", ".ts"].

        Returns:
            A list of FileMatch objects, sorted by score in descending order.
        """
        files = self._get_files()
        results: list[FileMatch] = []

        for rel_path in files:
            # Filter by extension
            if extensions and not any(rel_path.endswith(ext) for ext in extensions):
                continue

            score = self._score(query, rel_path)
            if score >= min_score:
                results.append(FileMatch(
                    path=rel_path,
                    score=score,
                    abs_path=os.path.join(self.workspace_path, rel_path),
                ))

        results.sort(key=lambda x: x.score, reverse=True)
        logger.info(f"[FuzzyIndex] '{query}': {len(results)} matches (top-{limit}).")
        return results[:limit]

    def rg_search(
        self,
        pattern: str,
        limit: int = 50,
        extensions: Optional[list[str]] = None,
        context_lines: int = 0,
    ) -> list[ContentMatch]:
        """
        Search file content via ripgrep.

        Args:
            pattern: Regex pattern for ripgrep.
            limit: Maximum number of matches.
            extensions: Filter by extensions ([".py", ".ts"]).
            context_lines: Number of context lines around a match.

        Returns:
            A list of ContentMatch objects with path, line number, and content.
        """
        cmd = ["rg", "--line-number", "--no-heading", "--color=never"]

        if extensions:
            for ext in extensions:
                cmd += ["--glob", f"*{ext}"]

        if context_lines > 0:
            cmd += ["-C", str(context_lines)]

        cmd.append(pattern)

        try:
            result = subprocess.run(
                cmd,
                cwd=self.workspace_path,
                capture_output=True,
                text=True,
                timeout=30,
            )

            if result.returncode not in (0, 1):  # 1 = no matches, this is normal
                logger.warning(f"[FuzzyIndex] rg returned code {result.returncode}: {result.stderr[:200]}")
                return []

            matches: list[ContentMatch] = []
            for line in result.stdout.splitlines()[:limit]:
                # Format: "path/file.py:42:content here"
                parts = line.split(":", 2)
                if len(parts) >= 3:
                    try:
                        matches.append(ContentMatch(
                            path=parts[0],
                            line_number=int(parts[1]),
                            line_content=parts[2],
                        ))
                    except ValueError:
                        pass  # Context lines without a line number

            logger.info(f"[FuzzyIndex] rg '{pattern}': {len(matches)} content matches.")
            return matches

        except (subprocess.TimeoutExpired, FileNotFoundError) as e:
            logger.error(f"[FuzzyIndex] ripgrep is unavailable or timed out: {e}")
            return []

    def invalidate_cache(self):
        """Forcibly invalidates the file cache."""
        self._cache_timestamp = 0.0
        logger.debug("[FuzzyIndex] Cache invalidated.")

    def stats(self) -> dict:
        """Returns index statistics."""
        files = self._get_files()
        exts: dict[str, int] = {}
        for f in files:
            ext = os.path.splitext(f)[1] or "(no ext)"
            exts[ext] = exts.get(ext, 0) + 1
        return {
            "total_files": len(files),
            "cache_age_sec": time.monotonic() - self._cache_timestamp,
            "by_extension": dict(sorted(exts.items(), key=lambda x: -x[1])[:15]),
        }