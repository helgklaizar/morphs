import lancedb
from core.logger import logger

class LibrarianMorph:
    """
    📚 Пункт 1: RAG-Библиотекарь
    Хранит скачанный Markdown документаций (Tailwind, React) внутри LanceDB.
    Чрезвычайно быстрая векторная СУБД (заменили ChromaDB).
    """
    def __init__(self, db_path: str = "librarian.lancedb"):
        # LanceDB работает прямо поверх файловой системы!
        self.db = lancedb.connect(db_path)
        self.table_name = "ui_libs"

        
    def ingest_docs(self, lib_name: str, markdown_text: str):
        logger.info(f"📚 [Librarian-Morph] Изучаю документацию {lib_name} (LanceDB)...")
        chunks = [c.strip() for c in markdown_text.split("\n\n") if len(c.strip()) > 30]
        if not chunks:
            return
            
        # Формат для LanceDB. В проде добавляем реальные эмбеддинги (HuggingFace)
        data = [{"id": f"{lib_name}_{i}", "library": lib_name, "text": chunks[i], "vector": [0.1]*128} for i in range(len(chunks))]
        
        if self.table_name in self.db.list_tables().tables:
            table = self.db.open_table(self.table_name)
            table.add(data)
        else:
            self.db.create_table(self.table_name, data=data)

        logger.info(f"✅ [Librarian-Morph] Запомнил {len(chunks)} сниппетов в LanceDB по {lib_name}.")

    def query_snippet(self, lib_name: str, query: str) -> str:
        logger.info(f"🔍 [Librarian-Morph] Поиск '{query}' в LanceDB ({lib_name})...")
        if self.table_name not in self.db.list_tables().tables:
            return "Сниппет не найден (документация не загружена)."
            
        try:
            table = self.db.open_table(self.table_name)
            # Dummy векторный поиск
            res = table.search([0.1]*128).where(f"library = '{lib_name}'").limit(1).to_list()
            if res and res[0]:
                snippet = res[0]["text"]
                logger.info(f"🧐 [Librarian-Morph] Нашел актуальный док: {snippet[:50]}...")
                return snippet
        except Exception as e:
            logger.info(f"⚠️ [Librarian-Morph] Ошибка поиска LanceDB: {e}")
            
        return "Сниппет не найден. Пиши по общим правилам архитектуры."
