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
    HONEST MCTS TEST (Patch Search Tree):
    No fake string comparisons. We set up a real sandbox,
    write a real Python file, and the MCTS validator makes a real subprocess 
    call to pytest on isolated code. The LLM is mocked only to provide variants (since we are in CI).
    """
    MockGemini.return_value.model = MagicMock()
    with tempfile.TemporaryDirectory() as temp_dir:
        broken_file = os.path.join(temp_dir, "math_utils.py")
        test_file = os.path.join(temp_dir, "test_math.py")
        
        # 1. Broken code (error in division)
        broken_code = "def divide(a, b):\n    return a + b\n"
        with open(broken_file, "w") as f:
            f.write(broken_code)
            
        # 2. A real test that checks the logic
        test_code = "from math_utils import divide\n\ndef test_divide():\n    assert divide(10, 2) == 5\n"
        with open(test_file, "w") as f:
            f.write(test_code)

        # 3. Mock the LLM: it will generate 3 patch variants
        mock_mind = MagicMock()
        mock_mind.think_structured.side_effect = [
            {"patch": "def divide(a, b):\n    return a - b\n"}, # Branch 1 (Will not pass the test)
            {"patch": "def divide(a, b):\n    return a / b\n"}, # Branch 2 (Correct - green)
            {"patch": "def divide(a, b\n    return a/b\n"}       # Branch 3 (Syntax error)
        ]
        MockGemini.return_value = mock_mind
        
        agent = QuantumAtropos(api_key="fake-key")
        
        # 4. REAL VALIDATOR: writes the code and calls the real `pytest` in the sandbox
        def real_validator(patch_code: str) -> tuple[bool, str]:
            with open(broken_file, "w") as f:
                f.write(patch_code)
            
            env = os.environ.copy()
            env["PYTHONPATH"] = temp_dir
            env["PYTHONDONTWRITEBYTECODE"] = "1"
            
            try:
                import sys
                # Run an honest pytest in a subprocess on the just-written patch
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
                # If the return code is 0 - the test passed!
                return result.returncode == 0, result.stderr
            except BaseException as e:
                logger.info(f"DEBUG ZZZ: Exception {e}")
                return False, str(e)

        error_trace = "AssertionError: assert 12 == 5"
        
        # Run the Tree: it will check all 3 branches via `real_validator` and choose the green one
        best_patch = asyncio.run(agent.search_best_patch(broken_code, error_trace, real_validator, branches=3))
        
        # We verify that the algorithm found the only one        # The tree should have gone down the second branch and returned it
        assert best_patch.strip() == "def divide(a, b):\n    return a / b".strip()


@patch("core.gemini_agent.GeminiCore")
def test_quantum_atropos_mcts_failure(MockGemini):
    """
    If no patch passes the tests, the tree should return None.
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
        
        # The tree should collapse and return None since all branches are red
        assert best_patch is None
