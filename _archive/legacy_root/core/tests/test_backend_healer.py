import os
import tempfile
from unittest.mock import patch, MagicMock
from backend_healer import BackendHealer
from core.logger import logger

@patch("backend_healer.CoreMind")
@patch("subprocess.run")
def test_backend_healer_success(mock_subprocess, MockCoreMind):
    mock_mind = MockCoreMind.return_value
    # First, we try to fix the broken code
    mock_mind.think_structured.return_value = {
        "thought": "I forgot to close a parenthesis, fixing the code...",
        "code": "logger.info('fixed')"
    }
    
    # Simulate that after the first patch, subprocess.run returned 0 (everything is fine)
    # mock_subprocess.run() will return 1 the first time when creating the pytest file, then 0
    mock_process_fail = MagicMock()
    mock_process_fail.returncode = 1
    mock_process_fail.stdout = "SyntaxError: invalid syntax"
    mock_process_fail.stderr = ""
    
    mock_process_success = MagicMock()
    mock_process_success.returncode = 0
    mock_process_success.stdout = "===== 1 passed in 0.01s ====="
    mock_process_success.stderr = ""
    
    # When calling subprocess.run: the first call fails (1), the second (when Healer checks itself) - succeeds (0)
    mock_subprocess.side_effect = [mock_process_success]
    
    with tempfile.NamedTemporaryFile("w", delete=False, suffix=".py") as tf:
        tf.write("logger.info('broken')")
        test_file = tf.name
        
    try:
        healer = BackendHealer(test_file)
        
        # Mock run_pytest to first return an error, then 0
        with patch.object(healer, 'run_pytest', side_effect=[(1, "SyntaxError", ""), (0, "Success", "")]):
            success = healer.heal_python_code("ImportError: no module named httpx")
            
        assert success is True
        
        # Check that the file was overwritten
        with open(test_file, "r") as f:
            fixed_code = f.read()
            assert fixed_code == "logger.info('fixed')"
            
    finally:
        os.remove(test_file)
