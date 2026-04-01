import pytest
from fastapi.testclient import TestClient

# Нужно импортировать наше FastAPI приложение
from core.main import app

# Создаем тестового клиента
client = TestClient(app)

# Фикстура для того, чтобы подменить тяжелую Llama-3 заглушкой в тестах
@pytest.fixture(autouse=True)
def mock_mlx(monkeypatch):
    # Мокаем функцию boot_mind, чтобы она ничего не делала
    monkeypatch.setattr("core.main.boot_mind", lambda: None)
    
    class MockMind:
        def think(self, prompt, **kwargs):
            return "export default function GeneratedModule() { return <div>Test UI-Morph Result</div>; }<|eot_id|>"
            
    # Подменяем глобальный mind в main.py на наш мок
    monkeypatch.setattr("core.main.mind", MockMind())

def test_root_is_up():
    """Тест: Главная страница API (Helathcheck) отвечает 200"""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "Core Mind is running"

def test_generate_ui_morph():
    req_data = {
        "business_type": "Car Wash",
        "modules": ["crm", "booking"]
    }
    
    response = client.post("/api/v1/generate", json=req_data)
    assert response.status_code == 200
    assert response.json()["status"] == "accepted"
