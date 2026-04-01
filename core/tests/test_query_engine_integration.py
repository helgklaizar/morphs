"""
Integration test for QueryEngine + CodeLensMorph.

REAL E2E:
  1. Creates a temporary directory with Python files in backend/
  2. Runs CodeLensMorph.build_graph() — real AST parsing + writing to LanceDB + Kùzu
  3. Performs a real vector search via QueryEngine.search()
  4. Makes a real Cypher query via QueryEngine.query_graph()
  5. Performs hybrid_search() — both at once

Requires: lancedb, kuzu, sentence-transformers (all in venv).
Execution time: ~10–15 seconds (MiniLM model loading + indexing).
"""
import os
import pytest


BACKEND_PY_FILES = {
    "auth_service.py": """
class AuthService:
    \"\"\"Handles user authentication and JWT tokens.\"\"\"

    def authenticate(self, username: str, password: str) -> bool:
        return self._verify_password(username, password)

    def _verify_password(self, username: str, password: str) -> bool:
        hashed = self._hash(password)
        return hashed == self._db_lookup(username)

    def issue_token(self, user_id: int) -> str:
        return f"jwt.{user_id}.signed"
""",
    "payment_gateway.py": """
class PaymentGateway:
    \"\"\"Processes payments via Stripe API.\"\"\"

    def charge(self, amount: float, card_token: str) -> dict:
        return {"status": "ok", "charge_id": "ch_001"}

    def refund(self, charge_id: str) -> bool:
        return True

def validate_card(token: str) -> bool:
    return token.startswith("tok_")
""",
    "database_pool.py": """
class DatabasePool:
    \"\"\"SQLite connection pool with thread safety.\"\"\"

    def __init__(self, db_path: str):
        self.db_path = db_path
        self._connections = []

    def get_connection(self):
        if self._connections:
            return self._connections.pop()
        return self._create_connection()

    def _create_connection(self):
        import sqlite3
        return sqlite3.connect(self.db_path)

def migrate_schema(conn) -> None:
    conn.execute("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT)")
""",
    "cache_layer.py": """
class RedisCache:
    \"\"\"Redis-backed cache with TTL support.\"\"\"

    def set(self, key: str, value: str, ttl: int = 300) -> None:
        pass

    def get(self, key: str) -> str | None:
        return None

    def invalidate(self, pattern: str) -> int:
        return 0

def make_cache_key(*parts: str) -> str:
    return ":".join(parts)
""",
}


@pytest.fixture(scope="session")
def indexed_workspace(tmp_path_factory):
    """
    Creates a temporary workspace with Python files and builds a real graph.
    scope=session — we build the graph once for the entire test session (~5 sec for MiniLM loading).
    """
    workspace = tmp_path_factory.mktemp("morphs_test_workspace")
    backend_dir = workspace / "backend"
    backend_dir.mkdir()

    # Write real Python files
    for filename, content in BACKEND_PY_FILES.items():
        (backend_dir / filename).write_text(content.strip(), encoding="utf-8")

    # Build the real graph — AST parsing + LanceDB + Kùzu
    # MiniLM takes ~5 seconds to load, this is normal
    from core.graph_rag import CodeLensMorph
    morph = CodeLensMorph(str(workspace))
    morph.build_graph()

    # Ensure LanceDB is actually populated before any tests
    tables_resp = morph.lance_db.list_tables()
    # list_tables() returns ListTablesResponse, we extract the list of names
    table_names = tables_resp.tables if hasattr(tables_resp, "tables") else list(tables_resp)
    assert "code_index" in table_names, (
        f"build_graph() did not create 'code_index' in LanceDB. "
        f"Tables: {table_names}. "
        f"Check: pip install sentence-transformers"
    )

    return str(workspace)


class TestQueryEngineIntegration:
    """Real E2E tests for QueryEngine with a populated DB."""

    def test_vector_search_returns_results(self, indexed_workspace):
        """Semantic search should find real nodes from the indexed code."""
        from core.query_engine import QueryEngine
        engine = QueryEngine(indexed_workspace)

        results = engine.search("user authentication password", limit=5)
        assert len(results) > 0, "Vector search returned no results — LanceDB is not populated"

    def test_vector_search_scores_are_valid(self, indexed_workspace):
        """Score should be in the range [0, 1]."""
        from core.query_engine import QueryEngine
        engine = QueryEngine(indexed_workspace)

        results = engine.search("payment gateway stripe", limit=5)
        for r in results:
            assert 0.0 <= r.score <= 1.0, f"Score out of range: {r.score}"

    def test_vector_search_finds_auth_class(self, indexed_workspace):
        """A query for 'authentication' should find AuthService."""
        from core.query_engine import QueryEngine
        engine = QueryEngine(indexed_workspace)

        results = engine.search("authentication login", limit=10)
        texts = [r.text.lower() for r in results]
        # AuthService should be among the top relevant results
        assert any("auth" in t for t in texts), (
            f"AuthService not found for query 'authentication'. Texts: {texts}"
        )

    def test_vector_search_finds_payment_class(self, indexed_workspace):
        """A query about payment should find PaymentGateway."""
        from core.query_engine import QueryEngine
        engine = QueryEngine(indexed_workspace)

        results = engine.search("payment charge card token", limit=10)
        texts = [r.text.lower() for r in results]
        assert any("payment" in t for t in texts), (
            f"PaymentGateway not found. Texts: {texts}"
        )

    def test_vector_search_finds_database_class(self, indexed_workspace):
        """A query about DB should find DatabasePool."""
        from core.query_engine import QueryEngine
        engine = QueryEngine(indexed_workspace)

        results = engine.search("database connection pool sqlite", limit=10)
        texts = [r.text.lower() for r in results]
        assert any("database" in t or "pool" in t for t in texts), (
            f"DatabasePool not found. Texts: {texts}"
        )

    def test_vector_result_has_correct_type(self, indexed_workspace):
        """Results should have type 'class' or 'function'."""
        from core.query_engine import QueryEngine
        engine = QueryEngine(indexed_workspace)

        results = engine.search("authenticate user", limit=10)
        assert len(results) > 0
        valid_types = {"class", "function", "error"}
        for r in results:
            assert r.type in valid_types, f"Unexpected type: {r.type}"

    def test_vector_result_has_path(self, indexed_workspace):
        """Results should have a file path."""
        from core.query_engine import QueryEngine
        engine = QueryEngine(indexed_workspace)

        results = engine.search("cache redis ttl", limit=5)
        for r in results:
            assert r.path, "The path field is empty"
            assert ".py" in r.path, f"Expected a .py file, but got: {r.path}"

    def test_graph_query_returns_classes(self, indexed_workspace):
        """Kùzu graph should return classes from the indexed files."""
        from core.query_engine import QueryEngine
        engine = QueryEngine(indexed_workspace)

        result = engine.query_graph(
            "MATCH (f:File)-[:CONTAINS_CLASS]->(c:ClassNode) RETURN f.path, c.name"
        )
        assert len(result.rows) > 0, "Kùzu graph did not return classes"
        # All 4 of our classes should be in the graph
        class_names = [row[1] for row in result.rows]
        assert "AuthService" in class_names, f"AuthService not in graph. Found: {class_names}"
        assert "PaymentGateway" in class_names, f"PaymentGateway not in graph. Found: {class_names}"

    def test_graph_query_returns_functions(self, indexed_workspace):
        """Kùzu graph should return functions."""
        from core.query_engine import QueryEngine
        engine = QueryEngine(indexed_workspace)

        result = engine.query_graph(
            "MATCH (f:File)-[:CONTAINS_FUNC]->(fn:FuncNode) RETURN f.path, fn.name"
        )
        assert len(result.rows) > 0, "Kùzu graph did not return functions"
        func_names = [row[1] for row in result.rows]
        assert "validate_card" in func_names, f"validate_card not in graph. Found: {func_names}"

    def test_graph_query_columns(self, indexed_workspace):
        """Kùzu should return column names."""
        from core.query_engine import QueryEngine
        engine = QueryEngine(indexed_workspace)

        result = engine.query_graph(
            "MATCH (f:File)-[:CONTAINS_CLASS]->(c:ClassNode) RETURN f.path, c.name"
        )
        assert len(result.columns) == 2

    def test_hybrid_search_combines_results(self, indexed_workspace):
        """hybrid_search should return both vector and graph results."""
        from core.query_engine import QueryEngine
        engine = QueryEngine(indexed_workspace)

        result = engine.hybrid_search("authentication", limit=5)
        assert len(result.vector_results) > 0, "Hybrid search: no vector results"
        assert len(result.graph_results) > 0, "Hybrid search: no graph results"

    def test_hybrid_to_prompt_context_is_filled(self, indexed_workspace):
        """to_prompt_context() should return a non-empty string with real data."""
        from core.query_engine import QueryEngine
        engine = QueryEngine(indexed_workspace)

        result = engine.hybrid_search("database pool connection", limit=5)
        ctx = result.to_prompt_context()

        assert "LanceDB" in ctx, "Context does not contain LanceDB section"
        assert "Kùzu" in ctx or "Kuzu" in ctx.replace("ù", "u"), "Context does not contain Kùzu section"
        assert len(ctx) > 100, f"Context is too short: {len(ctx)} characters"

    def test_search_experience_empty_but_no_crash(self, indexed_workspace):
        """search_experience without Atropos data — should return [] without exceptions."""
        from core.query_engine import QueryEngine
        engine = QueryEngine(indexed_workspace)

        results = engine.search_experience("ImportError: module not found")
        assert isinstance(results, list)

    def test_results_sorted_by_score_descending(self, indexed_workspace):
        """Results should be sorted by score in descending order."""
        from core.query_engine import QueryEngine
        engine = QueryEngine(indexed_workspace)

        results = engine.search("user service class", limit=10)
        if len(results) > 1:
            scores = [r.score for r in results]
            assert scores == sorted(scores, reverse=True), (
                f"Results are not sorted: {scores}"
            )
