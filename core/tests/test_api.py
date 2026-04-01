import pytest
from fastapi.testclient import TestClient

# We need to import our FastAPI application
from core.main import app

# Create a test client
client = TestClient(app)

# Fixture to replace the heavy Llama-3 with a stub in tests
@pytest.fixture(autouse=True)
def mock_mlx(monkeypatch):
    # Mock the boot_mind function so it does nothing
    monkeypatch.setattr("core.main.boot_mind", lambda: None)
    
    class MockMind:
        def think(self, prompt, **kwargs):
            return "export default function GeneratedModule() { return <div>Test UI-Morph Result</div>; }<|eot_id|>"
            
    # Replace the global mind in main.py with our mock
    monkeypatch.setattr("core.main.mind", MockMind())

def test_root_is_up():
    """Test: The main API page (Healthcheck) responds with 200"""
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
