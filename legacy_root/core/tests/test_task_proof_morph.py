import os
import shutil
from core.task_proof_morph import TaskProofMorph

def test_task_proof():
    workspace_dir = "tmp_task_proof_ws"
    try:
        morph = TaskProofMorph(workspace_dir)
        task_id = "task_01"
        
        # 1. init
        folder = morph.init_task(task_id, "Build a button")
        assert os.path.exists(folder)
        assert os.path.exists(os.path.join(folder, "spec.md"))
        
        # 2. freeze
        frozen = morph.freeze_spec(task_id)
        assert "Build a button" in frozen
        
        # 3. generate agents
        morph.generate_subagent_prompts(task_id, "React + Tailwind")
        assert os.path.exists(os.path.join(folder, ".agents", "task-builder.md"))
        
        # 4. collect evidence
        morph.collect_evidence(task_id, "build.txt", "Build success")
        assert os.path.exists(os.path.join(folder, "evidence", "build.txt"))
        
        # 5. verify
        is_ready = morph.verify_ready_for_review(task_id)
        assert is_ready is True
        
        morph.collect_evidence(task_id, "build.txt", "Build failed with error")
        assert morph.verify_ready_for_review(task_id) is False
        
        # 6. verdict
        morph.write_verdict(task_id, {"status": "SUCCESS"})
        assert os.path.exists(os.path.join(folder, "verdict.json"))
        
    finally:
        shutil.rmtree(workspace_dir, ignore_errors=True)
