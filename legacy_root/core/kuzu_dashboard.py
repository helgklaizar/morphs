"""
kuzu_dashboard.py — REST API for the Kùzu graph visualization dashboard.

Endpoints:
  GET  /api/v1/kuzu/graph        — nodes + edges in D3 format (nodes/links)
  GET  /api/v1/kuzu/stats        — statistics: number of files, classes, functions
  POST /api/v1/kuzu/rebuild      — rebuild the graph from the workspace
  GET  /api/v1/kuzu/export/json  — full graph export to JSON
  GET  /api/v1/kuzu/export/csv   — export edges to CSV
  GET  /api/v1/kuzu/search       — search nodes by name (?q=)

Used in the ui/ React dashboard via a FastAPI router.
"""

from __future__ import annotations

import csv
import io
import json
import os
from typing import Any, Dict, List, Optional

import kuzu
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse, StreamingResponse

from core.logger import logger

router = APIRouter(prefix="/api/v1/kuzu", tags=["kuzu-dashboard"])

# ─── Shared DB connection ────────────────────────────────────────────────────
_KUZU_PATH = os.path.join(os.path.dirname(__file__), ".kuzu_graph")


def _get_conn() -> kuzu.Connection:
    db = kuzu.Database(_KUZU_PATH)
    return kuzu.Connection(db)


# ─── Helpers ─────────────────────────────────────────────────────────────────
def _fetch_all(conn: kuzu.Connection, query: str, params: Dict = None) -> List[List[Any]]:
    res = conn.execute(query, parameters=params or {})
    rows: List[List[Any]] = []
    while res.has_next():
        rows.append(res.get_next())
    return rows


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/graph")
def get_graph() -> JSONResponse:
    """
    Returns the graph in D3 Force-directed format:
    { nodes: [{id, label, type, group}], links: [{source, target, type}] }
    """
    conn = _get_conn()
    nodes: List[Dict] = []
    links: List[Dict] = []
    seen_nodes: set = set()

    def _add_node(node_id: str, label: str, node_type: str, group: int) -> None:
        if node_id not in seen_nodes:
            seen_nodes.add(node_id)
            nodes.append({"id": node_id, "label": label, "type": node_type, "group": group})

    try:
        # Files
        for (path, lang) in _fetch_all(conn, "MATCH (f:File) RETURN f.path, f.lang"):
            _add_node(f"file::{path}", path.split("/")[-1], "file", 1)

        # Classes
        for (name, fpath) in _fetch_all(conn, "MATCH (c:ClassNode) RETURN c.name, c.file_path"):
            _add_node(f"class::{name}", name, "class", 2)

        # Functions
        for (name, fpath) in _fetch_all(conn, "MATCH (fn:FuncNode) RETURN fn.name, fn.file_path"):
            _add_node(f"func::{name}", name, "function", 3)

        # Edges: File → Class
        for (fpath, cname) in _fetch_all(
            conn,
            "MATCH (f:File)-[:CONTAINS_CLASS]->(c:ClassNode) RETURN f.path, c.name"
        ):
            links.append({"source": f"file::{fpath}", "target": f"class::{cname}", "type": "CONTAINS_CLASS"})

        # Edges: File → Function
        for (fpath, fname) in _fetch_all(
            conn,
            "MATCH (f:File)-[:CONTAINS_FUNC]->(fn:FuncNode) RETURN f.path, fn.name"
        ):
            links.append({"source": f"file::{fpath}", "target": f"func::{fname}", "type": "CONTAINS_FUNC"})

    except Exception as e:
        logger.error(f"[KuzuDashboard] Error requesting graph: {e}", exc_info=True)
        return JSONResponse({"error": str(e)}, status_code=500)

    logger.info(f"[KuzuDashboard] Graph: {len(nodes)} nodes, {len(links)} edges → sent to UI")
    return JSONResponse({"nodes": nodes, "links": links})


@router.get("/stats")
def get_stats() -> JSONResponse:
    """Graph node statistics."""
    conn = _get_conn()
    try:
        files     = _fetch_all(conn, "MATCH (f:File) RETURN count(f)")
        classes   = _fetch_all(conn, "MATCH (c:ClassNode) RETURN count(c)")
        functions = _fetch_all(conn, "MATCH (fn:FuncNode) RETURN count(fn)")
        edges     = _fetch_all(conn, "MATCH ()-[e]->() RETURN count(e)")

        return JSONResponse({
            "files":     files[0][0] if files else 0,
            "classes":   classes[0][0] if classes else 0,
            "functions": functions[0][0] if functions else 0,
            "edges":     edges[0][0] if edges else 0,
        })
    except Exception as e:
        logger.error(f"[KuzuDashboard] stats error: {e}", exc_info=True)
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("/rebuild")
def rebuild_graph(workspace: Optional[str] = None) -> JSONResponse:
    """
    Rebuilds the graph from workspace files.
    workspace — path to the directory; defaults to the current cwd.
    """
    ws = workspace or os.getcwd()
    try:
        from core.graph_rag import CodeLensMorph
        lens = CodeLensMorph(ws)
        lens.build_graph()
        logger.info(f"[KuzuDashboard] Graph rebuilt from: {ws}")
        return JSONResponse({"status": "rebuilt", "workspace": ws})
    except Exception as e:
        logger.error(f"[KuzuDashboard] rebuild error: {e}", exc_info=True)
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/export/json")
def export_json() -> JSONResponse:
    """Full JSON export of all nodes and edges."""
    conn = _get_conn()
    try:
        data: Dict[str, List] = {"files": [], "classes": [], "functions": [], "edges_class": [], "edges_func": []}
        data["files"]       = [{"path": r[0], "lang": r[1]} for r in _fetch_all(conn, "MATCH (f:File) RETURN f.path, f.lang")]
        data["classes"]     = [{"name": r[0], "file": r[1]} for r in _fetch_all(conn, "MATCH (c:ClassNode) RETURN c.name, c.file_path")]
        data["functions"]   = [{"name": r[0], "file": r[1]} for r in _fetch_all(conn, "MATCH (fn:FuncNode) RETURN fn.name, fn.file_path")]
        data["edges_class"] = [{"from": r[0], "to": r[1]} for r in _fetch_all(conn, "MATCH (f:File)-[:CONTAINS_CLASS]->(c:ClassNode) RETURN f.path, c.name")]
        data["edges_func"]  = [{"from": r[0], "to": r[1]} for r in _fetch_all(conn, "MATCH (f:File)-[:CONTAINS_FUNC]->(fn:FuncNode) RETURN f.path, fn.name")]
        return JSONResponse(data)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/export/csv")
def export_csv() -> StreamingResponse:
    """CSV export of graph edges for Excel/DuckDB."""
    conn = _get_conn()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["source_type", "source", "rel_type", "target_type", "target"])

    try:
        for (fpath, cname) in _fetch_all(conn, "MATCH (f:File)-[:CONTAINS_CLASS]->(c:ClassNode) RETURN f.path, c.name"):
            writer.writerow(["File", fpath, "CONTAINS_CLASS", "ClassNode", cname])
        for (fpath, fname) in _fetch_all(conn, "MATCH (f:File)-[:CONTAINS_FUNC]->(fn:FuncNode) RETURN f.path, fn.name"):
            writer.writerow(["File", fpath, "CONTAINS_FUNC", "FuncNode", fname])
    except Exception as e:
        writer.writerow(["ERROR", str(e), "", "", ""])

    output.seek(0)
    return StreamingResponse(
        iter([output.read()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=kuzu_graph.csv"}
    )


@router.get("/search")
def search_nodes(q: str = Query(..., min_length=1)) -> JSONResponse:
    """Search for nodes by a part of their name."""
    conn = _get_conn()
    results: List[Dict] = []
    try:
        pattern = f"%{q}%"
        for (name, fpath) in _fetch_all(conn, "MATCH (c:ClassNode) WHERE c.name CONTAINS $q RETURN c.name, c.file_path", {"q": q}):
            results.append({"type": "class", "name": name, "file": fpath})
        for (name, fpath) in _fetch_all(conn, "MATCH (fn:FuncNode) WHERE fn.name CONTAINS $q RETURN fn.name, fn.file_path", {"q": q}):
            results.append({"type": "function", "name": name, "file": fpath})
        for (path, lang) in _fetch_all(conn, "MATCH (f:File) WHERE f.path CONTAINS $q RETURN f.path, f.lang", {"q": q}):
            results.append({"type": "file", "name": path, "file": path, "lang": lang})
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

    return JSONResponse({"query": q, "results": results, "count": len(results)})
