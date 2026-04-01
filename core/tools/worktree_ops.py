"""
worktree_ops.py — Task 33: Git Worktree Tools
Инструменты EnterWorktree/ExitWorktree для изоляции компиляции:
- EnterWorktree: создаёт git worktree в /tmp, переключается на изолированную ветку
- ExitWorktree: применяет diff обратно или откатывает, чистит worktree
"""
import os
import subprocess
import tempfile
import uuid
import shutil
from pathlib import Path
from typing import Optional
from core.logger import logger


class WorktreeRegistry:
    """Глобальный реестр активных worktree сессий."""
    _sessions: dict[str, dict] = {}  # session_id -> {branch, wt_path, original_cwd, base_path}


class WorktreeTools:
    """
    Task 33 — Git Worktree Management для изолированной компиляции/сборки.
    Не ломает рабочую директорию проекта при экспериментах с кодом.
    """

    @staticmethod
    def _run_git(cmd: list[str], cwd: str) -> tuple[bool, str]:
        """Запускает git команду, возвращает (success, output)."""
        try:
            result = subprocess.run(
                ["git"] + cmd,
                cwd=cwd,
                capture_output=True,
                text=True,
                timeout=30
            )
            if result.returncode == 0:
                return True, result.stdout.strip()
            return False, result.stderr.strip()
        except subprocess.TimeoutExpired:
            return False, "Error: git command timed out."
        except FileNotFoundError:
            return False, "Error: git not found in PATH."

    @staticmethod
    def _get_git_root(path: str) -> Optional[str]:
        """Находит корень git репозитория."""
        ok, out = WorktreeTools._run_git(["rev-parse", "--show-toplevel"], path)
        return out if ok else None

    @staticmethod
    def enter_worktree(
        project_path: str,
        branch_name: Optional[str] = None,
        base_branch: str = "HEAD"
    ) -> str:
        """
        [EnterWorktree] Создаёт изолированный git worktree во временной папке.
        
        Args:
            project_path: путь к проекту (должен быть git репозиторием)
            branch_name: имя новой ветки (авто-генерируется если None)
            base_branch: базовая ветка/коммит для worktree (по умолчанию HEAD)
        
        Returns:
            session_id для использования в ExitWorktree, или строку ошибки.
        """
        project_path = str(Path(project_path).resolve())
        git_root = WorktreeTools._get_git_root(project_path)
        if not git_root:
            return f"Error: {project_path} is not inside a git repository."

        session_id = f"wt-{uuid.uuid4().hex[:8]}"
        auto_branch = branch_name or f"morph/sandbox-{session_id}"

        # Создаём временную папку для worktree
        wt_base = Path(tempfile.gettempdir() if hasattr(shutil, 'gettempdir') else "/tmp")
        wt_path = str(wt_base / f"morphs_wt_{session_id}")

        # git worktree add -b <branch> <path> <base>
        ok, out = WorktreeTools._run_git(
            ["worktree", "add", "-b", auto_branch, wt_path, base_branch],
            git_root
        )
        if not ok:
            return f"Error: Failed to create worktree — {out}"

        WorktreeRegistry._sessions[session_id] = {
            "branch": auto_branch,
            "wt_path": wt_path,
            "git_root": git_root,
            "base_branch": base_branch,
            "project_path": project_path,
        }

        logger.info(f"🌿 [Worktree] Session '{session_id}' created: branch='{auto_branch}' path='{wt_path}'")
        return (
            f"Success: Worktree ready.\n"
            f"  session_id : {session_id}\n"
            f"  branch     : {auto_branch}\n"
            f"  path       : {wt_path}\n"
            f"  Use this path for isolated builds. Call exit_worktree('{session_id}') to clean up."
        )

    @staticmethod
    def get_worktree_path(session_id: str) -> str:
        """
        Возвращает путь к worktree директории для указанной сессии.
        Используй этот путь при вызове build-инструментов вместо project root.
        """
        if session_id not in WorktreeRegistry._sessions:
            return f"Error: Session '{session_id}' not found."
        return WorktreeRegistry._sessions[session_id]["wt_path"]

    @staticmethod
    def commit_worktree_changes(session_id: str, commit_message: str) -> str:
        """
        [WorktreeCommit] Коммитит все изменения в worktree ветку.
        """
        if session_id not in WorktreeRegistry._sessions:
            return f"Error: Session '{session_id}' not found."

        info = WorktreeRegistry._sessions[session_id]
        wt_path = info["wt_path"]

        ok, out = WorktreeTools._run_git(["add", "-A"], wt_path)
        if not ok:
            return f"Error during git add: {out}"

        ok, out = WorktreeTools._run_git(["commit", "-m", commit_message, "--allow-empty"], wt_path)
        if not ok:
            return f"Error during git commit: {out}"

        logger.info(f"📦 [Worktree] Committed changes in session '{session_id}': {commit_message}")
        return f"Success: Changes committed in worktree branch '{info['branch']}'."

    @staticmethod
    def merge_worktree_to_main(session_id: str, target_branch: str = "main") -> str:
        """
        [WorktreeMerge] Мерджит изменения из worktree ветки в target_branch.
        Worktree должен быть закоммичен перед мерджем.
        """
        if session_id not in WorktreeRegistry._sessions:
            return f"Error: Session '{session_id}' not found."

        info = WorktreeRegistry._sessions[session_id]
        git_root = info["git_root"]
        wt_branch = info["branch"]

        # Создаём patch из изменений worktree ветки
        ok, diff = WorktreeTools._run_git(
            ["diff", info["base_branch"], wt_branch, "--"],
            git_root
        )
        if not ok:
            return f"Error generating diff: {diff}"

        if not diff.strip():
            return f"Info: No changes in worktree to merge."

        # Применяем diff к main
        ok, out = WorktreeTools._run_git(["checkout", target_branch], git_root)
        if not ok:
            return f"Error: Could not checkout '{target_branch}': {out}"

        ok, out = WorktreeTools._run_git(
            ["merge", "--no-ff", wt_branch, "-m", f"Merge morph sandbox {session_id}"],
            git_root
        )
        if not ok:
            return f"Error merging worktree branch: {out}"

        logger.info(f"✅ [Worktree] Merged branch '{wt_branch}' → '{target_branch}'")
        return f"Success: Merged worktree branch '{wt_branch}' into '{target_branch}'."

    @staticmethod
    def exit_worktree(session_id: str, apply_changes: bool = False, target_branch: str = "main") -> str:
        """
        [ExitWorktree] Завершает worktree сессию: применяет или откатывает изменения.
        
        Args:
            session_id: ID сессии от enter_worktree
            apply_changes: если True — мерджит изменения в target_branch перед удалением
            target_branch: ветка для слияния (при apply_changes=True)
        
        Returns: строка с результатом операции.
        """
        if session_id not in WorktreeRegistry._sessions:
            return f"Error: Session '{session_id}' not found."

        info = WorktreeRegistry._sessions[session_id]
        wt_path = info["wt_path"]
        wt_branch = info["branch"]
        git_root = info["git_root"]

        merge_result = ""
        if apply_changes:
            # Коммитим и мерджим
            commit_res = WorktreeTools.commit_worktree_changes(session_id, f"Auto-commit by morph {session_id}")
            merge_result = WorktreeTools.merge_worktree_to_main(session_id, target_branch)
        else:
            merge_result = "Changes discarded (apply_changes=False)."

        # Удаляем worktree
        ok, out = WorktreeTools._run_git(
            ["worktree", "remove", "--force", wt_path],
            git_root
        )
        if not ok:
            # Fallback: ручная очистка
            shutil.rmtree(wt_path, ignore_errors=True)

        # Удаляем ветку sandbox
        WorktreeTools._run_git(["branch", "-D", wt_branch], git_root)

        del WorktreeRegistry._sessions[session_id]
        logger.info(f"🧹 [Worktree] Session '{session_id}' cleaned up. Branch '{wt_branch}' deleted.")

        return (
            f"Success: Worktree session '{session_id}' closed.\n"
            f"  {merge_result}\n"
            f"  Temp path '{wt_path}' removed."
        )

    @staticmethod
    def list_worktrees(project_path: str = ".") -> str:
        """Показывает все активные git worktrees для проекта."""
        project_path = str(Path(project_path).resolve())
        git_root = WorktreeTools._get_git_root(project_path)
        if not git_root:
            return f"Error: Not a git repository."

        ok, out = WorktreeTools._run_git(["worktree", "list", "--porcelain"], git_root)
        if not ok:
            return f"Error listing worktrees: {out}"

        active_sessions = len(WorktreeRegistry._sessions)
        return f"Active Morphs sessions: {active_sessions}\n\nAll git worktrees:\n{out}"

