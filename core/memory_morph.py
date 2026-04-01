import os
import lancedb
from core.logger import logger

class MemoryMorph:
    """
    RAG-Хранилище поведенческих предпочтений пользователя (Semantic Memory).
    Используем LanceDB вместо сырого JSON.
    Записывает вкусы и требования юзера, чтобы ИИ не переспрашивал.
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
            raise RuntimeError("⚠️ Пакет sentence_transformers не установлен. Векторный поиск (LanceDB) невозможен. Сначала выполните: pip install sentence_transformers")

    def _get_table(self):
        if self.table_name not in self.db.list_tables().tables:
            # Seed-запись при создании таблицы
            return self.db.create_table(self.table_name, data=[{"id": "init", "preference": "Init", "vector": self._embed("Init")}])
        return self.db.open_table(self.table_name)
            
    def add_preference(self, preference: str):
        logger.info(f"🧠 [Memory-Morph] Запомнил в LanceDB: {preference}")
        table = self._get_table()
        # Генерируем настоящий эмбеддинг длинной 384
        vector = self._embed(preference)
        table.add([{"id": os.urandom(4).hex(), "preference": preference, "vector": vector}])

    def get_context_prompt(self) -> str:
        if self.table_name not in self.db.list_tables().tables:
            return ""
        try:
            table = self._get_table()
            # Поиск топ-5 последних/похожих предпочтений используя реальный эмбеддинг
            query_vector = self._embed("найди системные настройки и предпочтения пользователя")
            records = table.search(query_vector).limit(5).to_list()
            prefs = [r["preference"] for r in records if r["id"] != "init"]
            if not prefs:
                return ""
            return "УЧТИ ЭТИ ТРЕБОВАНИЯ ВЛАДЕЛЬЦА ВО ВСЕХ ФАЙЛАХ:\n- " + "\\n- ".join(prefs)
        except Exception as e:
            logger.info(f"⚠️ [Memory-Morph] Ошибка поиска: {e}")
            return ""

    @staticmethod
    def microcompact(prompt: str, max_chars: int = 150000) -> str:
        """
        Экстренное сжатие контекста при ContextLengthExceeded.
        Оставляет начало (архитектура, инструкции) и конец (свежие логи/сообщения).
        """
        if len(prompt) <= max_chars:
            return prompt
            
        logger.warning(f"📉 [MicroCompact] Сжатие контекста: {len(prompt)} -> {max_chars} символов...")
        head_size = int(max_chars * 0.3)
        tail_size = int(max_chars * 0.7)
        
        head = prompt[:head_size]
        tail = prompt[-tail_size:]
        
        return f"{head}\n\n... [СИСТЕМНО УДАЛЕНО: МИКРОКОМПАКТИЗАЦИЯ СТАРОЙ ПАМЯТИ] ...\n\n{tail}"
