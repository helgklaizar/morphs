import os
import lancedb
from core.logger import logger

class MemoryMorph:
    """
    RAG storage for user's behavioral preferences (Semantic Memory).
    We use LanceDB instead of raw JSON.
    It records the user's tastes and requirements so the AI doesn't have to ask again.
    """
    def __init__(self, db_path: str = "memory_layer.lancedb"):
        self.db = lancedb.connect(db_path)
        self.table_name = "preferences"
        self._embed_model = None
        
    def _embed(self, text: str) -> list[float]:
        try:
            from sentence_transformers import SentenceTransformer
            if self._embed_model is None:
                self._embed_model = SentenceTransformer("all-MiniLM-L6-v2")
            return self._embed_model.encode(text).tolist()
        except ImportError:
            raise RuntimeError("⚠️ The sentence_transformers package is not installed. Vector search (LanceDB) is not possible. First, run: pip install sentence_transformers")

    def _get_table(self):
        if self.table_name not in self.db.list_tables().tables:
            # Seed record when creating the table
            return self.db.create_table(self.table_name, data=[{"id": "init", "preference": "Init", "vector": self._embed("Init")}])
        return self.db.open_table(self.table_name)
            
    def add_preference(self, preference: str):
        logger.info(f"🧠 [Memory-Morph] Memorized in LanceDB: {preference}")
        table = self._get_table()
        # Generating a real embedding of length 384
        vector = self._embed(preference)
        table.add([{"id": os.urandom(4).hex(), "preference": preference, "vector": vector}])

    def get_context_prompt(self) -> str:
        if self.table_name not in self.db.list_tables().tables:
            return ""
        try:
            table = self._get_table()
            # Search for the top 5 latest/similar preferences using a real embedding
            query_vector = self._embed("find system settings and user preferences")
            records = table.search(query_vector).limit(5).to_list()
            prefs = [r["preference"] for r in records if r["id"] != "init"]
            if not prefs:
                return ""
            return "CONSIDER THESE OWNER'S REQUIREMENTS IN ALL FILES:\n- " + "\\n- ".join(prefs)
        except Exception as e:
            logger.info(f"⚠️ [Memory-Morph] Search error: {e}")
            return ""

    @staticmethod
    def microcompact(prompt: str, max_chars: int = 150000) -> str:
        """
        Emergency context compression on ContextLengthExceeded.
        Keeps the beginning (architecture, instructions) and the end (recent logs/messages).
        """
        if len(prompt) <= max_chars:
            return prompt
            
        logger.warning(f"📉 [MicroCompact] Compressing context: {len(prompt)} -> {max_chars} characters...")
        head_size = int(max_chars * 0.3)
        tail_size = int(max_chars * 0.7)
        
        head = prompt[:head_size]
        tail = prompt[-tail_size:]
        
        return f"{head}\n\n... [SYSTEMATICALLY DELETED: MICRO-COMPACTION OF OLD MEMORY] ...\n\n{tail}"
