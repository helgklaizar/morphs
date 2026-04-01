import os
import pytest
from core.vision_morph import VisionMorph

class DummyClient:
    class DummyModels:
        def generate_content(self, model, contents):
            class DummyResponse:
                text = '{"component": "Dashboard"}'
            return DummyResponse()
    
    def __init__(self, api_key=None):
        self.models = self.DummyModels()

def test_vision_morph_success(tmp_path):
    img_path = tmp_path / "fake.png"
    img_path.write_bytes(b"fake-image-bytes")

    vision = VisionMorph()
    vision.client = DummyClient()
    
    result = vision.analyze_screenshot(str(img_path))
    assert "Dashboard" in result

def test_vision_morph_no_api_key(tmp_path):
    img_path = tmp_path / "fake.png"
    img_path.write_bytes(b"fake-image-bytes")
    
    vision = VisionMorph()
    vision.client = None
    
    result = vision.analyze_screenshot(str(img_path))
    assert "GEMINI_API_KEY" in result

def test_vision_morph_missing_file():
    vision = VisionMorph()
    vision.client = DummyClient()
    result = vision.analyze_screenshot("non_existent_file.png")
    assert "не найден" in result
