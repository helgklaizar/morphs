from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import asyncio

from mlx_agent import CoreMind
from healer_morph import HealerMorph
from db import get_profile, save_event, execute_sql
from sync_daemon import SyncDaemon
from api_morph import APIMorph
from reactor_morph import ReactorMorph
from event_bus import bus
from watchdog_morph import WatchdogMorph
from security_morph import SecurityMorph
from deploy_morph import DeployMorph
from analytics_morph import AnalyticsMorph
from workspace_manager import WorkspaceManager
from git_morph import GitMorph
from graph_rag import CodeLensMorph
import glob
import os
import json
from task_proof_morph import TaskProofMorph
from config import settings
from contextlib import asynccontextmanager
from swarm_orchestrator import SwarmOrchestrator
from core.logger import logger
from file_writer_morph import FileWriterMorph
from kuzu_dashboard import router as kuzu_router

watchdog = WatchdogMorph(kill_timeout=600)
analytics = AnalyticsMorph()
security = SecurityMorph()
deployer = DeployMorph()
swarm_orchestrator = SwarmOrchestrator(watchdog)
file_writer = FileWriterMorph()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Стартуем шину событий! (Честная P2P/Redis связь)
    await bus.connect()
    
    # 2. Запускаем фоновых демонов
    asyncio.create_task(watchdog.monitor_loop())
    asyncio.create_task(analytics.run_data_audit_loop())
    asyncio.create_task(swarm_orchestrator.setup_listeners())
    asyncio.create_task(file_writer.setup_listeners())
    
    # Ред-Тиминг свежесгенерированных роутеров через шину
    async def run_pentest_on_new_route(payload):
        filepath = payload.get("router_path")
        _log_history.append(f"🛡️ [EventBus] Security-Morph начал аудит файла {filepath}")
        is_safe = security.run_pentest(filepath)
        if not is_safe:
            _log_history.append(f"💥 [EventBus] Секьюрити-Служба ЗАПРЕТИЛА релиз файла {filepath}! Отправляю на лечение...")
            # В будущем здесь триггер Healer-Morph
    
    await bus.subscribe("router.generated", run_pentest_on_new_route)

    # Улавливаем аналитику и шлем в чат
    async def handle_chat_notif(payload):
        _chat_notifications.append(payload.get("msg", ""))
        
    await bus.subscribe("chat.notification", handle_chat_notif)
    
    yield
    # Очистка при выключении
    pass

app = FastAPI(title=settings.APP_NAME, lifespan=lifespan)
app.include_router(kuzu_router)

# Хранилище логов для реалтайм стриминга
_log_history = []

def log_progress(msg: str):
    logger.info(msg)
    _log_history.append(msg)

@app.get("/api/v1/logs")
async def stream_logs():
    async def event_generator():
        last_idx = 0
        while True:
            if last_idx < len(_log_history):
                for msg in _log_history[last_idx:]:
                    yield f"data: {msg}\n\n"
                last_idx = len(_log_history)
            await asyncio.sleep(0.2)
    return StreamingResponse(event_generator(), media_type="text/event-stream")

_chat_notifications = []
@app.get("/api/v1/chat_stream")
async def chat_stream():
    async def event_generator():
        last_idx = 0
        while True:
            if last_idx < len(_chat_notifications):
                for msg in _chat_notifications[last_idx:]:
                    yield f"data: {msg}\n\n"
                last_idx = len(_chat_notifications)
            await asyncio.sleep(1)
    return StreamingResponse(event_generator(), media_type="text/event-stream")

# _chat_notifications handler is defined in lifespan

# V2: Hot-mounting отключен в угоду изоляции Workspaces.
# Роутеры больше не загружаются в память Core Mind.
if os.path.exists("routers"):
    logger.info("⚠️ [Core Mind] Директория routers/ найдена, но hot-mounting отключен. Legacy-роутеры игнорируются.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173"
    ], 
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
)

@app.get("/api/v1/profile")
def get_current_profile():
    return get_profile()

@app.get("/api/v1/blueprints")
def get_blueprints():
    bps = []
    for f in glob.glob("../blueprints/*.json"):
        with open(f, "r") as json_file:
            bps.append(json.load(json_file))
    return bps

class EventRequest(BaseModel):
    event_type: str
    payload: str

@app.post("/api/v1/event")
def handle_business_event(req: EventRequest, bg_tasks: BackgroundTasks):
    save_event(req.event_type, req.payload)
    
    daemon = SyncDaemon()
    daemon.send_telegram_report(f"Новое событие ({req.event_type}): {req.payload}")
    
    # Task 3: Reactor-Morph (анализирует событие через RAG Бизнес-Правил)
    def invoke_reactor():
        reactor = ReactorMorph()
        reactor.react(req.event_type, req.payload)
        
    bg_tasks.add_task(invoke_reactor)
    return {"status": "saved and analyzing"}

class SQLRequest(BaseModel):
    query: str
    params: list = []

@app.post("/api/v1/sql")
def handle_sql(req: SQLRequest):
    return execute_sql(req.query, tuple(req.params))

mind = None

@app.get("/")
def get_status():
    return {"status": "Core Mind is running"}

class SetupRequest(BaseModel):
    business_type: str
    modules: list[str]

def boot_mind():
    global mind
    if mind is None:
        mind = CoreMind()

@app.post("/api/v1/generate")
async def create_ui_component(req: SetupRequest, background_tasks: BackgroundTasks):
    global _log_history
    _log_history.clear()
    task_id = f"gen_{os.urandom(4).hex()}"
    background_tasks.add_task(swarm_orchestrator.trigger_task, task_id, req.business_type, " ".join(req.modules))
    return {"status": "accepted", "message": "Morph Forge is orchestrating."}

class ChatRequest(BaseModel):
    message: str
    business_type: str = "custom"

@app.post("/api/v1/chat")
async def handle_chat(req: ChatRequest, background_tasks: BackgroundTasks):
    task_id = f"chat_{os.urandom(4).hex()}"
    background_tasks.add_task(swarm_orchestrator.trigger_task, task_id, req.business_type, req.message)
    return {"status": "accepted"}

@app.post("/api/v1/deploy")
def trigger_deploy():
    """Эндпоинт для Деплой-Морфа"""
    success = deployer.generate_docker("morphs_business_os")
    return {"status": "deployed" if success else "failed"}


if __name__ == "__main__":
    logger.info(f"🚀 [Granian] Запуск Сверхбыстрого Сервера (Rust Engine) на порту {settings.CORE_MIND_PORT}...")
    from granian import Granian
    # Запускаем FastAPI через Rust
    Granian("main:app", address="0.0.0.0", port=settings.CORE_MIND_PORT, interface="asgi").serve()
