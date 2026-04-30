import subprocess
import os
from core.logger import logger

class GitMorph:
    """
    Version control system ('Undo' button for generations).
    As soon as the AI writes code, Git-Morph makes a commit. On failure - revert.
    Ensures that the business project will never be permanently broken.
    """
    def __init__(self, workspace_path: str):
        self.workspace_path = workspace_path
        self._init_repo()

    def _init_repo(self):
        if not os.path.exists(os.path.join(self.workspace_path, ".git")):
            subprocess.run(["git", "init"], cwd=self.workspace_path, capture_output=True)
            self.commit("Initial SaaS Skeleton created by OS")
            
    def commit(self, message: str) -> bool:
        subprocess.run(["git", "add", "."], cwd=self.workspace_path, capture_output=True)
        res = subprocess.run(["git", "commit", "-m", message], cwd=self.workspace_path, capture_output=True)
        if res.returncode == 0:
            logger.info(f"📦 [Git-Morph] AI has committed the changes: {message}")
            return True
        return False
        
    def rollback(self) -> bool:
        """Rollback of the last AI-commit if Pytest or UI-build failed (or at the user's request)"""
        logger.info("⏪ [Git-Morph] Critical bug. Initiating rollback (git reset --hard HEAD~1)...")
        res = subprocess.run(["git", "reset", "--hard", "HEAD~1"], cwd=self.workspace_path, capture_output=True)
        return res.returncode == 0
