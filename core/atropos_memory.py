import os
import lancedb
import pyarrow as pa
import time
from core.logger import logger

class AtroposMemory:
    """
    Интерфейс для Atropos Experience Replay через LanceDB (Векторный поиск прошлого опыта). 
    Заменяет atropos_memory.json.
    """
    def __init__(self, db_path=".lancedb"):
        self.db_path = os.path.abspath(db_path)
        os.makedirs(self.db_path, exist_ok=True)
        self.db = lancedb.connect(self.db_path)
        self.table_name = "atropos_experience"
        
        self.schema = pa.schema([
            pa.field("vector", pa.list_(pa.float32(), 384)),
            pa.field("timestamp", pa.float64()),
            pa.field("error", pa.string()),
            pa.field("fixed_code", pa.string()),
            pa.field("reward", pa.int32()),
        ])
        
        # We might need to handle schema mismatch if table already exists, but for now we trust exist_ok
        try:
            self.db.create_table(self.table_name, schema=self.schema, exist_ok=True)
        except BaseException as e:
            if "Schema Error" in str(e):
                logger.warning(f"Schema mismatch detected for {self.table_name}, dropping and recreating table.")
                self.db.drop_table(self.table_name)
                self.db.create_table(self.table_name, schema=self.schema)
            else:
                logger.error(f"Error creating table: {e}", exc_info=False)
                raise RuntimeError(f"Atropos Memory DB initialization failed: {e}")
            
    def _get_embedding(self, text: str) -> list[float]:
        try:
            from sentence_transformers import SentenceTransformer
            model = SentenceTransformer("all-MiniLM-L6-v2")
            return model.encode(text).tolist()
        except ImportError:
            return [0.0] * 384
            
    def record_experience(self, error: str, fixed_code: str, reward: int):
        try:
            table = self.db.open_table(self.table_name)
            vector = self._get_embedding(error or "unknown")
            data = [{
                "vector": vector, 
                "timestamp": time.time(),
                "error": error or "",
                "fixed_code": fixed_code or "",
                "reward": int(reward)
            }]
            table.add(data)
            logger.info(f"💾 [Atropos] Опыт успешно сохранен. Reward: {reward}")
        except BaseException as e:
            logger.error(f"Error recording experience: {e}", exc_info=False)
            raise RuntimeError(f"RL loop broken: Cannot record experience: {e}")
        
    def get_relevant_experience(self, error_query: str, limit: int = 5) -> str:
        try:
            table = self.db.open_table(self.table_name)
            vector = self._get_embedding(error_query)
            
            # Vector search across experience
            df = table.search(vector).limit(limit).to_pandas()
            successes = df[df["reward"] > 0]
            
            lessons = []
            for _, row in successes.iterrows():
                lessons.append(f"ОШИБКА: {row['error']}. ПАТЧ: {row['fixed_code'][:200]}...")
                
            return "\n".join(lessons)
        except BaseException as e:
            logger.warning(f"⚠️ [Atropos] No past experience available or DB not generated yet. ({e})")
            return ""
