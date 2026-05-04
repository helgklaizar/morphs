import lancedb
from core.logger import logger

class LibrarianMorph:
    """
    📚 Item 1: RAG-Librarian
    Stores downloaded Markdown documentation (Tailwind, React) inside LanceDB.
    Extremely fast vector DBMS (replaced ChromaDB).
    """
    def __init__(self, db_path: str = "librarian.lancedb"):
        # LanceDB works directly on top of the file system!
        self.db = lancedb.connect(db_path)
        self.table_name = "ui_libs"

        
    def ingest_docs(self, lib_name: str, markdown_text: str):
        logger.info(f"📚 [Librarian-Morph] Studying documentation for {lib_name} (LanceDB)...")
        chunks = [c.strip() for c in markdown_text.split("\n\n") if len(c.strip()) > 30]
        if not chunks:
            return
            
        # Format for LanceDB. In production, we add real embeddings (HuggingFace)
        data = [{"id": f"{lib_name}_{i}", "library": lib_name, "text": chunks[i], "vector": [0.1]*128} for i in range(len(chunks))]
        
        if self.table_name in self.db.list_tables().tables:
            table = self.db.open_table(self.table_name)
            table.add(data)
        else:
            self.db.create_table(self.table_name, data=data)

        logger.info(f"✅ [Librarian-Morph] Memorized {len(chunks)} snippets in LanceDB for {lib_name}.")

    def query_snippet(self, lib_name: str, query: str) -> str:
        logger.info(f"🔍 [Librarian-Morph] Searching for '{query}' in LanceDB ({lib_name})...")
        if self.table_name not in self.db.list_tables().tables:
            return "Snippet not found (documentation not loaded)."
            
        try:
            table = self.db.open_table(self.table_name)
            # Dummy vector search
            res = table.search([0.1]*128).where(f"library = '{lib_name}'").limit(1).to_list()
            if res and res[0]:
                snippet = res[0]["text"]
                logger.info(f"🧐 [Librarian-Morph] Found a relevant doc: {snippet[:50]}...")
                return snippet
        except Exception as e:
            logger.info(f"⚠️ [Librarian-Morph] LanceDB search error: {e}")
            
        return "Snippet not found. Write according to general architectural rules."
