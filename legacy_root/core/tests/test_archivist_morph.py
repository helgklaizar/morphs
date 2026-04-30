import json
from unittest.mock import patch
from archivist_morph import ArchivistMorph

@patch("archivist_morph.CoreMind")
def test_archivist_folding(MockCoreMind, tmpdir):
    # Create a fake blueprints folder and a memory snapshot larger than 3000 characters
    blueprints_dir = tmpdir.mkdir("blueprints")
    test_json = blueprints_dir.join("test_memory.json")
    
    large_memory = {
        "architecture_logs": "In this project, we worked long and hard to create tables " * 100,
        "endpoints": ["/api/v1/users", "/api/v1/items"]
    }
    test_json.write(json.dumps(large_memory))
    
    assert len(test_json.read()) > 3000
    
    # Mock CoreMind to return a neatly folded JSON
    mock_mind = MockCoreMind.return_value
    mock_mind.think_structured.return_value = {
        "thought": "Compressing data",
        "code": '{"compressed":true, "endpoints": ["/api/v1/users", "/api/v1/items"]}'
    }
    
    # Patch paths inside ArchivistMorph
    with patch("archivist_morph.os.path.exists", return_value=True):
        with patch("archivist_morph.os.listdir", return_value=["test_memory.json"]):
            with patch("archivist_morph.os.path.join", return_value=str(test_json)):
                
                archivist = ArchivistMorph()
                archivist.fold_memory()
                
    # Check that the file is compressed
    compressed_content = json.loads(test_json.read())
    assert "compressed" in compressed_content
    assert compressed_content["compressed"] is True
    assert len(test_json.read()) < 3000
    mock_mind.think_structured.assert_called_once()
