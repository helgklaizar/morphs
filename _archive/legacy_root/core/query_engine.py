"""
QueryEngine — Task 5: Unified facade for LanceDB (vectors) + Kùzu (graph).

Unifies RAG queries under a single interface, so that upstream code
does not depend on the specific lancedb/kuzu SDKs.

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
    score: float  # 1.0 = perfect match, 0.0 = not similar


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
        """Serializes hybrid results into a text context for an LLM prompt."""
        lines: list[str] = []

        if self.vector_results:
            lines.append("=== SEMANTICALLY SIMILAR NODES (LanceDB) ===")
            for r in self.vector_results:
                lines.append(f"[{r.type.upper()}] {r.text}  (score={r.score:.2f}, path={r.path})")
            lines.append("")

        if self.graph_results:
            lines.append("=== DEPENDENCY GRAPH (Kùzu) ===")
            header = " | ".join(self.graph_columns)
            lines.append(header)
            lines.append("-" * len(header))
            for row in self.graph_results:
                lines.append(" | ".join(str(c) for c in row))

        return "\n".join(lines) if lines else "Context not found."


class QueryEngine:
    """
    Unified facade for all queries to the project's knowledge bases.

    Internally, it coordinates:
    - LanceDB: semantic vector search over code (sentence-transformers).
    - Kùzu DB: structured queries to the dependency graph (Cypher-like language).

    Lazy initialization: connects to databases only on the first request.
    """

    def __init__(self, workspace_path: str):
        self.workspace_path = workspace_path
        self._lancedb_path = os.path.join(workspace_path, ".lancedb")
        self._kuzu_path = os.path.join(workspace_path, ".kuzu_graph")

        self._lance_db = None
        self._kuzu_conn = None
        self._embed_model = None

    # ------------------------------------------------------------------
    # Internal lazy connectors
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
    # Public API
    # ------------------------------------------------------------------

    def search(self, query: str, limit: int = 5, table_name: str = "code_index") -> list[VectorResult]:
        """
        Semantic vector search over LanceDB.

        Args:
            query: The text query.
            limit: The maximum number of results.
            table_name: The name of the table in LanceDB (default is "code_index").

        Returns:
            A list of VectorResult, sorted by descending relevance.
        """
        try:
            db = self._get_lance_db()
            tables = db.list_tables().tables
            if table_name not in tables:
                logger.warning(f"[QueryEngine] Table '{table_name}' not found in LanceDB. Run CodeLensMorph.build_graph() first.")
                return []

            vector = self._embed(query)
            table = db.open_table(table_name)
            df = table.search(vector).limit(limit).to_pandas()

            results: list[VectorResult] = []
            if df.empty:
                logger.warning(f"[QueryEngine] Vector search returned an empty DataFrame for '{query}'. Table '{table_name}' contains {table.to_pandas().shape[0]} rows.")
                
            for _, row in df.iterrows():
                # For PyArrow, row can be a Series to which getattr cannot be applied, so we use .get() 
                distance = float(row.get("_distance", 1.0))
                score = max(0.0, 1.0 - distance)
                results.append(VectorResult(
                    text=str(row.get("text", "")),
                    type=str(row.get("type", "unknown")),
                    path=str(row.get("path", "")),
                    score=score,
                ))

            logger.info(f"[QueryEngine] Vector search: {len(results)} results for query '{query[:60]}'")
            return results

        except Exception as e:
            logger.error(f"[QueryEngine] Vector search error: {e}", exc_info=True)
            raise

    def query_graph(self, cypher: str, parameters: Optional[dict] = None) -> GraphResult:
        """
        Executes a Cypher query against the Kùzu graph database.

        Args:
            cypher: A Kùzu Cypher query, for example:
                    "MATCH (f:File)-[:CONTAINS_CLASS]->(c) RETURN f.path, c.name LIMIT 20"
            parameters: Query parameters (a dictionary).

        Returns:
            A GraphResult with column names and result rows.
        """
        try:
            conn = self._get_kuzu_conn()
            res = conn.execute(cypher, parameters=parameters or {})

            columns: list[str] = res.get_column_names() if hasattr(res, "get_column_names") else []
            rows: list[list] = []

            while res.has_next():
                rows.append(res.get_next())

            logger.info(f"[QueryEngine] Graph query returned {len(rows)} rows.")
            return GraphResult(columns=columns, rows=rows)

        except Exception as e:
            logger.error(f"[QueryEngine] Kùzu query error: {e}", exc_info=True)
            raise

    def hybrid_search(
        self,
        query: str,
        limit: int = 5,
        graph_cypher: Optional[str] = None,
    ) -> HybridResult:
        """
        Hybrid search: vector + graph simultaneously.

        By default, the graph query returns the top 20 files with their classes.
        A custom `graph_cypher` can be passed for specific needs.

        Args:
            query: The text query.
            limit: The limit for vector results.
            graph_cypher: An optional Cypher query. If None, a default one is used.

        Returns:
            A HybridResult with the combined data.
        """
        result = HybridResult()

        # 1. Vector search
        try:
            result.vector_results = self.search(query, limit=limit)
        except Exception as e:
            logger.error(f"[QueryEngine] Hybrid: vector search failed: {e}")

        # 2. Graph query
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
        Specialized search through Atropos Experience (RL error memory).

        Searches the 'atropos_experience' table for patterns similar to the current error.

        Args:
            error_query: A string with an error description or traceback.
            limit: The number of relevant memories.

        Returns:
            A list of VectorResult (text field = error, path field = the recorded patch).
        """
        try:
            db = self._get_lance_db()
            tables = db.list_tables().tables
            if "atropos_experience" not in tables:
                return []

            vector = self._embed(error_query)
            table = db.open_table("atropos_experience")
            df = table.search(vector).limit(limit).to_pandas()

            # Only positive experiences (reward > 0)
            df = df[df["reward"] > 0] if "reward" in df.columns else df

            results: list[VectorResult] = []
            for _, row in df.iterrows():
                distance = float(getattr(row, "_distance", 1.0))
                results.append(VectorResult(
                    text=str(row.get("error", "")),
                    type="atropos_experience",
                    path=str(row.get("fixed_code", ""))[:200],  # patch as "path"
                    score=max(0.0, 1.0 - distance),
                ))
            return results

        except Exception as e:
            logger.error(f"[QueryEngine] Error searching in Atropos Experience: {e}", exc_info=True)
            return []