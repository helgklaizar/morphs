import os
import json
from core.logger import logger

class TaskProofMorph:
    """
    Local Evidence-Driven Workflow.
    Manages audit folders (Durable Task Folders) for tasks.
    Implements the following concepts:
    1. Isolated Task Folders
    2. Specification Freezing (Spec Freeze)
    3. Task-Scoped Ephemeral Roles (Task-Scoped Subagents)
    4. Evidence-Based Pipeline (Evidence Collection)
    """
    def __init__(self, workspace_dir: str):
        self.workspace_dir = os.path.abspath(workspace_dir)
        self.tasks_dir = os.path.join(self.workspace_dir, ".tasks")
        os.makedirs(self.tasks_dir, exist_ok=True)
        
    def get_task_folder(self, task_id: str) -> str:
        return os.path.join(self.tasks_dir, task_id)

    def init_task(self, task_id: str, original_spec: str) -> str:
        """1. Create an audit folder and initialize the spec."""
        folder = self.get_task_folder(task_id)
        os.makedirs(folder, exist_ok=True)
        os.makedirs(os.path.join(folder, "evidence"), exist_ok=True)
        os.makedirs(os.path.join(folder, ".agents"), exist_ok=True)
        
        spec_path = os.path.join(folder, "spec.md")
        with open(spec_path, "w", encoding="utf-8") as f:
            f.write("# Task Specification\n\n")
            f.write(original_spec)
            
        logger.info(f"📁 [TaskProof-Morph] Task folder initialized: {folder}")
        return folder

    def freeze_spec(self, task_id: str) -> str:
        """2. Specification Freezing (Spec Freeze). Read and fixate."""
        spec_path = os.path.join(self.get_task_folder(task_id), "spec.md")
        if not os.path.exists(spec_path):
            raise FileNotFoundError("Specification not found!")
            
        # In a real Linux system, you could use os.chmod(spec_path, 0o444) 
        # to make it read-only.
        with open(spec_path, "r", encoding="utf-8") as f:
            frozen_spec = f.read()
            
        logger.info(f"❄️ [TaskProof-Morph] Specification frozen for {task_id}. No more hallucinations.")
        return frozen_spec

    def generate_subagent_prompts(self, task_id: str, context: str):
        """3. Task-Scoped Ephemeral Roles (Task-Scoped Subagents)."""
        agents_folder = os.path.join(self.get_task_folder(task_id), ".agents")
        
        # Instructions for the Coder
        coder_prompt = f"""# Frozen context for the coder
The entire architecture and dependencies for your work:
{context}

Your sole purpose is to implement spec.md. Any deviation is a failure.
"""
        with open(os.path.join(agents_folder, "task-builder.md"), "w", encoding="utf-8") as f:
            f.write(coder_prompt)
            
        # Instructions for the Architect
        reviewer_prompt = """# Frozen context for the Architect
You must review the code strictly according to the specification (spec.md) and the collected evidence (evidence/).
If the evidence/build.txt file is missing or the tests have not passed, YOU ARE NOT ALLOWED TO APPROVE THE CODE.
"""
        with open(os.path.join(agents_folder, "task-reviewer.md"), "w", encoding="utf-8") as f:
            f.write(reviewer_prompt)
            
        logger.info(f"🎭 [TaskProof-Morph] Local system prompts generated in {agents_folder}")

    def collect_evidence(self, task_id: str, filename: str, content: str):
        """4. Evidence-based pipeline. Collect logs, bugs, test results."""
        evidence_folder = os.path.join(self.get_task_folder(task_id), "evidence")
        path = os.path.join(evidence_folder, filename)
        
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
            
        logger.info(f"💼 [TaskProof-Morph] Evidence added: {filename}")
        
    def write_verdict(self, task_id: str, verdict_data: dict):
        """Final verdict."""
        folder = self.get_task_folder(task_id)
        with open(os.path.join(folder, "verdict.json"), "w", encoding="utf-8") as f:
            json.dump(verdict_data, f, indent=4, ensure_ascii=False)
        logger.info(f"⚖️ [TaskProof-Morph] Verdict rendered: {verdict_data.get('status')}")
        
    def verify_ready_for_review(self, task_id: str) -> bool:
        """The Architect asks: is the proof ready?"""
        evidence_folder = os.path.join(self.get_task_folder(task_id), "evidence")
        build_log = os.path.join(evidence_folder, "build.txt")
        if not os.path.exists(build_log):
            return False
            
        with open(build_log, "r", encoding="utf-8") as f:
            content = f.read()
            if "failed" in content.lower() or "error" in content.lower() and "success" not in content.lower():
                return False
                
        return True
