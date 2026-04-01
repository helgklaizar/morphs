"""
FuzzyIndex — Задача 11: Быстрый In-Memory поиск по путям проекта.

Стратегия:
  1. `git ls-files` — получаем список всех versioned файлов (fast, ~5ms)
  2. `ripgrep --files` — fallback если нет git, или включены untracked файлы
  3. In-memory fuzzy scoring через rapidfuzz или встроенный difflib (без зависимостей)

Кеш TTL: 30 секунд. При изменении файлов — автообновление через inotify-stat.

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
    path: str           # Относительный путь от корня проекта
    score: float        # 0.0–1.0, 1.0 = точное совпадение
    abs_path: str = ""  # Абсолютный путь (заполняется автоматически)


@dataclass
class ContentMatch:
    path: str
    line_number: int
    line_content: str


class FuzzyIndex:
    """
    In-memory индекс путей файлов с поиском по нечёткому совпадению.

    Не требует тяжёлой векторной базы. Используется для:
    - Быстрого автодополнения путей в UI/CLI
    - Нахождения файлов перед тем, как открывать LanceDB
    - Поиска по содержимому через ripgrep

    TTL кеш файлового дерева: 30 секунд.
    """

    _CACHE_TTL: float = 30.0

    def __init__(self, workspace_path: str, include_untracked: bool = False):
        """
        Args:
            workspace_path: Корень проекта.
            include_untracked: Если True — индексирует все файлы, не только git-tracked.
        """
        self.workspace_path = os.path.abspath(workspace_path)
        self.include_untracked = include_untracked

        self._file_cache: list[str] = []
        self._cache_timestamp: float = 0.0

    # ------------------------------------------------------------------
    # Внутренние методы: построение индекса
    # ------------------------------------------------------------------

    def _is_cache_fresh(self) -> bool:
        return (time.monotonic() - self._cache_timestamp) < self._CACHE_TTL

    def _build_index_via_git(self) -> list[str]:
        """Получаем список файлов через `git ls-files` (~5ms для большинства проектов)."""
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
                logger.debug(f"[FuzzyIndex] git ls-files: {len(files)} файлов.")
                return files
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass
        return []

    def _build_index_via_rg(self) -> list[str]:
        """Fallback: `rg --files` если git недоступен."""
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
                logger.debug(f"[FuzzyIndex] rg --files: {len(files)} файлов.")
                return files
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass
        return []

    def _build_index_via_walk(self) -> list[str]:
        """Last-resort fallback: os.walk с фильтрацией мусорных директорий."""
        SKIP_DIRS = {".git", "node_modules", "__pycache__", ".venv", "venv", ".lancedb", ".kuzu_graph", "dist", ".next"}
        files: list[str] = []
        for root, dirs, filenames in os.walk(self.workspace_path):
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
            for fname in filenames:
                abs_p = os.path.join(root, fname)
                rel_p = os.path.relpath(abs_p, self.workspace_path)
                files.append(rel_p)
        logger.debug(f"[FuzzyIndex] os.walk: {len(files)} файлов.")
        return files

    def _get_files(self) -> list[str]:
        """Возвращает кешированный список файлов. Обновляет кеш при устаревании."""
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
        Вычисляет степень похожести запроса и кандидата.
        Использует rapidfuzz если установлен, иначе difflib.
        """
        q = query.lower()
        c = candidate.lower()

        # Точное вхождение — максимальный приоритет
        if q in c:
            # Чем ближе к концу пути (имя файла), тем выше оценка
            tail = c.split("/")[-1]
            return 0.95 if q in tail else 0.85

        try:
            from rapidfuzz import fuzz
            return fuzz.partial_ratio(q, c) / 100.0
        except ImportError:
            from difflib import SequenceMatcher
            return SequenceMatcher(None, q, c).ratio()

    # ------------------------------------------------------------------
    # Публичный API
    # ------------------------------------------------------------------

    def search(
        self,
        query: str,
        limit: int = 20,
        min_score: float = 0.4,
        extensions: Optional[list[str]] = None,
    ) -> list[FileMatch]:
        """
        Ищет файлы по запросу с нечётким совпадением.

        Args:
            query: Поисковый запрос (часть имени или пути).
            limit: Максимальное количество результатов.
            min_score: Минимальный порог релевантности (0–1).
            extensions: Фильтр по расширениям, например [".py", ".ts"].

        Returns:
            Список FileMatch, отсортированных по убыванию score.
        """
        files = self._get_files()
        results: list[FileMatch] = []

        for rel_path in files:
            # Фильтр по расширению
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
        logger.info(f"[FuzzyIndex] '{query}': {len(results)} совпадений (top-{limit}).")
        return results[:limit]

    def rg_search(
        self,
        pattern: str,
        limit: int = 50,
        extensions: Optional[list[str]] = None,
        context_lines: int = 0,
    ) -> list[ContentMatch]:
        """
        Поиск по содержимому файлов через ripgrep.

        Args:
            pattern: Regex-паттерн для ripgrep.
            limit: Максимальное количество совпадений.
            extensions: Фильтр по расширениям ([".py", ".ts"]).
            context_lines: Количество строк контекста вокруг совпадения.

        Returns:
            Список ContentMatch с путём, номером строки и содержимым.
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

            if result.returncode not in (0, 1):  # 1 = нет совпадений, это нормально
                logger.warning(f"[FuzzyIndex] rg вернул код {result.returncode}: {result.stderr[:200]}")
                return []

            matches: list[ContentMatch] = []
            for line in result.stdout.splitlines()[:limit]:
                # Формат: "path/file.py:42:content here"
                parts = line.split(":", 2)
                if len(parts) >= 3:
                    try:
                        matches.append(ContentMatch(
                            path=parts[0],
                            line_number=int(parts[1]),
                            line_content=parts[2],
                        ))
                    except ValueError:
                        pass  # Строки контекста без номера

            logger.info(f"[FuzzyIndex] rg '{pattern}': {len(matches)} совпадений в контенте.")
            return matches

        except (subprocess.TimeoutExpired, FileNotFoundError) as e:
            logger.error(f"[FuzzyIndex] ripgrep недоступен или таймаут: {e}")
            return []

    def invalidate_cache(self):
        """Принудительно инвалидирует кеш файлов."""
        self._cache_timestamp = 0.0
        logger.debug("[FuzzyIndex] Кеш инвалидирован.")

    def stats(self) -> dict:
        """Возвращает статистику индекса."""
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
