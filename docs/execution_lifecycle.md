# Task Execution Lifecycle (The State Machine)

This document precisely outlines the lifecycle of a task moving through the Morphs Business OS.

## The 6-Step Autonomous Loop

### 1. Reception & Blueprints
- The `ApiMorph` or terminal `dialog_launcher` receives a natural language objective.
- The objective is passed to `PlanTracker`, which creates a `pending` entry in the `tasks` table.

### 2. Retrieval & Context Assembly (`QueryEngine`)
Before spawning any workers, the `CoreMind` requests context from the `Hyper-Memory Layer`.
- `FuzzyIndex` is hit for instantaneous path lookups if specific components are referenced.
- `LanceDB` returns `Top-K` similar code snippets to ground the Swarm in the active repository architecture.
- `GraphRAG` (`Kùzu`) traverses edges to find highly-coupled dependencies (e.g., if updating `auth.py`, it automatically pulls `UserContext.tsx` from the frontend).

### 3. Agent Instantiation & MCTS (`Morph Forge`)
The `SwarmOrchestrator` determines which specialized Morph handles the task.
- `QuantumAtropos` performs Monte-Carlo Tree Search: simulating possible file edits without writing to disk.
- The highest-probability successful path is selected.
- The sub-task is handed to the assigned Morph (e.g., `ReactorMorph`).

### 4. Sandbox Execution (`BashHarness` + `ToolRegistry`)
The Morph dynamically requests execution capabilities via the `ToolRegistryMorph`.
- It executes changes in the system (e.g., generating code via `File_Writer`, reading variables via `LSP_Tool`).
- All sub-process commands are validated through `YOLOClassifier` (pre-execution) and `InjectionGuard` (post-execution).

### 5. Verification & Healing (`BackendHealer`)
Once the mutation is written:
- `VerificationMorph` attempts to build the project and run `pytest / vitest`.
- **If tests fail:** The `stderr` is passed raw to `BackendHealer`. The Healer is trapped in an infinite loop that ONLY breaks when the return code is `0`.
- **If tests pass:** The mutation is stamped as `verified`.

### 6. Persistence & Learning (`AtroposRL`)
- The verified diff patch is merged.
- The `tasks` entry is marked `success`.
- `AtroposTrainer` updates the policy weights dynamically based on the reward of the entire traversal, improving the global capability of the Morphs for the next task.
