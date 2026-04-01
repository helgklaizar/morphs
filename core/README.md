# Core Mind

A Python microservice with FastAPI. Responsible for orchestration and AI operations.

## Stack
- Python 3.x
- FastAPI
- Uvicorn
- MLX & MLX-LM (Local Inference for Apple Silicon)

## Configuration and Launch
Make sure you are in the `core` directory:
```bash
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Components
- `main.py` — API entry point (API Server).
- `db.py` — Wrapper for SQLite (Tier Free vs PRO limitations). The current DB is generated in `morphs_system.db`.
- `mlx_agent.py` — Connector for working with Llama-3 for Apple Silicon (MLX).
- `healer_morph.py` — Healer morph. Automatically parses errors from Vitest/Vite tests and fixes the code.
- `sync_daemon.py` — Daemon for DB backups and sending telemetry reports to Telegram.
