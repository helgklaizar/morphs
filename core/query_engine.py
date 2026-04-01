"""
QueryEngine — Задача 5: Единый фасад LanceDB (вектора) + Kùzu (граф).

Унифицирует RAG-запросы под один интерфейс, чтобы вышестоящий код
не зависел от конкретных SDK lancedb/kuzu.

API:
    engine = QueryEngine(workspace_path)
    results = engine.search("FastAPI router pattern", limit=5)
    triples = engine.query_graph("MATCH (f:File)-[:CONTAINS_CLASS]->(c) RETURN f.path, c.name")
    combined = engine.hybrid_search("authentication middleware", limit=10)
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Optional
from core.logger import logger


@dataclass
class VectorResult:
    text: str
    type: str
    path: str
    score: float  # 1.0 = идеально близко, 0.0 = не похоже


@dataclass
class GraphResult:
    columns: list[str]
    rows: list[list]


@dataclass
class HybridResult:
    vector_results: list[VectorResult] = field(default_factory=list)
    graph_results: list[list] = field(default_factory=list)
    graph_columns: list[str] = field(default_factory=list)

    def to_prompt_context(self) -> str:
        """Сериализует гибридные результаты в текстовый контекст для LLM-промпта."""
        lines: list[str] = []

        if self.vector_results:
            lines.append("=== СЕМАНТИЧЕСКИ ПОХОЖИЕ УЗЛЫ (LanceDB) ===")
            for r in self.vector_results:
                lines.append(f"[{r.type.upper()}] {r.text}  (score={r.score:.2f}, path={r.path})")
            lines.append("")

        if self.graph_results:
            lines.append("=== ГРАФ ЗАВИСИМОСТЕЙ (Kùzu) ===")
            header = " | ".join(self.graph_columns)
            lines.append(header)
            lines.append("-" * len(header))
            for row in self.graph_results:
                lines.append(" | ".join(str(c) for c in row))

        return "\n".join(lines) if lines else "Контекст не найден."


class QueryEngine:
    """
    Единый фасад для всех запросов к базам знаний проекта.

    Внутри координирует:
    - LanceDB: семантический векторный поиск по коду (sentence-transformers).
    - Kùzu DB: структурированные запросы к графу зависимостей (Cypher-подобный язык).

    Lazy-инициализация: подключается к базам только при первом запросе.
    """

    def __init__(self, workspace_path: str):
        self.workspace_path = workspace_path
        self._lancedb_path = os.path.join(workspace_path, ".lancedb")
        self._kuzu_path = os.path.join(workspace_path, ".kuzu_graph")

        self._lance_db = None
        self._kuzu_conn = None
        self._embed_model = None

    # ------------------------------------------------------------------
    # Внутренние lazy-коннекторы
    # ------------------------------------------------------------------

    def _get_lance_db(self):
        if self._lance_db is None:
            import lancedb
            os.makedirs(self._lancedb_path, exist_ok=True)
            self._lance_db = lancedb.connect(self._lancedb_path)
            logger.debug("[QueryEngine] LanceDB connected.")
        return self._lance_db

    def _get_kuzu_conn(self):
        if self._kuzu_conn is None:
            import kuzu
            db = kuzu.Database(self._kuzu_path)
            self._kuzu_conn = kuzu.Connection(db)
            logger.debug("[QueryEngine] Kùzu connected.")
        return self._kuzu_conn

    def _get_embed_model(self):
        if self._embed_model is None:
            from sentence_transformers import SentenceTransformer
            self._embed_model = SentenceTransformer("all-MiniLM-L6-v2")
            logger.debug("[QueryEngine] Embedding model loaded.")
        return self._embed_model

    def _embed(self, text: str) -> list[float]:
        return self._get_embed_model().encode(text).tolist()

    # ------------------------------------------------------------------
    # Публичный API
    # ------------------------------------------------------------------

    def search(self, query: str, limit: int = 5, table_name: str = "code_index") -> list[VectorResult]:
        """
        Семантический векторный поиск по LanceDB.

        Args:
            query: Текстовый запрос.
            limit: Максимальное количество результатов.
            table_name: Имя таблицы в LanceDB (по умолчанию "code_index").

        Returns:
            Список VectorResult, отсортированных по убыванию релевантности.
        """
        try:
            db = self._get_lance_db()
            tables = db.list_tables().tables
            if table_name not in tables:
                logger.warning(f"[QueryEngine] Таблица '{table_name}' не найдена в LanceDB. Запустите CodeLensMorph.build_graph() первым.")
                return []

            vector = self._embed(query)
            table = db.open_table(table_name)
            df = table.search(vector).limit(limit).to_pandas()

            results: list[VectorResult] = []
            if df.empty:
                logger.warning(f"[QueryEngine] Векторный поиск вернул пустой DataFrame для '{query}'. Таблица '{table_name}' содержит {table.to_pandas().shape[0]} строк.")
                
            for _, row in df.iterrows():
                # У PyArrow row может быть Series, к которой нельзя применять getattr, используем .get() 
                distance = float(row.get("_distance", 1.0))
                score = max(0.0, 1.0 - distance)
                results.append(VectorResult(
                    text=str(row.get("text", "")),
                    type=str(row.get("type", "unknown")),
                    path=str(row.get("path", "")),
                    score=score,
                ))

            logger.info(f"[QueryEngine] Векторный поиск: {len(results)} результатов для запроса '{query[:60]}'")
            return results

        except Exception as e:
            logger.error(f"[QueryEngine] Ошибка векторного поиска: {e}", exc_info=True)
            raise

    def query_graph(self, cypher: str, parameters: Optional[dict] = None) -> GraphResult:
        """
        Выполняет Cypher-запрос к Kùzu граф-базе.

        Args:
            cypher: Kùzu Cypher-запрос, например:
                    "MATCH (f:File)-[:CONTAINS_CLASS]->(c) RETURN f.path, c.name LIMIT 20"
            parameters: Параметры запроса (словарь).

        Returns:
            GraphResult с именами колонок и строками результата.
        """
        try:
            conn = self._get_kuzu_conn()
            res = conn.execute(cypher, parameters=parameters or {})

            columns: list[str] = res.get_column_names() if hasattr(res, "get_column_names") else []
            rows: list[list] = []

            while res.has_next():
                rows.append(res.get_next())

            logger.info(f"[QueryEngine] Граф-запрос вернул {len(rows)} строк.")
            return GraphResult(columns=columns, rows=rows)

        except Exception as e:
            logger.error(f"[QueryEngine] Ошибка Kùzu запроса: {e}", exc_info=True)
            raise

    def hybrid_search(
        self,
        query: str,
        limit: int = 5,
        graph_cypher: Optional[str] = None,
    ) -> HybridResult:
        """
        Гибридный поиск: векторный + граф одновременно.

        По умолчанию граф-запрос возвращает топ-20 файлов с их классами.
        Можно передать собственный `graph_cypher` для специфических нужд.

        Args:
            query: Текстовый запрос.
            limit: Лимит векторных результатов.
            graph_cypher: Опциональный Cypher-запрос. Если None — используется дефолтный.

        Returns:
            HybridResult со скомбинированными данными.
        """
        result = HybridResult()

        # 1. Векторный поиск
        try:
            result.vector_results = self.search(query, limit=limit)
        except Exception as e:
            logger.error(f"[QueryEngine] Hybrid: vector search failed: {e}")

        # 2. Граф-запрос
        try:
            cypher = graph_cypher or (
                "MATCH (f:File)-[:CONTAINS_CLASS]->(c:ClassNode) "
                "RETURN f.path, c.name "
                "ORDER BY f.path "
                "LIMIT 20"
            )
            graph = self.query_graph(cypher)
            result.graph_columns = graph.columns
            result.graph_results = graph.rows
        except Exception as e:
            logger.error(f"[QueryEngine] Hybrid: graph query failed: {e}")

        return result

    def search_experience(self, error_query: str, limit: int = 5) -> list[VectorResult]:
        """
        Специализированный поиск по Atropos Experience (RL-память ошибок).

        Ищет в таблице 'atropos_experience' паттерны, близкие к текущей ошибке.

        Args:
            error_query: Строка с описанием ошибки или трейсбэком.
            limit: Количество релевантных воспоминаний.

        Returns:
            Список VectorResult (поле text = ошибка, поле path = зафиксированный патч).
        """
        try:
            db = self._get_lance_db()
            tables = db.list_tables().tables
            if "atropos_experience" not in tables:
                return []

            vector = self._embed(error_query)
            table = db.open_table("atropos_experience")
            df = table.search(vector).limit(limit).to_pandas()

            # Только положительные опыты (reward > 0)
            df = df[df["reward"] > 0] if "reward" in df.columns else df

            results: list[VectorResult] = []
            for _, row in df.iterrows():
                distance = float(getattr(row, "_distance", 1.0))
                results.append(VectorResult(
                    text=str(row.get("error", "")),
                    type="atropos_experience",
                    path=str(row.get("fixed_code", ""))[:200],  # патч как "путь"
                    score=max(0.0, 1.0 - distance),
                ))
            return results

        except Exception as e:
            logger.error(f"[QueryEngine] Ошибка поиска в Atropos Experience: {e}", exc_info=True)
            return []
