# Morphs — Operational Project Memory

## Stack
- **Runtime (Core Mind):** Python (Apple MLX from TurboQuant) for AI core + Atropos RL for reinforcement learning on execution trajectories.
- **Orchestrator (Sandbox/UI):** Bun / React / Vitest / Ruff (for auto-formatting generated code).
- **Database:** SQLite (local-first) + LanceDB (vectors) + DuckDB (analytics). Kùzu (context/graph compression).
- **Messaging:** Redis P2P + Msgspec (lightning-fast serialization).
- **External Layers:** `core/rules`, `core/blueprints`, `core/skills` for system configuration.

## Architecture
Biologically-inspired Swarm (Context Combine):
- **Core Mind (Brain):** Orchestrator and Sentinel. Spawns parallel Morphs. Contains a Cron scheduler for audits, backups, and automations.
- **Morph Forge (Forge):** Task decomposition engine.
- **The Morphs (Executors):** Isolated parallel agents (UI, API, Healer).
- **Atropos Experience Replay:** Trajectory storage for successful/failed assembly runs, applying RL-tuning to the AI continuously during actual execution.

## Operating Mode (Self-Adaptive)
1. The Configurator queries the business owner -> forming an execution profile (Blueprint + Rules).
2. The Brain spawns a parallel Swarm of Morphs tailored for the task.
3. Test-Driven Mutation inside the Sandbox: Successful commit? RL receives a positive reward (Atropos DB entry). Failure? Healer-Morph intervenes, and the failure trajectory is logged for future experience.

## Known Issues / Tech Debt
- Epic 0 (Removing all architecture fakes) is successfully completed.
- System is prepared for B2B SaaS React constructor and CLI integrations.

## What Was Done Recently (2026-04-01)
- **Sprint 24 (The Final Production Stabilization - Fixes & CI Hardening)**:
  - **Epic 0: Complete removal of Mocks/Fakes**:
    - Eradicated the last dependencies on `MagicMock`, `mock_open`, and `patch` in the test suite (`test_vision_morph.py`, `test_reactor_morph.py`, `test_tooling_epic.py`).
    - Cleared all silent `except Exception: pass` swallows in `analytics_morph.py` and `ralph_daemon.py`, binding strict logging.
    - Patched CI environment variable ignore in `test_bash_harness.py`, specifically `PYTEST_CURRENT_TEST` for the YOLOClassifier.
    - Eliminated the fallback `[0.5]*384` hardcoded vectors, configuring a graceful fallback for missing packages. Repaired `Schema Error` handling in `atropos_memory.py`.
    - Fully translated all primary documentation into English (README, GEMINI, TODO, TASKS).
    
## Next Tasks
1. Run automated Python script to translate all inline codebase strings/comments to English.
2. Begin Epic 1 (B2B SaaS Frontend Constructor).
