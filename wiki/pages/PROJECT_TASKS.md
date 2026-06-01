# 📋 Project Tasks & Audit Findings: AI SaaS Builder

## 📊 Summary of Findings

The **AI SaaS Builder** (BOS Agent / `ai-business-os`) is a multi-agent backend workspace designed to orchestrate LLM-driven software generation (React + Tailwind frontend, Python backend). 

Key findings from the project audit:
*   **Imports & Symlink Debt:** The root-level symlink `core -> ml_workers` combined with `pythonpath = . core` in `pytest.ini` creates import resolution conflicts. Python package relative imports (e.g., `from .core...` inside `reactor_morph.py`) break when modules are imported as top-level namespaces, preventing tests from compiling.
*   **Broken Async Test Suite:** The testing environment lacks the `pytest-asyncio` package or proper Async configuration, causing 18 asynchronous test cases under `test_subagent_orchestration.py` to fail during collection.
*   **Database Concurrency Risk:** The `kuzu_dashboard.py` API initializes a new `kuzu.Database` object on every single connection/request. Since Kùzu (C++ graph database) does not support multiple database object initializations on the same path concurrently, this design will lead to locking issues or database corruption.
*   **Security & Compliance Leakage:** Raw business event payloads (which may contain GDPR-regulated PII) are saved and instantly routed to Telegram using `SyncDaemon.send_telegram_report` without any hashing or redaction.
*   **Platform Portability Limitation:** The project strictly lists `mlx-lm`, which is restricted to Apple Silicon hardware, limiting its deployment in Docker or Linux-based environments.

---

## 🛠️ Actionable Tasks

### 🔒 Security, Compliance & Dependencies
- [ ] **Sanitize Telegram Event Reporting (`ml_workers/main.py`) (P1):** Ensure that in `handle_business_event()`, business event payloads (`req.payload`) sent via Telegram (`SyncDaemon.send_telegram_report`) are sanitized or redacted to prevent PII/GDPR compliance violations.
- [ ] **Audit and Sanitize `subprocess` Inputs (`ml_workers/backend_healer.py`, `ml_workers/data_morph.py`) (P1):** Sanitize file paths (`self.target_file`, `script_path`) passed into `subprocess.run` to prevent potential injection vectors. Replace raw `subprocess.Popen` calls with safe abstractions.
- [ ] **Prune and Clean Up Dependencies (`ml_workers/requirements.txt`) (P2):** Remove the unused `chromadb` dependency (replaced by `lancedb` + `kuzu` vector/graph hybrid). Pin unpinned dependencies (`sqlalchemy`, `granian`, `libsql-experimental`, and `sentence-transformers`) to prevent version drift.
- [ ] **Decouple Apple Silicon Specifics for Linux/Docker (`ml_workers/requirements.txt`) (P2):** Add system platform markers (e.g., `mlx-lm; sys_platform == 'darwin'`) or a fallback CPU-based LLM loader so that the project can be built and deployed in Linux sandboxes/Docker.

### ♿ Accessibility & SEO (WCAG 2.2 / a11y / Crawl4ai)
- [ ] **Define WCAG 2.2 Requirements for React UI Generation (`ml_workers/rules/ui_react_rules.md`) (P1):** Expand Rule 3 in `ui_react_rules.md` to specify concrete accessibility targets: keyboard focus indicators (no `outline-none` in Tailwind without a replacement), interactive contrast ratios ≥ 4.5:1, semantic landmark tags (`<main>`, `<nav>`), minimal 44x44px tap targets, and proper SVGs alt-text.
- [ ] **Build Accessibility Checks in `VerificationMorph` (P2):** Integrate a static JSX parser or AST validator in `VerificationMorph` to flag accessibility violations (e.g., missing ARIA labels or empty button elements) before approving code.
- [ ] **Incorporate SEO Metadata Guidelines in UI Rules (`ml_workers/rules/ui_react_rules.md`) (P2):** Ensure generated pages have clean HTML hierarchies (H1 -> H2 -> H3), meta description fields, and canonical tag configurations.

### ⚙️ Technical Debt & Assumptions
- [ ] **Fix Kùzu DB Connection Pool Handling (`ml_workers/kuzu_dashboard.py`) (P0):** Modify `_get_conn()` to use a single global `kuzu.Database` object. Generate local connection threads (`Connection(db)`) from this shared instance to avoid concurrent C++ database initialization locks.
- [ ] **Unify Import Strategy and Symlink Resolution (`pytest.ini`, `ml_workers/`) (P0):** Fix the circular/conflicting absolute vs relative import styles between `main.py`, `reactor_morph.py` and test modules. Migrate to absolute imports under a single package layout (e.g., `core.reactor_morph`) or eliminate relative package imports in top-level script wrappers.
- [ ] **Implement Graceful AST Errors in CodeLens (`ml_workers/graph_rag.py`) (P1):** Modify `build_graph()` to capture `SyntaxError` on a per-file basis, logging and skipping the unparseable file, instead of raising an exception that crashes the entire indexing pipeline.
- [ ] **Code Complexity and Clean Up (`ml_workers/`) (P2):**
    *   **Modularize Tests:** Split the 520-line `ml_workers/tests/test_subagent_orchestration.py` into separate test suites (e.g., `test_agent_briefer.py`, `test_agent_tools.py`, `test_cron_watchdog.py`).
    *   **Flatten Nesting:** Refactor the AST-walking loops in `ml_workers/graph_rag.py` to reduce nested loops.
    *   **Log over Prints:** Replace the 52 active `print` statements with standard `core.logger` calls.

### 🧪 QA & Testing Strategy (Unit, Integration, E2E, Load, A/B)
- [ ] **Integrate `pytest-asyncio` and Fix Async Collection (P0):** Add `pytest-asyncio` to the development dependencies and configure `pytest.ini` with `asyncio_mode = auto` to enable the 18 failing async test cases in `test_subagent_orchestration.py` to run.
- [ ] **Isolate DB operations in Tests (P1):** Ensure integration and unit tests (like `test_reactor_morph.py`) mock all file system and SQLite/LanceDB/Kuzu database modifications or execute inside temporary `pytest` workspace fixtures (`tmp_path`) to avoid polluting the workspace.
- [ ] **Load Testing for Background Generation Tasks (`/api/v1/generate`) (P2):** Create a load testing plan (e.g., using Locust) to monitor queue performance and memory constraints under multiple parallel LLM generation tasks.
- [ ] **A/B Testing for Code Healer Optimizations (P2):** Design a benchmarking dashboard that compares code generation success rates between standard single-pass LLM prompts (A) and iterative Monte Carlo Tree Search self-healing via `HealerMorph` (B).
