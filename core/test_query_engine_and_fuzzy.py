"""Тесты для QueryEngine (Task 5) и FuzzyIndex (Task 11)."""
import os
import pytest
from unittest.mock import MagicMock, patch


# ── QueryEngine тесты ──────────────────────────────────────────────────────

class TestQueryEngine:
    """Тесты для QueryEngine фасада."""

    def test_import(self):
        from core.query_engine import QueryEngine
        assert QueryEngine is not None

    def test_init_lazy(self, tmp_path):
        from core.query_engine import QueryEngine
        engine = QueryEngine(str(tmp_path))
        # Lazy — соединения не открыты до первого вызова
        assert engine._lance_db is None
        assert engine._kuzu_conn is None
        assert engine._embed_model is None

    def test_search_no_table_returns_empty(self, tmp_path):
        from core.query_engine import QueryEngine
        engine = QueryEngine(str(tmp_path))
        # LanceDB пустая — должна вернуть []
        results = engine.search("auth router")
        assert results == []

    def test_vector_result_dataclass(self):
        from core.query_engine import VectorResult
        r = VectorResult(text="Class Foo", type="class", path="foo.py", score=0.9)
        assert r.score == 0.9
        assert r.type == "class"

    def test_graph_result_dataclass(self):
        from core.query_engine import GraphResult
        gr = GraphResult(columns=["path", "name"], rows=[["foo.py", "Bar"]])
        assert gr.columns[0] == "path"
        assert gr.rows[0][1] == "Bar"

    def test_hybrid_result_to_prompt_context_empty(self):
        from core.query_engine import HybridResult
        hr = HybridResult()
        ctx = hr.to_prompt_context()
        assert "Контекст не найден" in ctx

    def test_hybrid_result_to_prompt_context_with_vectors(self):
        from core.query_engine import HybridResult, VectorResult
        hr = HybridResult(
            vector_results=[VectorResult(text="Class Foo", type="class", path="bar.py", score=0.85)],
        )
        ctx = hr.to_prompt_context()
        assert "LanceDB" in ctx
        assert "Foo" in ctx
        assert "0.85" in ctx

    def test_hybrid_result_to_prompt_context_with_graph(self):
        from core.query_engine import HybridResult
        hr = HybridResult(
            graph_columns=["path", "name"],
            graph_results=[["core/main.py", "SwarmOrchestrator"]],
        )
        ctx = hr.to_prompt_context()
        assert "Kùzu" in ctx
        assert "SwarmOrchestrator" in ctx

    def test_search_experience_no_table(self, tmp_path):
        from core.query_engine import QueryEngine
        engine = QueryEngine(str(tmp_path))
        results = engine.search_experience("ImportError: cannot import module")
        assert results == []  # нет таблицы → пустой список, не исключение


# ── FuzzyIndex тесты ──────────────────────────────────────────────────────

class TestFuzzyIndex:
    """Тесты для FuzzyIndex (in-memory git ls-files + ripgrep)."""

    def test_import(self):
        from core.fuzzy_index import FuzzyIndex
        assert FuzzyIndex is not None

    def test_file_match_dataclass(self):
        from core.fuzzy_index import FileMatch
        m = FileMatch(path="core/main.py", score=0.92, abs_path="/abs/core/main.py")
        assert m.score == 0.92

    def test_content_match_dataclass(self):
        from core.fuzzy_index import ContentMatch
        cm = ContentMatch(path="core/main.py", line_number=42, line_content="class Foo:")
        assert cm.line_number == 42

    def test_search_real_project(self):
        """Тест на реальном проекте — должен найти файлы по запросу."""
        from core.fuzzy_index import FuzzyIndex
        workspace = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        idx = FuzzyIndex(workspace)
        results = idx.search("bash_harness", limit=5)
        assert len(results) > 0
        # Должны найти bash_harness.py
        paths = [r.path for r in results]
        assert any("bash_harness" in p for p in paths)

    def test_search_with_extension_filter(self):
        from core.fuzzy_index import FuzzyIndex
        workspace = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        idx = FuzzyIndex(workspace)
        results = idx.search("query", limit=20, extensions=[".py"])
        # Все результаты должны быть .py файлами
        for r in results:
            assert r.path.endswith(".py"), f"Неожиданное расширение: {r.path}"

    def test_search_returns_sorted_by_score(self):
        from core.fuzzy_index import FuzzyIndex
        workspace = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        idx = FuzzyIndex(workspace)
        results = idx.search("graph_rag", limit=10)
        if len(results) > 1:
            # Отсортированы по убыванию score
            scores = [r.score for r in results]
            assert scores == sorted(scores, reverse=True)

    def test_min_score_filter(self):
        from core.fuzzy_index import FuzzyIndex
        workspace = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        idx = FuzzyIndex(workspace)
        results = idx.search("xyzzy_notexist_12345", limit=50, min_score=0.9)
        # Абсурдный запрос не должен ничего найти выше 0.9
        assert len(results) == 0

    def test_rg_search_finds_content(self):
        import shutil
        if not shutil.which("rg"):
            pytest.skip("ripgrep (rg) не установлен на этой системе")
        from core.fuzzy_index import FuzzyIndex
        workspace = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        idx = FuzzyIndex(workspace)
        results = idx.rg_search("class BashHarness", extensions=[".py"])
        assert len(results) > 0
        assert any("bash_harness" in r.path for r in results)

    def test_cache_invalidation(self):
        from core.fuzzy_index import FuzzyIndex
        workspace = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        idx = FuzzyIndex(workspace)
        idx.search("main")  # Заполняем кеш
        assert len(idx._file_cache) > 0
        idx.invalidate_cache()
        assert idx._cache_timestamp == 0.0

    def test_stats(self):
        from core.fuzzy_index import FuzzyIndex
        workspace = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        idx = FuzzyIndex(workspace)
        stats = idx.stats()
        assert "total_files" in stats
        assert stats["total_files"] > 0
        assert "by_extension" in stats
