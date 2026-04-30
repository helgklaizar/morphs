from core.librarian_morph import LibrarianMorph

def test_librarian_morph_lifecycle(tmp_path):
    db_path = str(tmp_path / "lancedb")
    lib = LibrarianMorph(db_path=db_path)
    
    markdown_text = "This is a very long documentation chunk that must be ingested by lancedb. Here is some more padding to make it longer than 30 characters."
    
    lib.ingest_docs("react", markdown_text)
    
    res = lib.query_snippet("react", "dummy query")
    assert "This is a very long documentation" in res
