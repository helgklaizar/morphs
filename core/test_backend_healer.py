import os
import tempfile
from unittest.mock import patch, MagicMock
from backend_healer import BackendHealer
from core.logger import logger

@patch("backend_healer.CoreMind")
@patch("subprocess.run")
def test_backend_healer_success(mock_subprocess, MockCoreMind):
    mock_mind = MockCoreMind.return_value
    # Сначала пытаемся починить сломанный код
    mock_mind.think_structured.return_value = {
        "thought": "Я забыл закрыть скобку, исправляю код...",
        "code": "logger.info('fixed')"
    }
    
    # Симолируем, что после первого патча subprocess.run вернул 0 (все отлично)
    # mock_subprocess.run() первый раз при создании pytest файла вернет 1, потом 0
    mock_process_fail = MagicMock()
    mock_process_fail.returncode = 1
    mock_process_fail.stdout = "SyntaxError: invalid syntax"
    mock_process_fail.stderr = ""
    
    mock_process_success = MagicMock()
    mock_process_success.returncode = 0
    mock_process_success.stdout = "===== 1 passed in 0.01s ====="
    mock_process_success.stderr = ""
    
    # При вызове subprocess.run: первый вызов падает (1), второй (когда Healer проверяет сам себя) - успешно (0)
    mock_subprocess.side_effect = [mock_process_success]
    
    with tempfile.NamedTemporaryFile("w", delete=False, suffix=".py") as tf:
        tf.write("logger.info('broken')")
        test_file = tf.name
        
    try:
        healer = BackendHealer(test_file)
        
        # Мокаем run_pytest чтобы сначала выплюнуть ошибку, потом 0
        with patch.object(healer, 'run_pytest', side_effect=[(1, "SyntaxError", ""), (0, "Success", "")]):
            success = healer.heal_python_code("ImportError: no module named httpx")
            
        assert success is True
        
        # Проверяем, что файл был перезаписан
        with open(test_file, "r") as f:
            fixed_code = f.read()
            assert fixed_code == "logger.info('fixed')"
            
    finally:
        os.remove(test_file)
