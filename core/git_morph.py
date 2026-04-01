import subprocess
import os
from core.logger import logger

class GitMorph:
    """
    Система контроля версий (Кнопка 'Отмена' для генераций).
    Как только ИИ пишет код, Git-Morph делает commit. При неудаче - revert.
    Гарантирует, что бизнес-проект никогда не будет сломан навсегда.
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
            logger.info(f"📦 [Git-Morph] AI Закоммитил изменения: {message}")
            return True
        return False
        
    def rollback(self) -> bool:
        """Откат последнего ИИ-коммита, если Pytest или UI-билд сломался (или по просьбе юзера)"""
        logger.info("⏪ [Git-Morph] Критический баг. Запускаю откат (git reset --hard HEAD~1)...")
        res = subprocess.run(["git", "reset", "--hard", "HEAD~1"], cwd=self.workspace_path, capture_output=True)
        return res.returncode == 0
