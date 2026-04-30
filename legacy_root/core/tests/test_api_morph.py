from core.api_morph import APIMorph
from unittest.mock import MagicMock, patch

class DummyReq:
    def __init__(self):
        self.business_type = "Cafe"
        self.modules = ["Users", "Orders"]

@patch("os.environ.get", return_value="fake_key")
@patch("core.api_morph.glob.glob", return_value=[])
@patch("db_morph.DBMorph.generate_orm_schema") # Mock the background run
def test_api_morph_generate_backend(mock_generate_orm, mock_glob, mock_env):
    mock_wm = MagicMock()
    mock_wm.base_dir = "/tmp/workspace"
    mock_wm.write_api_route.return_value = "/tmp/workspace/test/router_123.py"
    
    agent = APIMorph(mock_wm, "test_proj")
    
    # Mock GeminiCore
    mock_gemini = MagicMock()
    # It gets called twice: generate, then review
    mock_gemini.think_structured.side_effect = [
        {"thought": "plan", "code": "def gen1(): pass"}, 
        {"thought": "review", "code": "def reviewed(): pass"}
    ]
    agent.mind = mock_gemini
    
    req = DummyReq()
    filepath, code = agent.generate_backend(req)
    
    # Assert real business logic happened
    assert mock_gemini.think_structured.call_count == 2
    assert "def reviewed(): pass" in code
    mock_wm.write_api_route.assert_called_once()
    mock_generate_orm.assert_called_once()
