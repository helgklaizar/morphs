# Мозг системы (Core Mind)

Микросервис на Python с FastAPI. Отвечает за оркестрацию и работу ИИ.

## Стек
- Python 3.x
- FastAPI
- Uvicorn
- MLX & MLX-LM (Локальный Inference для Apple Silicon)

## Конфигурация и запуск
Убедитесь, что вы находитесь в директории `core`:
```bash
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Компоненты
- `main.py` — Точка входа в API (API Server).
- `db.py` — Обвязка для SQLite (Tier Free vs PRO ограничения). Текущая БД генерируется в `morphs_system.db`.
- `mlx_agent.py` — Коннектор работы с Llama-3 для Apple Silicon (MLX).
- `healer_morph.py` — Морф-целитель. Автоматически парсит ошибки из тестов Vitest/Vite и чинит код.
- `sync_daemon.py` — Демон для бэкапов БД и отправки телеметрических отчетов в Telegram.
