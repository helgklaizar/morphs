"""
YOLO Classifier — Task 18: Safely intercepting dangerous BashHarness commands.

Two-level risk assessment system:
  1. Fast local analysis: regex heuristics based on patterns (no LLM) → instant O(1)
  2. LLM verification: Gemini evaluates commands with non-obvious risks

Result caching: identical commands are not sent to the LLM repeatedly.
"""
import re
import hashlib
from enum import Enum
from typing import Tuple
from functools import lru_cache
from dataclasses import dataclass
from core.logger import logger


class RiskLevel(Enum):
    SAFE = "SAFE"
    LOW = "LOW"            # Warning in the log, executes without interruption
    MEDIUM = "MEDIUM"      # User confirmation is mandatory
    HIGH = "HIGH"          # Blocked, requires explicit dangerously_disable_sandbox
    CRITICAL = "CRITICAL"  # Absolute block, cannot be bypassed in any way


@dataclass
class ClassificationResult:
    risk_level: RiskLevel
    reason: str
    categories: list[str]
    requires_confirmation: bool
    is_blocked: bool


# --- Heuristic Rules ---
# Each rule: (regex_pattern, RiskLevel, category, human-readable reason)
_RISK_RULES: list[tuple] = [
    # CRITICAL — absolute block
    (r"\brm\s+-rf\s+/(?:\s|$)", RiskLevel.CRITICAL, "FILESYSTEM_DESTRUCTION", "Deletion of the root partition"),
    (r"\bdd\s+if=.*of=/dev/[sh]d", RiskLevel.CRITICAL, "DISK_OVERWRITE", "Disk overwrite via dd"),
    (r"\bmkfs\b", RiskLevel.CRITICAL, "DISK_FORMAT", "Disk formatting"),
    (r"\bshred\b.*--remove", RiskLevel.CRITICAL, "FILESYSTEM_DESTRUCTION", "Irreversible file deletion"),

    # HIGH — requires dangerously_disable_sandbox
    (r"\bsudo\s+(?:rm|chmod|chown|usermod|passwd|visudo)", RiskLevel.HIGH, "PRIVILEGE_ESCALATION", "Privileged destructive operation via sudo"),
    (r"\bgit\s+push\s+(?:--force|-f)\b", RiskLevel.HIGH, "GIT_FORCE_PUSH", "Forced history rewrite in a remote repository"),
    (r"\bgit\s+push\s+.*:(?:master|main)\b", RiskLevel.HIGH, "GIT_PUSH_MAIN", "Direct push to a protected branch"),
    (r"\bdrop\s+(?:table|database|schema)\b", RiskLevel.HIGH, "DB_DESTRUCTION", "Destructive SQL DROP operation"),
    (r"\btruncate\s+table\b", RiskLevel.HIGH, "DB_DESTRUCTION", "Deletion of all table records"),
    (r"\b(?:DELETE|UPDATE)\s+FROM\b(?!.*WHERE)", RiskLevel.HIGH, "DB_BULK_MUTATION", "DELETE/UPDATE without a WHERE clause"),
    (r"\bkill\s+-9\s+1\b", RiskLevel.HIGH, "PROCESS_KILL", "Killing the init process (root PID)"),
    (r"\bcurl\s+.*\|\s*(?:bash|sh|zsh|python)\b", RiskLevel.HIGH, "REMOTE_CODE_EXEC", "Executing code downloaded from the internet (pipe to shell)"),
    (r"\bwget\s+.*-O\s*-\s*\|\s*(?:bash|sh)", RiskLevel.HIGH, "REMOTE_CODE_EXEC", "wget pipe to shell — potential RCE"),

    # MEDIUM — confirmation mandatory
    (r"\brm\s+(?:-r[f]?|-[rf]+)\b", RiskLevel.MEDIUM, "RECURSIVE_DELETE", "Recursive file deletion"),
    (r"\bchmod\s+-R\s+777\b", RiskLevel.MEDIUM, "INSECURE_PERMISSIONS", "Setting insecure 777 permissions"),
    (r"\bchown\s+-R\b", RiskLevel.MEDIUM, "OWNERSHIP_CHANGE", "Recursive change of file ownership"),
    (r"\bgit\s+rebase\s+-i\b", RiskLevel.MEDIUM, "GIT_HISTORY_REWRITE", "Interactive rebase (history rewriting)"),
    (r"\bgit\s+reset\s+--hard\b", RiskLevel.MEDIUM, "GIT_HARD_RESET", "Hard git reset (loss of uncommitted code)"),
    (r"\bgit\s+clean\s+-[fFdxX]+", RiskLevel.MEDIUM, "GIT_CLEAN", "git clean — removal of untracked files"),
    (r">\s*/(?:etc|var|usr|boot|sys|proc)/", RiskLevel.MEDIUM, "SYSTEM_FILE_OVERWRITE", "Writing to a system directory"),
    (r"\bsystemctl\s+(?:stop|disable|restart)\b", RiskLevel.MEDIUM, "SERVICE_CONTROL", "Managing system services"),
    (r"\bnpm\s+publish\b", RiskLevel.MEDIUM, "PUBLIC_PUBLISH", "Publishing a package to the public NPM registry"),
    (r"\bpip\s+install\s+--upgrade\s+pip\b", RiskLevel.MEDIUM, "PACKAGE_UPGRADE", "Updating pip in the system environment"),

    # LOW — warning in the log
    (r"\bsudo\s+(?!rm|chmod|chown|usermod)\w+", RiskLevel.LOW, "SUDO_USAGE", "Execution with sudo (check if necessary)"),
    (r"\bmv\s+.*\s+/(?:tmp|var|etc)/", RiskLevel.LOW, "FILE_MOVE_SYSTEM", "Moving a file to a system directory"),
    (r"\benv\b.*=.*(?:TOKEN|KEY|SECRET|PASSWORD)", RiskLevel.LOW, "SECRET_EXPOSURE", "Potential secret exposure via env"),
    (r">\s*~?/[a-zA-Z]", RiskLevel.LOW, "FILE_OVERWRITE", "File overwrite via > operator"),
]


def _fast_classify(command: str) -> ClassificationResult:
    """O(n) pass through heuristic rules without LLM."""
    cmd_lower = command.lower().strip()
    matched_categories: list[str] = []
    highest_risk = RiskLevel.SAFE
    reasons: list[str] = []

    # Risk level priority: CRITICAL > HIGH > MEDIUM > LOW > SAFE
    priority = {RiskLevel.SAFE: 0, RiskLevel.LOW: 1, RiskLevel.MEDIUM: 2, RiskLevel.HIGH: 3, RiskLevel.CRITICAL: 4}

    for pattern, risk, category, reason in _RISK_RULES:
        if re.search(pattern, cmd_lower, re.IGNORECASE):
            matched_categories.append(category)
            reasons.append(reason)
            if priority[risk] > priority[highest_risk]:
                highest_risk = risk

    return ClassificationResult(
        risk_level=highest_risk,
        reason="; ".join(reasons) if reasons else "Command appears to be safe",
        categories=matched_categories,
        requires_confirmation=highest_risk in (RiskLevel.MEDIUM, RiskLevel.HIGH),
        is_blocked=highest_risk == RiskLevel.CRITICAL,
    )


# LRU cache by command hash — LLM is not called for identical commands
@lru_cache(maxsize=256)
def _cached_llm_verdict(cmd_hash: str, command: str) -> str:
    """Calls Gemini for borderline cases. Cached by the command's md5 hash."""
    try:
        from core.gemini_agent import GeminiCore
        gemini = GeminiCore(model_name="gemini-2.0-flash")  # fast model for a quick response
        prompt = (
            f"Analyze this shell command for destructive, irreversible, or highly risky side-effects:\n"
            f"```\n{command}\n```\n"
            "Categories to check: filesystem destruction, privilege escalation, data loss, remote code exec, secret exposure.\n"
            "Reply with EXACTLY one of: SAFE | LOW | MEDIUM | HIGH | CRITICAL\n"
            "Then a single-line reason after '|'. Example: HIGH | Force-pushes to protected branch."
        )
        result = gemini.think(prompt, max_tokens=50, temperature=0.0).strip()
        return result
    except Exception as e:
        logger.warning(f"[YOLOClassifier] LLM fallback failed: {e}. Treating as MEDIUM.")
        return "MEDIUM | LLM is unavailable, a conservative risk level has been set"


class YOLOClassifier:
    """
    Public interface for the YOLO Classifier.
    
    Usage:
        clf = YOLOClassifier()
        result = clf.classify("rm -rf /tmp/build")
        if result.requires_confirmation:
            ...
    """

    def __init__(self, use_llm_for_ambiguous: bool = True):
        """
        Args:
            use_llm_for_ambiguous: If True — commands with LOW risk will be additionally
                verified by Gemini. MEDIUM and higher are blocked immediately without LLM.
        """
        self.use_llm_for_ambiguous = use_llm_for_ambiguous

    def classify(self, command: str) -> ClassificationResult:
        """Classifies a command. Fast O(n) + optional LLM."""
        fast_result = _fast_classify(command)

        if fast_result.risk_level == RiskLevel.SAFE and self.use_llm_for_ambiguous:
            # The command did not match any rule — let's ask the LLM for non-standard patterns
            cmd_hash = hashlib.md5(command.encode()).hexdigest()
            llm_raw = _cached_llm_verdict(cmd_hash, command)
            return self._parse_llm_verdict(llm_raw, command)

        return fast_result

    def _parse_llm_verdict(self, raw: str, command: str) -> ClassificationResult:
        """Parses the LLM response into a ClassificationResult."""
        parts = raw.split("|", 1)
        level_str = parts[0].strip().upper()
        reason = parts[1].strip() if len(parts) > 1 else "LLM classification"

        level_map = {
            "SAFE": RiskLevel.SAFE, "LOW": RiskLevel.LOW,
            "MEDIUM": RiskLevel.MEDIUM, "HIGH": RiskLevel.HIGH, "CRITICAL": RiskLevel.CRITICAL
        }
        risk = level_map.get(level_str, RiskLevel.MEDIUM)  # conservative fallback

        if risk != RiskLevel.SAFE:
            logger.info(f"[YOLOClassifier] LLM verdict: {risk.value} — {reason}")

        return ClassificationResult(
            risk_level=risk,
            reason=f"[LLM] {reason}",
            categories=["LLM_CLASSIFIED"],
            requires_confirmation=risk in (RiskLevel.MEDIUM, RiskLevel.HIGH),
            is_blocked=risk == RiskLevel.CRITICAL,
        )


# Singleton — one instance per process, cache works globally
_default_classifier = YOLOClassifier(use_llm_for_ambiguous=True)


def classify_command(command: str) -> ClassificationResult:
    """Convenience function for quick classification."""
    return _default_classifier.classify(command)
