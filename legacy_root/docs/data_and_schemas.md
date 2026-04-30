# Data Structures & Schemas

To correctly implement the communication between the Morphs, the Database, and the User, you must use the following structural schemas.

## 1. Local SQLite DDL (`morphs_system.db`, `todo.db`, `cafes.db`)
Located primarily in `core/schema.sql`, capturing state tracking.

```sql
CREATE TABLE sync_metadata (
    id TEXT PRIMARY KEY,
    last_synced_at TIMESTAMP,
    remote_vps_endpoint TEXT,
    gdrive_folder_id TEXT
);

CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL CHECK(status IN ('pending', 'in_progress', 'success', 'failed')),
    goal TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE mutations (
    id TEXT PRIMARY KEY,
    task_id TEXT REFERENCES tasks(id),
    morph_type TEXT NOT NULL CHECK(morph_type IN ('UI', 'API', 'Healer')),
    diff_patch TEXT,
    test_logs TEXT,
    is_merged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 2. Pydantic Models & API Contracts (FastAPI/IPC)
Agents communicate via structured JSON objects to ensure reliable parsing.

**`SetupRequest`:** The entry payload for a new business application deployment.
```json
{
  "business_type": "string (e.g., 'cafe', 'retail')",
  "name": "string",
  "features": ["string", "string"],
  "theme": "string ('dark' | 'light')"
}
```

**`BashCommandInput`:** The payload sent to `BashHarness`.
```json
{
  "command": "string (The literal bash command)",
  "dangerously_disable_sandbox": "boolean (Default False. If True, bypasses YOLO)",
  "cwd": "string (optional directory path)"
}
```

**`BashCommandOutput`:** The standard output wrapper.
```json
{
  "stdout": "string (Sanitized by InjectionGuard)",
  "stderr": "string",
  "return_code": "integer",
  "interrupted": "boolean (True if YOLO/InjectionGuard blocked it or timeout)"
}
```

**`ClassificationResult`:** The output of `YOLOClassifier`.
```json
{
  "risk_level": "enum (LOW, MEDIUM, HIGH, CRITICAL)",
  "is_blocked": "boolean",
  "requires_confirmation": "boolean",
  "reason": "string (Human-readable explanation of the risk)",
  "categories": ["string"]
}
```

## 3. Atropos Trajectories (`train.jsonl`)
For the Reinforcement Learning module (`AtroposTrainer`), execution logs are stored as lines of JSON representing transitions for Q-learning or Policy Gradient optimization.

```json
{
  "state_hash": "string (Hash of the active codebase or prompt context)",
  "action": "string (e.g., 'Use Tool: WriteFile')",
  "reward": "float (-1.0 to 1.0)",
  "next_state_hash": "string (Hash after mutation)",
  "terminal": "boolean (True if the test suite finally passed or the process permanently crashed)"
}
```
