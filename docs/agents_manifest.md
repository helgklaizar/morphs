# Morphs Business OS: Agents & Components Manifest

The Morphs architecture is decentralized. Instead of one massive "God Prompt", capabilities are distributed across specialized agents ("Morphs"). Each Morph is equipped with exclusive tools and precise boundaries to prevent hallucination.

## 1. Executive & Lifecycle Morphs

| Component | Responsibility | Technical Underpinning |
| :--- | :--- | :--- |
| **`SwarmOrchestrator`** | Master dispatcher. Assigns sub-agents, manages cross-agent debates (`Debate Bus`), and handles systemic rollbacks. | MCTS + DAG Task Graph |
| **`PlanTracker`** | Maintains atomic execution states. Prevents tasks from looping infinitely. | FSM (Finite State Machine) |
| **`AuditMorph`** | Inspects active dependencies and architectural drift before allowing massive structural changes. | `AST` Parsing, Security Rules |
| **`WatchdogMorph`** | A daemon agent running in the background. Detects unhandled crashes, memory leaks in the active process, and auto-restores state. | `asyncio` Task Polling |
| **`CronMorph`** | Schedules background optimizations (e.g., vector database compressions, dependency sweeps, log clearing). | `croniter` + `asyncio.sleep` |

## 2. Infrastructure & Execution Morphs

| Component | Responsibility | Technical Underpinning |
| :--- | :--- | :--- |
| **`BackendHealer`** | Steps in when `BashHarness` throws a 1/2 exit code. Ingests `stderr`, identifies the stack trace, and applies highly surgical, diff-based edits to codebase files. | AST Mutation, Diff-Patching |
| **`ApiMorph`** | Generates strict backend routing, ORM schemas, and IPC channels. Bound to `Pydantic` and `FastAPI` structures. | Type-Enforced Code Gen |
| **`ReactorMorph`** | Frontend specialist. Converts Figma-like blueprints into React components handling Tailwind, Framer Motion, and state management. | React AST Parser |
| **`DataMorph`** | Handles heavy ETL tasks. Scrapes, cleanses, and prepares datasets for the Vector embeddings pipeline limits. | `LanceDB`, Pandas |
| **`LibrarianMorph`** | Maintains repository documentation. Specifically generates READMEs, open-source badges, and keeps `/docs` in sync with codebase mutations. | MDX, Regex |
| **`BrowserMorph`** | E2E UI tester. Controls a headless Playwright instance, physically interacting with the `ReactorMorph` outputs to verify visual rendering. | `Playwright` |
| **`VisionMorph`** | Multimodal analyzer. Ingests base64 screenshots from `BrowserMorph` and layout wires to guide structural CSS adjustments. | `gemini-2.5-pro-vision` |
| **`CodeSmellMorph`** | Analyzes AST for cyclomatic complexity, deeply nested loops, and violations of SOLID principles. Can propose non-destructive refactoring. | `pylint`, AST Visitor |

## 3. Tooling & Capability Plugins

Agents don't possess native omniscience; they access environments via strict routing:
- **`ToolRegistryMorph`**: Central library of dynamically loadable capabilities (e.g. `LSP_Tool`, `File_Writer`, `Worktree_Ops`).
- **`PluginsManager`**: Lazy-loads third-party or user-generated plugins only when a specific Morph proves it needs them, drastically cutting down context payload size.
- **`ConcurrentTools`**: Handles read-only parallel query execution while locking state mutations via a strict sequential queue.

## 4. Resource Control

- **`EconomyMorph` / `CostHook`**: Tracks API token usage (Prompt/Completion) in real-time. If a specific chain exceeds the configurable budget threshold, the swarm is dynamically halted.
