import os
import pytest
from core.tools.file_ops import FileTools

def test_file_read_edit(tmp_path):
    test_file = tmp_path / "test.txt"
    test_file.write_text("Hello, World!", encoding="utf-8")
    
    # Test read
    content = FileTools.read_file(str(test_file))
    assert content == "Hello, World!"
    
    # Test edit
    res = FileTools.edit_file(str(test_file), "World", "Morphs")
    assert "Success" in res
    
    # Verify edit
    new_content = FileTools.read_file(str(test_file))
    assert new_content == "Hello, Morphs!"
    
    # Test edit with non-existing text
    res = FileTools.edit_file(str(test_file), "NotThere", "Here")
    assert "Error" in res

def test_glob_files(tmp_path):
    # Setup files
    (tmp_path / "a.py").write_text("a")
    (tmp_path / "b.txt").write_text("b")
    os.makedirs(tmp_path / "subdir")
    (tmp_path / "subdir" / "c.py").write_text("c")
    
    # Test glob
    res = FileTools.glob_files("**/*.py", str(tmp_path))
    assert "a.py" in res
    assert "subdir/c.py" in res or "subdir\\c.py" in res
    assert "b.txt" not in res

def test_grep_search(tmp_path):
    test_file = tmp_path / "grep_test.py"
    test_file.write_text("def hello():\n    print('hi')\n# hello again", encoding="utf-8")
    
    # Test grep
    res = FileTools.grep_search("hello", str(test_file))
    assert "1: def hello():" in res
    assert "3: # hello again" in res
    assert "print('hi')" not in res
    
    # Test not found
    res = FileTools.grep_search("missing", str(test_file))
    assert "No matches" in res
