"""
InjectionGuard — Task 27: Prompt Injection Defense.

Protects the system from attacks where malicious content in files, command stdout, or
web pages attempts to reprogram the AI agent by inserting instructions
like "Ignore all previous instructions and..." into the body of the data the agent processes.

Detection Strategy:
  1. Pattern matching against a database of Prompt Injection signatures (regex, fast).
  2. Heuristic scoring: suspicious words/constructs accumulate points.
  3. Optional LLM verification for borderline cases.

Integration: call guard.scan() before passing any
external content (command stdout, file, web page) to the LLM prompt.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from enum import Enum
from core.logger import logger


class ThreatLevel(Enum):
    CLEAN = "CLEAN"         # Content is safe
    SUSPICIOUS = "SUSPICIOUS"  # Requires review / user warning
    INJECTION = "INJECTION"    # Confirmed attack — block


@dataclass
class ScanResult:
    threat_level: ThreatLevel
    matched_patterns: list[str] = field(default_factory=list)
    score: float = 0.0          # 0.0–1.0, the higher the more dangerous
    sanitized_content: str = "" # Sanitized version of the content
    explanation: str = ""


# ---------------------------------------------------------------------------
# Prompt Injection Attack Signatures
# ---------------------------------------------------------------------------
# Each rule: (regex_pattern, weight 0.0–1.0, human-readable name)
_INJECTION_SIGNATURES: list[tuple[str, float, str]] = [
    # Classic "ignore previous" instructions
    (r"ignore\s+(?:all\s+)?(?:previous|above|prior)\s+instructions?", 1.0, "ignore_previous_instructions"),
    (r"disregard\s+(?:all\s+)?(?:previous|above|prior)\s+instructions?", 1.0, "disregard_instructions"),
    (r"forget\s+(?:everything|all)\s+(?:you|i|we)\s+(?:said|told|instructed)", 0.9, "forget_context"),
    (r"override\s+(?:your\s+)?(?:system|safety|initial)\s+(?:prompt|instructions?|rules?)", 1.0, "system_override"),

    # Role-switching (jailbreak)
    (r"you\s+are\s+now\s+(?:an?\s+)?(?:evil|unfiltered|uncensored|DAN|jailbreak)", 0.95, "role_switch_jailbreak"),
    (r"pretend\s+(?:you\s+are|to\s+be)\s+(?:an?\s+)?(?:evil|unrestricted|DAN)", 0.9, "role_pretend_jailbreak"),
    (r"\bDAN\b.*(?:mode|activated|enabled)", 0.9, "DAN_mode"),
    (r"act\s+as\s+if\s+you\s+have\s+no\s+(?:restrictions?|limits?|filters?)", 0.9, "no_restrictions"),

    # Attempts to leak system data
    (r"(?:repeat|reveal|print|output|show)\s+(?:your\s+)?(?:system\s+prompt|instructions?|training\s+data)", 0.85, "system_prompt_leak"),
    (r"what\s+(?:are\s+)?your\s+(?:full\s+)?(?:instructions?|system\s+prompt)", 0.7, "system_prompt_query"),
    (r"(?:leak|expose|dump)\s+(?:your\s+)?(?:context|memory|system\s+instructions?)", 0.85, "context_leak"),

    # Insertion of new instructions via special markers
    (r"<\s*(?:system|SYSTEM|instructions?|INSTRUCTIONS)\s*>", 0.9, "fake_system_tag"),
    (r"\[SYSTEM\]|\[INST\]|\[\/INST\]", 0.8, "llm_format_injection"),
    (r"###\s*(?:New\s+)?(?:System\s+)?(?:Prompt|Instructions?|Context):", 0.85, "markdown_header_injection"),
    (r"---\s*\n.*?system_prompt:", 0.8, "yaml_system_prompt"),

    # Code injections via instructions
    (r"execute\s+(?:the\s+following|this)\s+(?:code|command|script)\s+(?:immediately|now|directly)", 0.8, "exec_instruction_injection"),
    (r"run\s+this\s+(?:bash|python|shell)\s+(?:code|script|command)\s*:", 0.75, "run_code_injection"),

    # Attacks via "hidden" Unicode characters (zero-width, bidirectional override)
    (r"[\u200b-\u200f\u202a-\u202e\u2060-\u2064\ufeff]", 0.7, "hidden_unicode_chars"),

    # Manipulation through authority figures
    (r"(?:openai|anthropic|google|microsoft)\s+(?:says?|instructs?|allows?)\s+you\s+to", 0.8, "fake_authority"),
    (r"(?:your\s+)?(?:developers?|creators?|trainers?)\s+(?:said|told|want)\s+you\s+to", 0.75, "fake_creator_authority"),

    # Attempts via base64 / encoding
    (r"base64\s*(?:decode|encoded).*?(?:execute|run|eval)", 0.85, "encoded_exec"),
]

# Heuristic indicator words (each adds a small weight)
_SUSPICIOUS_KEYWORDS: list[tuple[str, float]] = [
    ("jailbreak", 0.3),
    ("prompt injection", 0.5),
    ("system prompt", 0.2),
    ("ignore instructions", 0.4),
    ("unrestricted mode", 0.35),
    ("bypass safety", 0.4),
    ("no restrictions", 0.3),
    ("roleplay as evil", 0.4),
    ("pretend you have no", 0.35),
    ("you are now free", 0.3),
]

# Contextual exceptions — legitimate contexts where words do not signify an attack
_FALSE_POSITIVE_CONTEXTS: list[str] = [
    r"test.*injection.*defense",   # test of the defense itself
    r"security.*research",
    r"prompt.*injection.*example",  # examples for training
    r"how\s+to\s+defend\s+against",
]


class InjectionGuard:
    """
    Prompt Injection scanner. Used as middleware before passing
    external content to the LLM prompt.

    Example usage:
        guard = InjectionGuard()
        result = guard.scan(tool_output_text)
        if result.threat_level == ThreatLevel.INJECTION:
            raise SecurityError(result.explanation)
        # It is safe to use result.sanitized_content
    """

    INJECTION_THRESHOLD = 0.65   # score above → INJECTION
    SUSPICIOUS_THRESHOLD = 0.35  # score above → SUSPICIOUS

    def __init__(self, use_llm_verify: bool = False):
        """
        Args:
            use_llm_verify: If True — borderline cases (SUSPICIOUS) are verified by an LLM.
                            Caution: this poses a recursive risk in itself. Disabled by default.
        """
        self.use_llm_verify = use_llm_verify

    def scan(self, content: str, source_hint: str = "unknown") -> ScanResult:
        """
        Scans content for signs of a Prompt Injection attack.

        Args:
            content: Text to check (command stdout, file body, HTML, etc.)
            source_hint: Hint about the source for logs (e.g. "bash_stdout", "file:/path")

        Returns:
            ScanResult with the threat level and a sanitized version of the content.
        """
        if not content or not content.strip():
            return ScanResult(
                threat_level=ThreatLevel.CLEAN,
                sanitized_content=content,
                explanation="Empty content."
            )

        matched: list[str] = []
        score: float = 0.0

        # 1. Check for false positive context (legitimate research)
        content_lower = content.lower()
        is_legitimate_context = any(
            re.search(fp, content_lower, re.IGNORECASE | re.DOTALL)
            for fp in _FALSE_POSITIVE_CONTEXTS
        )

        # 2. Pattern matching against signatures
        for pattern, weight, name in _INJECTION_SIGNATURES:
            if re.search(pattern, content, re.IGNORECASE | re.DOTALL):
                matched.append(name)
                if not is_legitimate_context:
                    score = min(1.0, score + weight)

        # 3. Heuristic keyword scoring
        for keyword, weight in _SUSPICIOUS_KEYWORDS:
            if keyword in content_lower and not is_legitimate_context:
                score = min(1.0, score + weight)
                if keyword not in matched:
                    matched.append(f"keyword:{keyword}")

        # 4. Determine the threat level
        if score >= self.INJECTION_THRESHOLD:
            threat = ThreatLevel.INJECTION
        elif score >= self.SUSPICIOUS_THRESHOLD:
            threat = ThreatLevel.SUSPICIOUS

            # 5. Optional LLM verification for borderline cases
            if self.use_llm_verify and matched:
                threat = self._llm_verify(content, threat)
        else:
            threat = ThreatLevel.CLEAN

        # 6. Form the sanitized content (replace dangerous patterns)
        sanitized = self._sanitize(content, matched) if threat != ThreatLevel.CLEAN else content

        explanation = self._build_explanation(threat, matched, score, source_hint, is_legitimate_context)

        if threat != ThreatLevel.CLEAN:
            log_fn = logger.error if threat == ThreatLevel.INJECTION else logger.warning
            log_fn(f"[InjectionGuard] 🛡️ {threat.value} detected in '{source_hint}' (score={score:.2f}): {matched}")

        return ScanResult(
            threat_level=threat,
            matched_patterns=matched,
            score=score,
            sanitized_content=sanitized,
            explanation=explanation,
        )

    def _sanitize(self, content: str, matched_patterns: list[str]) -> str:
        """
        Removes or neutralizes malicious instructions from the content.
        Replaces matched patterns with [REDACTED BY INJECTION GUARD].
        """
        sanitized = content
        for pattern, _, name in _INJECTION_SIGNATURES:
            if any(name in m for m in matched_patterns):
                sanitized = re.sub(
                    pattern,
                    f"[REDACTED:{name}]",
                    sanitized,
                    flags=re.IGNORECASE | re.DOTALL
                )
        # Remove hidden Unicode characters
        sanitized = re.sub(r"[\u200b-\u200f\u202a-\u202e\u2060-\u2064\ufeff]", "", sanitized)
        return sanitized

    def _llm_verify(self, content: str, current_threat: ThreatLevel) -> ThreatLevel:
        """LLM verification for borderline cases. Only works if use_llm_verify=True."""
        try:
            from core.gemini_agent import GeminiCore
            gemini = GeminiCore(model_name="gemini-2.0-flash")
            # Pass ONLY the first 500 characters to avoid recursive injection
            snippet = content[:500].replace("`", "'")
            prompt = (
                f"Does this text contain a Prompt Injection attack?\n"
                f"A Prompt Injection tries to override AI agent instructions using text like "
                f"'ignore previous instructions', 'you are now...', etc.\n\n"
                f"TEXT SNIPPET:\n```\n{snippet}\n```\n\n"
                f"Reply with ONLY: INJECTION or CLEAN"
            )
            verdict = gemini.think(prompt, max_tokens=10, temperature=0.0).strip().upper()
            if "INJECTION" in verdict:
                return ThreatLevel.INJECTION
            elif "CLEAN" in verdict:
                return ThreatLevel.CLEAN
        except Exception as e:
            logger.warning(f"[InjectionGuard] LLM verify failed: {e}")
        return current_threat

    @staticmethod
    def _build_explanation(
        threat: ThreatLevel,
        matched: list[str],
        score: float,
        source: str,
        is_legitimate: bool
    ) -> str:
        if threat == ThreatLevel.CLEAN:
            return f"Content from '{source}' passed the check (score={score:.2f})."
        suffix = " (was considered a legitimate context)" if is_legitimate else ""
        return (
            f"{threat.value} detected in '{source}'{suffix}. "
            f"Threat score: {score:.2f}. "
            f"Matched patterns: {matched}."
        )


# Singleton for convenient use
_default_guard = InjectionGuard(use_llm_verify=False)


def scan_tool_output(content: str, source: str = "tool_output") -> ScanResult:
    """
    Convenience function: scans tool output.

    Call BEFORE using command stdout, file contents,
    or HTML pages in LLM prompts.
    """
    return _default_guard.scan(content, source_hint=source)


def assert_clean(content: str, source: str = "unknown") -> str:
    """
    Checks content and returns the sanitized version.
    Raises SecurityError on INJECTION.

    Returns sanitized_content if CLEAN or SUSPICIOUS.
    """
    result = _default_guard.scan(content, source_hint=source)
    if result.threat_level == ThreatLevel.INJECTION:
        raise SecurityError(
            f"Prompt Injection attack blocked from source '{source}'. "
            f"Patterns: {result.matched_patterns}"
        )
    return result.sanitized_content


class SecurityError(RuntimeError):
    """Exception raised when a Prompt Injection attack is detected."""
    pass