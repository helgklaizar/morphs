import asyncio
import os
import tempfile
import subprocess
from unittest.mock import patch, MagicMock
from core.quantum_atropos import QuantumAtropos
from core.logger import logger

@patch("core.gemini_agent.GeminiCore")
def test_quantum_atropos_real_validation(MockGemini):
    """
    ЧЕСТНЫЙ ТЕСТ MCTS (Дерева поиска патчей):
    Никаких фейковых строковых сравнений. Мы поднимаем реальную песочницу,
    записываем реальный питоновский файл, и валидатор MCTS делает реальный подпроцесс 
    вызова pytest на изолированном коде. LLM мокается только для отдачи вариантов (т.к. мы в CI).
    """
    MockGemini.return_value.model = MagicMock()
    with tempfile.TemporaryDirectory() as temp_dir:
        broken_file = os.path.join(temp_dir, "math_utils.py")
        test_file = os.path.join(temp_dir, "test_math.py")
        
        # 1. Сломанный код (ошибка в делении)
        broken_code = "def divide(a, b):\n    return a + b\n"
        with open(broken_file, "w") as f:
            f.write(broken_code)
            
        # 2. Настоящий тест, проверяющий логику
        test_code = "from math_utils import divide\n\ndef test_divide():\n    assert divide(10, 2) == 5\n"
        with open(test_file, "w") as f:
            f.write(test_code)

        # 3. Мокаем LLM: она сгенерирует 3 варианта патчей
        mock_mind = MagicMock()
        mock_mind.think_structured.side_effect = [
            {"patch": "def divide(a, b):\n    return a - b\n"}, # Ветка 1 (Не пройдет тест)
            {"patch": "def divide(a, b):\n    return a / b\n"}, # Ветка 2 (Правильный - зеленая)
            {"patch": "def divide(a, b\n    return a/b\n"}       # Ветка 3 (Синтаксическая ошибка)
        ]
        MockGemini.return_value = mock_mind
        
        agent = QuantumAtropos(api_key="fake-key")
        
        # 4. НАСТОЯЩИЙ ВАЛИДАТОР: пишет код и вызывает реальный `pytest` в песочнице
        def real_validator(patch_code: str) -> tuple[bool, str]:
            with open(broken_file, "w") as f:
                f.write(patch_code)
            
            env = os.environ.copy()
            env["PYTHONPATH"] = temp_dir
            env["PYTHONDONTWRITEBYTECODE"] = "1"
            
            try:
                import sys
                # Запускаем честный pytest из подпроцесса на только что записанном патче
                result = subprocess.run(
                    [sys.executable, "-m", "pytest", test_file], 
                    env=env,
                    capture_output=True, 
                    text=True,
                    timeout=5
                )
                if result.returncode != 0:
                    logger.info(f"DEBUG YYY: Patch: {patch_code!r} -> ReturnCode: {result.returncode}\n{result.stdout}\n{result.stderr}")
                else:
                    logger.info(f"DEBUG XXX: SUCCESS Patch: {patch_code!r}")
                # Если код возврата 0 - тест пройден!
                return result.returncode == 0, result.stderr
            except BaseException as e:
                logger.info(f"DEBUG ZZZ: Exception {e}")
                return False, str(e)

        error_trace = "AssertionError: assert 12 == 5"
        
        # Запускаем Дерево: оно проверит все 3 ветки через `real_validator` и выберет зеленую
        best_patch = asyncio.run(agent.search_best_patch(broken_code, error_trace, real_validator, branches=3))
        
        # Убеждаемся, что алгоритм нашел единственный        # Дерево должно было пойти по второй ветке и вернуть её
        assert best_patch.strip() == "def divide(a, b):\n    return a / b".strip()


@patch("core.gemini_agent.GeminiCore")
def test_quantum_atropos_mcts_failure(MockGemini):
    """
    Если ни один патч не проходит тесты, дерево должно вернуть None.
    """
    with tempfile.TemporaryDirectory() as temp_dir:
        broken_file = os.path.join(temp_dir, "math_utils.py")
        test_file = os.path.join(temp_dir, "test_math.py")
        
        broken_code = "def divide(a, b):\n    return a + b\n"
        with open(broken_file, "w") as f:
            f.write(broken_code)
            
        test_code = "from math_utils import divide\n\ndef test_divide():\n    assert divide(10, 2) == 5\n"
        with open(test_file, "w") as f:
            f.write(test_code)

        mock_mind = MagicMock()
        mock_mind.think_structured.side_effect = [
            {"patch": "def divide(a, b):\n    return a - b\n"},
            {"patch": "def divide(a, b):\n    return a * b\n"},
            {"patch": "def divide(a, b):\n    return a ** b\n"}
        ]
        MockGemini.return_value = mock_mind
        
        agent = QuantumAtropos(api_key="fake-key")
        
        def real_validator(patch_code: str) -> tuple[bool, str]:
            with open(broken_file, "w") as f:
                f.write(patch_code)
            
            env = os.environ.copy()
            env["PYTHONPATH"] = temp_dir
            
            try:
                import sys
                result = subprocess.run([sys.executable, "-m", "pytest", test_file], env=env, capture_output=True, timeout=5)
                logger.info(f"DEBUG YYY 2: Patch: {patch_code!r} -> ReturnCode: {result.returncode}")
                return result.returncode == 0, ""
            except BaseException as e:
                return False, str(e)

        best_patch = asyncio.run(agent.search_best_patch("code", "err", real_validator, branches=3))
        
        # Дерево должно свернуться и вернуть None так как всё красное
        assert best_patch is None
