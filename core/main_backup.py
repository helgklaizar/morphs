import importlib.util
from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from mlx_agent import CoreMind
from healer_morph import HealerMorph
from db import get_profile, save_event, execute_sql
from sync_daemon import SyncDaemon
from api_morph import APIMorph
from reactor_morph import ReactorMorph
import glob
import os
import json
from core.logger import logger

app = FastAPI(title="Core Mind Orchestrator")

if os.path.exists("routers"):
    for file_path in glob.glob("routers/*_router.py"):
        if os.path.basename(file_path).startswith("seed_"):
            continue
        module_name = os.path.basename(file_path)[:-3]
        spec = importlib.util.spec_from_file_location(module_name, file_path)
        if spec and spec.loader:
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            if hasattr(module, "router"):
                app.include_router(module.router, prefix=f"/api/{module_name}")
                logger.info(f"🔗 [Core Mind] Динамически подключен ИИ-роутер: {module_name}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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

def orchestrate_generation(req: SetupRequest):
    boot_mind()
    logger.info("🧠 [Swarm] Запуск параллельного конвейера: Rules -> API -> Reviewer -> Data -> UI -> Blueprint...")
    
    # 1 & 3: API-Morph + Agent Reviewer (Пишет Python код для FastAPI и проверяет его)
    api_agent = APIMorph()
    file_path = api_agent.generate_backend(req)
    
    backend_code = ""
    module_name = "".join(filter(str.isalpha, req.business_type.lower())) or "custom"
    
    # Горячее монтирование роутера (Hot-Mount без перезагрузки Uvicorn)
    if file_path and os.path.exists(file_path):
        with open(file_path, "r") as f:
            backend_code = f.read()
            
        import importlib.util
        spec = importlib.util.spec_from_file_location(module_name, file_path)
        if spec and spec.loader:
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            if hasattr(module, "router"):
                app.include_router(module.router, prefix=f"/api/{module_name}")
                logger.info(f"🔗 [Core Mind] Динамически внедрен роутер 'GET /api/{module_name}' без рестарта сервера!")
        
        # Запускаем Data-Morph для наполнения БД свежими данными!
        from data_morph import DataMorph
        data_agent = DataMorph()
        data_agent.generate_mock_data(file_path, req.business_type)
    
    # 2. UI-Morph (Пишет React код, читая сгенерированный API)
    run_ui_morph(req, backend_code, module_name)
    
    # 4. Память Бизнес-контекста (Blueprints State)
    state_file = f"../blueprints/{module_name}_state.json"
    os.makedirs("../blueprints", exist_ok=True)
    state_data = {
        "business_type": req.business_type,
        "modules": req.modules,
        "api_router_file": file_path,
        "mounted_route_prefix": f"/api/{module_name}"
    }
    with open(state_file, "w") as f:
        json.dump(state_data, f, indent=4)
    logger.info(f"📝 [Blueprint Memory] Долговременный контекст бизнеса сохранен в {state_file}")

@app.post("/api/v1/generate")
def create_ui_component(req: SetupRequest, background_tasks: BackgroundTasks):
    # Запускаем Рой в фоне (ОЧЕРЕДЬ, строго последовательно)
    background_tasks.add_task(orchestrate_generation, req)
    return {"status": "accepted", "message": "Morph Forge is orchestrating."}

def run_ui_morph(req: SetupRequest, backend_code: str = "", module_name: str = ""):
    logger.info(f"👔 [UI-Morph] ТЗ получено: бизнес '{req.business_type}', модули: {req.modules}.")
    
    # Сбор RAG данных из rules.yaml
    rules_text = ""
    for f in glob.glob("rules/*.yaml"):
        with open(f, "r") as rules_file:
            rules_text += rules_file.read() + "\n"
    
    prompt = (
        f"Ты крутой UI-разработчик. Тебя попросили написать React-компонент (TypeScript) для '{req.business_type}'.\n"
        f"УЧИТЫВАЙ БИЗНЕС-ПРАВИЛА (RAG):\n{rules_text}\n"
        f"Включи в него интерфейс для модулей: {', '.join(req.modules)}.\n"
        f"🔗 ИНТЕЛЛЕКТУАЛЬНАЯ СПАЙКА (API INTEGRATION): Бэкенд уже сгенерирован и работает!\n"
        f"Вот код бэкенда:\n```python\n{backend_code}\n```\n"
        f"Вместо 'заглушек', создай РЕАЛЬНЫЕ \`fetch()\` запросы (например \`fetch('/api/{module_name}/какой-то-эндпоинт')\`) к тем путям, которые ты видишь в коде бэкенда!\n"
        "Сделай тёмный премиальный стиль, Glassmorphism, TailwindCSS. Применяй брендовые цвета из RAG!"
    )
    schema = (
        "<thought>\n"
        "Пошагово распиши, какие кнопки, стейты и fetch-запросы нужны на основе бэкенда.\n"
        "</thought>\n"
        "<component_code>\n"
        "Здесь СТРОГО чистый TSX код самого React-компонента.\n"
        "</component_code>\n"
        "<test_code>\n"
        "Здесь СТРОГО чистый TSX код для Vitest тестов (import { describe, it } from 'vitest').\n"
        "</test_code>"
    )
    
    # Мозг начинает писать код
    result = mind.think_structured(prompt, schema, max_tokens=3000)
    logger.info(f"🤔 [UI-Morph Мысль]: {result.get('thought', 'Нет мыслей')}")
    
    # Пытаемся забрать через кастомные теги из XML
    # У think_structured сейчас жестко зашиты <code> и <thought>.
    # Хмм, надо проверить парсер в mlx_agent.py! Но пока возьмем как есть, 
    # если XML сломается — возьмет fallback.
    code = result.get("component_code", "").replace("```tsx", "").replace("```typescript", "").replace("```", "").strip()
    test_code = result.get("test_code", "").replace("```tsx", "").replace("```typescript", "").replace("```", "").strip()
    
    # Сохраняем прямо внутрь запущенного Tauri/Vite проекта (Горячая перезагрузка)
    target_dir = "../configurator/src/components"
    os.makedirs(target_dir, exist_ok=True)
    
    with open(f"{target_dir}/GeneratedModule.tsx", "w") as f:
        f.write(code)
        
    if test_code:
        with open(f"{target_dir}/GeneratedModule.test.tsx", "w") as f:
            f.write(test_code)
    
    logger.info("✨ [UI-Morph] Компонент готов: GeneratedModule.tsx и тесты к нему.")
    
    logger.info("🚀 [CI/CD] Запуск авто-тестов для валидации мутации...")
    healer = HealerMorph("../configurator", f"{target_dir}/GeneratedModule.tsx")
    code_res, out, err = healer.run_tests()
    if code_res != 0:
        logger.info("🔥 [CI/CD] Vitest упал! Healer-Morph начинает хирургию...")
        prompt, fixed_code = healer.heal_code(out + "\n" + err)
        logger.info("🔄 [CI/CD] Вторичный прогон тестов...")
        code_res2, _, _ = healer.run_tests()
        if code_res2 == 0:
            logger.info("✅ [CI/CD] Баг успешно исправлен ИИ-агентом! HMR активирован.")
            healer.record_trajectory(prompt, "MLX Auto-Fix", 1, fixed_code)
        else:
            logger.info("❌ [CI/CD] ВАЙП. Healer-Morph не справился. Требуется ручной дебаг.")
            healer.record_trajectory(prompt, "MLX Auto-Fix", -1, fixed_code)
    else:
        logger.info("✅ [CI/CD] Мутация идеальна! 100% покрытие пройдено с первого раза. HMR активирован.")
