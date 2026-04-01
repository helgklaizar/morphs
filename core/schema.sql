-- DDL для локальной базы конфигураций и мутаций (SQLite / Local-first)

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
