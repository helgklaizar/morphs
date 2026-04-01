"""
Интеграционный тест QueryEngine + CodeLensMorph.

РЕАЛЬНЫЙ E2E:
  1. Создаёт временную директорию с Python-файлами в backend/
  2. Запускает CodeLensMorph.build_graph() — реальный AST-парсинг + запись в LanceDB + Kùzu
  3. Делает реальный векторный поиск через QueryEngine.search()
  4. Делает реальный Cypher-запрос через QueryEngine.query_graph()
  5. Делает hybrid_search() — оба сразу

Требует: lancedb, kuzu, sentence-transformers (все в venv).
Время выполнения: ~10–15 секунд (загрузка MiniLM модели + индексация).
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
    Создаёт временный workspace с Python-файлами и строит реальный граф.
    scope=session — строим граф один раз на всю test-сессию (~5 сек на загрузку MiniLM).
    """
    workspace = tmp_path_factory.mktemp("morphs_test_workspace")
    backend_dir = workspace / "backend"
    backend_dir.mkdir()

    # Пишем реальные Python-файлы
    for filename, content in BACKEND_PY_FILES.items():
        (backend_dir / filename).write_text(content.strip(), encoding="utf-8")

    # Строим реальный граф — AST парсинг + LanceDB + Kùzu
    # MiniLM загружается ~5 секунд, это нормально
    from core.graph_rag import CodeLensMorph
    morph = CodeLensMorph(str(workspace))
    morph.build_graph()

    # Убеждаемся что LanceDB реально заполнена перед любыми тестами
    tables_resp = morph.lance_db.list_tables()
    # list_tables() возвращает ListTablesResponse, извлекаем список имён
    table_names = tables_resp.tables if hasattr(tables_resp, "tables") else list(tables_resp)
    assert "code_index" in table_names, (
        f"build_graph() не создал 'code_index' в LanceDB. "
        f"Таблицы: {table_names}. "
        f"Проверь: pip install sentence-transformers"
    )

    return str(workspace)


class TestQueryEngineIntegration:
    """Реальные E2E тесты QueryEngine с заполненной БД."""

    def test_vector_search_returns_results(self, indexed_workspace):
        """Семантический поиск должен найти реальные узлы из проиндексированного кода."""
        from core.query_engine import QueryEngine
        engine = QueryEngine(indexed_workspace)

        results = engine.search("user authentication password", limit=5)
        assert len(results) > 0, "Векторный поиск не вернул результатов — LanceDB не заполнена"

    def test_vector_search_scores_are_valid(self, indexed_workspace):
        """Score должен быть в диапазоне [0, 1]."""
        from core.query_engine import QueryEngine
        engine = QueryEngine(indexed_workspace)

        results = engine.search("payment gateway stripe", limit=5)
        for r in results:
            assert 0.0 <= r.score <= 1.0, f"Score вне диапазона: {r.score}"

    def test_vector_search_finds_auth_class(self, indexed_workspace):
        """Запрос 'authentication' должен найти AuthService."""
        from core.query_engine import QueryEngine
        engine = QueryEngine(indexed_workspace)

        results = engine.search("authentication login", limit=10)
        texts = [r.text.lower() for r in results]
        # AuthService должен попасть в топ релевантных результатов
        assert any("auth" in t for t in texts), (
            f"AuthService не найден по запросу 'authentication'. Тексты: {texts}"
        )

    def test_vector_search_finds_payment_class(self, indexed_workspace):
        """Запрос по оплате должен найти PaymentGateway."""
        from core.query_engine import QueryEngine
        engine = QueryEngine(indexed_workspace)

        results = engine.search("payment charge card token", limit=10)
        texts = [r.text.lower() for r in results]
        assert any("payment" in t for t in texts), (
            f"PaymentGateway не найден. Тексты: {texts}"
        )

    def test_vector_search_finds_database_class(self, indexed_workspace):
        """Запрос по БД должен найти DatabasePool."""
        from core.query_engine import QueryEngine
        engine = QueryEngine(indexed_workspace)

        results = engine.search("database connection pool sqlite", limit=10)
        texts = [r.text.lower() for r in results]
        assert any("database" in t or "pool" in t for t in texts), (
            f"DatabasePool не найден. Тексты: {texts}"
        )

    def test_vector_result_has_correct_type(self, indexed_workspace):
        """Результаты должны иметь type 'class' или 'function'."""
        from core.query_engine import QueryEngine
        engine = QueryEngine(indexed_workspace)

        results = engine.search("authenticate user", limit=10)
        assert len(results) > 0
        valid_types = {"class", "function", "error"}
        for r in results:
            assert r.type in valid_types, f"Неожиданный тип: {r.type}"

    def test_vector_result_has_path(self, indexed_workspace):
        """Результаты должны иметь путь к файлу."""
        from core.query_engine import QueryEngine
        engine = QueryEngine(indexed_workspace)

        results = engine.search("cache redis ttl", limit=5)
        for r in results:
            assert r.path, "Поле path пустое"
            assert ".py" in r.path, f"Ожидался .py файл, получен: {r.path}"

    def test_graph_query_returns_classes(self, indexed_workspace):
        """Kùzu граф должен вернуть классы из проиндексированных файлов."""
        from core.query_engine import QueryEngine
        engine = QueryEngine(indexed_workspace)

        result = engine.query_graph(
            "MATCH (f:File)-[:CONTAINS_CLASS]->(c:ClassNode) RETURN f.path, c.name"
        )
        assert len(result.rows) > 0, "Kùzu граф не вернул классы"
        # Все 4 наших класса должны быть в графе
        class_names = [row[1] for row in result.rows]
        assert "AuthService" in class_names, f"AuthService не в графе. Нашли: {class_names}"
        assert "PaymentGateway" in class_names, f"PaymentGateway не в графе. Нашли: {class_names}"

    def test_graph_query_returns_functions(self, indexed_workspace):
        """Kùzu граф должен вернуть функции."""
        from core.query_engine import QueryEngine
        engine = QueryEngine(indexed_workspace)

        result = engine.query_graph(
            "MATCH (f:File)-[:CONTAINS_FUNC]->(fn:FuncNode) RETURN f.path, fn.name"
        )
        assert len(result.rows) > 0, "Kùzu граф не вернул функции"
        func_names = [row[1] for row in result.rows]
        assert "validate_card" in func_names, f"validate_card не в графе. Нашли: {func_names}"

    def test_graph_query_columns(self, indexed_workspace):
        """Kùzu должен вернуть имена колонок."""
        from core.query_engine import QueryEngine
        engine = QueryEngine(indexed_workspace)

        result = engine.query_graph(
            "MATCH (f:File)-[:CONTAINS_CLASS]->(c:ClassNode) RETURN f.path, c.name"
        )
        assert len(result.columns) == 2

    def test_hybrid_search_combines_results(self, indexed_workspace):
        """hybrid_search должен вернуть и векторные, и граф-результаты."""
        from core.query_engine import QueryEngine
        engine = QueryEngine(indexed_workspace)

        result = engine.hybrid_search("authentication", limit=5)
        assert len(result.vector_results) > 0, "Гибридный поиск: нет векторных результатов"
        assert len(result.graph_results) > 0, "Гибридный поиск: нет граф-результатов"

    def test_hybrid_to_prompt_context_is_filled(self, indexed_workspace):
        """to_prompt_context() должен вернуть непустую строку с реальными данными."""
        from core.query_engine import QueryEngine
        engine = QueryEngine(indexed_workspace)

        result = engine.hybrid_search("database pool connection", limit=5)
        ctx = result.to_prompt_context()

        assert "LanceDB" in ctx, "Контекст не содержит секцию LanceDB"
        assert "Kùzu" in ctx or "Kuzu" in ctx.replace("ù", "u"), "Контекст не содержит секцию Kùzu"
        assert len(ctx) > 100, f"Контекст слишком короткий: {len(ctx)} символов"

    def test_search_experience_empty_but_no_crash(self, indexed_workspace):
        """search_experience без Atropos данных — должен вернуть [] без исключений."""
        from core.query_engine import QueryEngine
        engine = QueryEngine(indexed_workspace)

        results = engine.search_experience("ImportError: module not found")
        assert isinstance(results, list)

    def test_results_sorted_by_score_descending(self, indexed_workspace):
        """Результаты должны быть отсортированы по убыванию score."""
        from core.query_engine import QueryEngine
        engine = QueryEngine(indexed_workspace)

        results = engine.search("user service class", limit=10)
        if len(results) > 1:
            scores = [r.score for r in results]
            assert scores == sorted(scores, reverse=True), (
                f"Результаты не отсортированы: {scores}"
            )
