import os
import pytest
from core.healer_morph import HealerMorph
from unittest.mock import patch

@patch("core.healer_morph.QuantumAtropos")
@patch("core.atropos_memory.AtroposMemory")
def test_healer_real_patching(mock_memory, mock_quantum, tmp_path):
    async def run_test():
        target_file = tmp_path / "math.ts"
        target_file.write_text("def my_broken_code(): pass")
        
        mock_instance = mock_quantum.return_value
        from unittest.mock import AsyncMock
        mock_instance.search_best_patch = AsyncMock(return_value="def my_fixed_code(): return 1")
        
        # Mock evidence directory
        task_dir = tmp_path / "task"
        os.makedirs(task_dir / "evidence", exist_ok=True)
        with open(task_dir / "evidence" / "build.txt", "w") as f:
            f.write("SyntaxError at line 1")
            
        healer = HealerMorph(str(tmp_path), str(target_file))
        log, success = await healer.heal_code(str(task_dir))
        
        assert success is True
        assert "SyntaxError at line 1" in log
        assert target_file.read_text() == "def my_fixed_code(): return 1"
        mock_instance.search_best_patch.assert_called_once()
    
    import asyncio
    asyncio.run(run_test())
