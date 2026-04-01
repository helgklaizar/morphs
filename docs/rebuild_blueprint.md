# Morphs Business OS: The Blueprint for Reconstruction

**CRITICAL DIRECTIVE:** If the entire codebase is deleted, an Architect Agent can reconstruct the entire Morphs Business OS strictly by following this blueprint. The documentation is exhaustive and structural.

## Phase 1: Foundational Databases & Memory
The system relies on a hybrid Memory Layer. Do not build the agents before establishing their memory systems.
1. **SQLite (`schema.sql`):** Used for configuration and basic state tracking. Needs `sync_metadata`, `tasks` (states: pending, in_progress, success, failed), and `mutations` (tracks `diff_patch` outputs of Morphs before merging).
2. **LanceDB (`.lancedb/`):** The vector database storing source-code embeddings for fast RAG search (`sentence-transformers` 384-dim).
3. **Kùzu (`.kuzu_graph/`):** A property graph database linking semantic intents ("I need a login page") to specific architectural files (`src/routes/login.tsx`).

## Phase 2: The Red-Team Sandbox Pipeline
The execution environment is non-negotiable. Before any LLM makes a system call, this pipeline must exist:
1. **`YOLOClassifier`:** A pre-execution guard. It evaluates proposed `BashCommandInput` against critical regexes and structural models. Disallows `rm -rf`, `mkfs`, or blind root modifications, escalating high-risk commands to `dialog_launchers` for human verification.
2. **`BashHarness`:** Emulates a standard `PTY`. Runs the verified command. Catches `stderr` and the OS exit code.
3. **`InjectionGuard`:** Post-execution. Scans the `stdout` text for Prompt Injection ("Ignore all previous instructions") before feeding the terminal output back to the LLM.

## Phase 3: The Prompt Engine (`PromptHierarchy`)
Do not use flat prompts. The AI is steered via a layered dynamic system, where instructions are cascaded:
- **Overrides:** System-red-alerts (e.g., "Out of budget, stop immediately").
- **Coordinator Rules:** Rules for Swarm allocation and `PlanTracker` usage.
- **Morph Specific:** E.g., `ReactorMorph` gets only React/Tailwind syntax rules.
- **Base Contracts:** Universal strict constraints ("Always return raw JSON, NO markdown, never swallow exceptions").
- **Invisible Injection:** Use `<system-reminder>` XML tags injected automatically into tool outputs to enforce constraints silently in the context window.

## Phase 4: Core Brain & The Swarm (The Agents)
1. **`CoreMind` / `SwarmOrchestrator`:** The master controller. Spawns tasks to `PlanTracker`.
2. **`PlanTracker` (FSM)**: Manages states. Converts natural language intents into a DAG (Directed Acyclic Graph) of sub-tasks.
3. **The Morphs:** Isolated executors (see `agents_manifest.md`).
   - Each Morph extends a Base Agent class.
   - Each Morph is strictly forbidden from native capabilities unless dynamically loaded via `ToolRegistryMorph`.
4. **`ToolRegistryMorph`:** Binds `File_Writer`, `LSP_Tool` (Pyright/TSServer native), `ConcurrentTools`.

## Phase 5: Reinforcement Validation (`AtroposRL`)
1. **`QuantumAtropos` & `AtroposTrainer`:** Logs the sequence of `ToolCalls` executed by a Morph for a task.
2. **Reward Calculation:** +1.0 for passing `BashHarness` tests and generating correct AST. -1.0 for sandbox failures, hallucinations.
3. **MCTS (Monte-Carlo Tree Search):** Before a Morph writes code, it simulates "what-ifs" through Atropos node expansion to find the optimal code structure.

By assembling the memory layer, locking it behind the Red-Team sandbox, connecting it to the hierarchical prompt engine, generating specialized Morphs, and adding RL validation, the system becomes fully sovereign.
