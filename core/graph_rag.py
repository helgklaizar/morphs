import os
import glob
import re
import ast
import json
import kuzu
import lancedb
from core.logger import logger

class CodeLensMorph:
    """
    Archivist Agent (Context Compression & GraphRAG).
    Replaces vector RAG (ChromaDB) and NetworkX with a hybrid of LanceDB (Vectors) + Kùzu DB (Knowledge).
    Compresses the architecture (routes, exports) into graph nodes to fit within the AI's token limits.
    """
    def __init__(self, workspace_path: str):
        self.workspace_path = workspace_path
        self.kuzu_path = os.path.join(workspace_path, ".kuzu_graph")
        self.lancedb_path = os.path.join(workspace_path, ".lancedb")
        os.makedirs(self.lancedb_path, exist_ok=True)
        
        # Connecting to the fast graph DB (C++)
        self.db = kuzu.Database(self.kuzu_path)
        self.conn = kuzu.Connection(self.db)
        
        # Connecting to LanceDB (an efficient analytical vector columnar DB)
        self.lance_db = lancedb.connect(self.lancedb_path)
        
        self._init_schema()
        
    def _init_schema(self):
        """ Initializes the structured Kùzu knowledge schema (DDL) """
        try:
            self.conn.execute("CREATE NODE TABLE File (path STRING, lang STRING, PRIMARY KEY (path))")
            self.conn.execute("CREATE NODE TABLE ClassNode (name STRING, file_path STRING, PRIMARY KEY (name))")
            self.conn.execute("CREATE NODE TABLE FuncNode (name STRING, file_path STRING, PRIMARY KEY (name))")
            self.conn.execute("CREATE REL TABLE CONTAINS_CLASS (FROM File TO ClassNode)")
            self.conn.execute("CREATE REL TABLE CONTAINS_FUNC (FROM File TO FuncNode)")
            # self.conn.execute("CREATE REL TABLE CALLS (FROM FuncNode TO FuncNode)")
        except RuntimeError:
            pass # Tables already exist
            
    def build_graph(self):
        """ Collects the physical file tree into a Kùzu graph and builds the LanceDB index """
        logger.info(f"🕸️ [CodeLens-Morph] Indexing project {self.workspace_path} to find dependencies (Kùzu + LanceDB)...")
        
        # Clearing old graph nodes: Kuzu requires specific MATCH for deletion if relationships exist
        try:
            self.conn.execute("MATCH (a)-[e]->(b) DELETE e")
            self.conn.execute("MATCH (a) DELETE a")
        except Exception as e:
            logger.error(f"⚠️ [GraphRAG] Error initializing/clearing the database: {e}", exc_info=True)
            
        context_data = []
        
        # Scanning Backend (Python AST)
        backend_files = glob.glob(os.path.join(self.workspace_path, "backend", "**", "*.py"), recursive=True)
        for path in backend_files:
            if "venv" in path or "__pycache__" in path:
                continue
                
            rel_path = os.path.relpath(path, self.workspace_path)
            self.conn.execute("MERGE (f:File {path: $p, lang: 'python'})", parameters={"p": rel_path})
            
            try:
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                    tree = ast.parse(content)
                    
                    for node in ast.walk(tree):
                        if isinstance(node, ast.ClassDef):
                            self.conn.execute("MERGE (c:ClassNode {name: $n, file_path: $p})", parameters={"n": node.name, "p": rel_path})
                            self.conn.execute("MATCH (f:File {path: $p}), (c:ClassNode {name: $n}) MERGE (f)-[:CONTAINS_CLASS]->(c)", 
                                             parameters={"p": rel_path, "n": node.name})
                            context_data.append({"text": f"Class {node.name} in {rel_path}", "type": "class", "path": rel_path})
                            
                        elif isinstance(node, ast.FunctionDef):
                            self.conn.execute("MERGE (fn:FuncNode {name: $n, file_path: $p})", parameters={"n": node.name, "p": rel_path})
                            self.conn.execute("MATCH (f:File {path: $p}), (fn:FuncNode {name: $n}) MERGE (f)-[:CONTAINS_FUNC]->(fn)", 
                                             parameters={"p": rel_path, "n": node.name})
                            context_data.append({"text": f"Function {node.name} in {rel_path}", "type": "function", "path": rel_path})
            except SyntaxError as e:
                logger.error(f"Error parsing file {path} for Kuzu: {e}", exc_info=False)
                context_data.append({"text": f"SYSTEM WARNING: Context from file {rel_path} is unavailable due to a syntax error ({str(e)})", "type": "error", "path": rel_path})
                raise SyntaxError(f"AST RAG Compilation failed on {path}: {e}")
            except Exception as e:
                logger.error(f"Error indexing file {path} for Kuzu: {e}", exc_info=False)
                context_data.append({"text": f"SYSTEM WARNING: Unexpected error {str(e)}", "type": "error", "path": rel_path})
                raise RuntimeError(f"RAG Compilation blocked on {path}: {e}")
                
        # Writing to LanceDB
        if context_data:
            import pyarrow as pa
            from sentence_transformers import SentenceTransformer
            
            logger.info(f"🧠 [Vector RAG] Loading sentence-transformers and computing Embeddings for {len(context_data)} nodes...")
            # MiniLM-L6-v2 - an excellent lightweight model with 384 dimensions
            model = SentenceTransformer("all-MiniLM-L6-v2")
            
            # LanceDB schema with actual vectors
            schema = pa.schema([
                pa.field("vector", pa.list_(pa.float32(), 384)),
                pa.field("text", pa.string()),
                pa.field("type", pa.string()),
                pa.field("path", pa.string())
            ])
            data = []
            
            texts_to_encode = [item["text"] for item in context_data]
            vectors = model.encode(texts_to_encode).tolist()
            
            for i, item in enumerate(context_data):
                data.append({"vector": vectors[i], "text": item["text"], "type": item["type"], "path": item["path"]})
            
            # Ignoring warnings about deprecated APIs
            table_names = self.lance_db.list_tables().tables
            if "code_index" in table_names:
                self.lance_db.drop_table("code_index")
            self.lance_db.create_table("code_index", data=data, schema=schema)
            
        logger.info("✅ Graph (Kùzu) and vector database (LanceDB) updated successfully!")

    def get_context_for_prompt(self, target_request: str) -> str:
        """ Compresses all project files into a dense AST map by querying the Graph & Vector DB """
        logger.info(f"🗜️ [CodeLens Compression] Extracting hybrid context (Kùzu/LanceDB) for the request...")
        compressed_map = []
        
        # 1. SEMANTIC VECTOR SEARCH (LanceDB)
        try:
            from sentence_transformers import SentenceTransformer
            model = SentenceTransformer("all-MiniLM-L6-v2")
            query_vector = model.encode(target_request).tolist()
            
            table_names = self.lance_db.list_tables().tables
            if "code_index" in table_names:
                table = self.lance_db.open_table("code_index")
                results = table.search(query_vector).limit(5).to_pandas()
                
                compressed_map.append("----- SEMANTICALLY SIMILAR NODES (Vector DB LanceDB) -----")
                for _, row in results.iterrows():
                    compressed_map.append(f"[{row['type'].upper()}] {row['text']} (Similarity - {1.0 - getattr(row, '_distance', 0.0):.2f})")
                compressed_map.append("---------------------------------------------------------")
        except Exception as e:
            logger.error(f"⚠️ [Semantic RAG] LanceDB vector search error: {e}", exc_info=True)
        
        # 2. QUERYING THE KNOWLEDGE GRAPH (Kùzu DB)
        try:
            res = self.conn.execute("MATCH (f:File)-[:CONTAINS_CLASS]->(c:ClassNode) RETURN f.path, c.name")
            while res.has_next():
                row = res.get_next()
                compressed_map.append(f"Graph -> File {row[0]} contains class: {row[1]}")
                
            res_f = self.conn.execute("MATCH (f:File)-[:CONTAINS_FUNC]->(fn:FuncNode) RETURN f.path, fn.name")
            while res_f.has_next():
                row = res_f.get_next()
                compressed_map.append(f"Graph -> File {row[0]} contains function: {row[1]}")
        except Exception as e:
            logger.error(f"Error executing Kuzu query: {e}", exc_info=True)
            
        # For the UI, we add a regular export scan (as a fallback)
        frontend_files = glob.glob(os.path.join(self.workspace_path, "frontend", "src", "**", "*.tsx"), recursive=True)
        for path in frontend_files:
            try:
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                    exports = re.findall(r'export\s+(?:default\s+)?(?:function|const|class|interface)\s+([a-zA-Z0-9_]+)', content)
                    compressed_map.append(f"UI Component {os.path.basename(path)} -> Exports: {exports}")
            except Exception as e:
                logger.error(f"🔥 [GraphRAG] Error parsing frontend interfaces {path}: {e}", exc_info=True)
            
        final_context = "\n".join(compressed_map)
        logger.info(f"📉 [CodeLens] Compression complete! Context size reduced (to {len(final_context)} bytes).")
        return f"COMPRESSED PROJECT ARCHITECTURE MAP (CodeLens Kùzu + LanceDB):\n{final_context}"
