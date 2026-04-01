import json
from unittest.mock import patch
from archivist_morph import ArchivistMorph

@patch("archivist_morph.CoreMind")
def test_archivist_folding(MockCoreMind, tmpdir):
    # Создаем фейковую папку blueprints и слепок памяти, который больше 3000 символов
    blueprints_dir = tmpdir.mkdir("blueprints")
    test_json = blueprints_dir.join("test_memory.json")
    
    large_memory = {
        "architecture_logs": "В этом проекте мы долго и упорно создавали таблицы " * 100,
        "endpoints": ["/api/v1/users", "/api/v1/items"]
    }
    test_json.write(json.dumps(large_memory))
    
    assert len(test_json.read()) > 3000
    
    # Мокаем CoreMind так, чтобы он возвращал аккуратно сложенный JSON
    mock_mind = MockCoreMind.return_value
    mock_mind.think_structured.return_value = {
        "thought": "Сжимаю данные",
        "code": '{"compressed":true, "endpoints": ["/api/v1/users", "/api/v1/items"]}'
    }
    
    # Подменяем пути внутри ArchivistMorph
    with patch("archivist_morph.os.path.exists", return_value=True):
        with patch("archivist_morph.os.listdir", return_value=["test_memory.json"]):
            with patch("archivist_morph.os.path.join", return_value=str(test_json)):
                
                archivist = ArchivistMorph()
                archivist.fold_memory()
                
    # Проверяем, что файл сжат
    compressed_content = json.loads(test_json.read())
    assert "compressed" in compressed_content
    assert compressed_content["compressed"] is True
    assert len(test_json.read()) < 3000
    mock_mind.think_structured.assert_called_once()
