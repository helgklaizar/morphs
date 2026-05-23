# Morphs Business OS: Red-Team Security Model

The defining characteristic of the Morphs architecture is its **Trust-Nothing** isolation model. Because Morphs possess the profound ability to write code, modify file systems, and execute arbitrary shell commands, security isn't an afterthought—it's the core engine.

## 1. Execution Sandbox (`BashHarness`)

Every shell command requested by a Morph MUST pass through `BashHarness`. It intercepts `cmd` signals and acts as the gatekeeper.

### The Pipeline
1. Token validation and scope constraint.
2. Checking against the Pre-Execution Guard (`YOLOClassifier`).
3. Execution in isolated subprocess memory (`PTY` terminal emulation).
4. Checking against the Post-Execution Guard (`InjectionGuard`).

## 2. Pre-Execution: `YOLOClassifier`

The `YOLOClassifier` uses an independent, localized model (`sentence-transformers` embeddings) alongside keyword heuristics to classify every intent *before* it hits the shell.

**Risk Levels:**
- **CRITICAL:** Irreversible destruction (`rm -rf /`, `mkfs`). The `BashHarness` interrupts execution instantly and returns `Sandbox Error` to the Swarm. The offending Morph is logged for penalization via `AtroposRL`.
- **HIGH/MEDIUM:** Suspicious activities involving network egress (`curl`, `wget`) or credential access. Halts the process and utilizes the `dialog_launchers.py` interactive interface, prompting the human operator for explicit confirmation via the standard terminal or UI.
- **LOW:** Standard repository commands (`pytest`, `cat`, `ls`). Passed natively.

*Note on Bypass:* Automated test suites (`pytest`, `CI=true`) cleanly bypass the human-in-the-loop requirement, defaulting to strict rejection for HIGH level flags to prevent CI stalls.

## 3. Post-Execution: `InjectionGuard`

If a command is successful, the standard output (`stdout`) returned from the environment might be weaponized. If a Morph executes `curl http://hacker/instructions.txt`, the resulting `stdout` could contain malicious prompts like *"Ignore all previous instructions."*

`InjectionGuard` acts on the return stream:
- It maps the string output against an advanced fuzzy list of adversarial payloads.
- If it detects Prompt Injection attempts, the output is structurally mutated into `[REDACTED: Injection Blocked]`, keeping the Swarm uncontaminated.
- It injects invisible contractual `<system-reminder>` directives around the output to force the LLM to maintain its baseline state.

## 4. Verification & Safe Worktrees

Through `Worktree_Ops` (inside the `ToolRegistry`), destructive or massive feature branching is executed inside an isolated `git worktree`.
If `VerificationMorph` discovers that the newly generated branch fundamentally breaks `pytest`, the worktree is nuked, leaving the primary branch completely immune to partial or broken states.
