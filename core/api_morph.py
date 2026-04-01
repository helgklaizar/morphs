import glob
import os
from core.logger import logger

class APIMorph:
    def __init__(self, workspace_manager, project_name: str):
        self.wm = workspace_manager
        self.project_name = project_name
        self.mind = None # Lazy load

    def generate_backend(self, req):
        logger.info(f"🧬 [API-Morph] Проектирование архитектуры БД и API для '{req.business_type}'...")
        
        # Чтение всех правил архитектуры (RAG)
        rules_text = ""
        for f in glob.glob("rules/*.yaml"):
            with open(f, "r") as rules_file:
                rules_text += rules_file.read() + "\n"
        
        system_instructions = (
            f"Ты API-Morph, backend-архитектор. Напиши FastAPI роутер (с SQLAlchemy) для '{req.business_type}'.\n"
            f"ОБЯЗАТЕЛЬНЫЕ ПРАВИЛА (RAG):\n{rules_text}\n"
            f"Реализуй API (endpoints) для модулей: {', '.join(req.modules)}\n"
            "ОБЯЗАТЕЛЬНАЯ АРХИТЕКТУРА (Rust libSQL):\n"
            "Добавь в самый верх файла этот хак для многопоточного Rust драйвера:\n"
            "`import libsql_experimental as sqlite3`\n"
            "`import sys; sys.modules['sqlite3'] = sqlite3`\n"
            "И затем стандартный код: `engine = create_engine('sqlite:///[имя].db', connect_args={'check_same_thread': False})`"
        )
        
        schema = (
            "<thought>\n"
            "Здесь напиши пошаговый план: какие таблицы нужны, какие связи, какие типы данных.\n"
            "</thought>\n"
            "<code>\n"
            "Здесь СТРОГО чистый Python код роутера, начиная с `from fastapi import ...`\n"
            "</code>"
        )
        
        
        logger.info("⚡️ [API-Morph] Генерация первой версии кода (структурированный вывод)...")
        if self.mind is None:
            key = os.environ.get("GEMINI_API_KEY")
            if key:
                from core.gemini_agent import GeminiCore
                self.mind = GeminiCore(api_key=key)
            else:
                from mlx_agent import CoreMind
                self.mind = CoreMind()

        result = self.mind.think_structured(system_instructions, schema, max_tokens=8192, expert_adapter="fastapi_sql")
        logger.info(f"🤔 [API-Morph Мысль]: {result.get('thought', 'Нет мыслей')}")
        code = result.get("code", "")

        # Запускаем генерацию ORM моделей в фоне
        from db_morph import DBMorph
        db_morph = DBMorph(os.path.join(self.wm.base_dir, self.project_name))
        db_morph.generate_orm_schema(req.business_type, {"id": "int", "name": "str"})

        logger.info("🕵️ [Reviewer-Morph] Проверка архитектуры на соответствие правилам (Self-Correction)...")
        review_prompt = (
            f"Ты Reviewer-Morph (Строгий Аудитор). Проведи ревью чужого сгенерированного кода.\n"
            f"ПРАВИЛА АРХИТЕКТУРЫ:\n{rules_text}\n"
            f"КОД:\n```python\n{code}\n```\n"
            f"Задача: Если код ломает правила (нет SQLAlchemy, нет create_all, нет проверок Security), исправь его.\n"
            f"Если код идеален, просто скопируй его в поле code без изменений."
        )
        
        review_schema = (
            "<thought>\n"
            "Здесь напиши аудит кода: найдены ли нарушения по SQLAlchemy или Security?\n"
            "</thought>\n"
            "<code>\n"
            "Здесь исправленный Python код.\n"
            "</code>"
        )
        res2 = self.mind.think_structured(review_prompt, review_schema, max_tokens=8192)
        logger.info(f"🧐 [Reviewer-Morph Вердикт]: {res2.get('thought', 'Нет замечаний')}")
        
        final_code = res2.get("code", "")
        # Страховочная зачистка хвостов Markdown
        final_code = final_code.replace("```python", "").replace("```", "").strip()
        
        feature_name = f"router_{os.urandom(2).hex()}.py"
        
        # V2: Пишем в изолированный Workspace, а не в локальный routers/
        file_path = self.wm.write_api_route(self.project_name, feature_name, final_code)
            
        logger.info(f"✨ [API-Morph & Reviewer-Morph] Бэкенд сгенерирован и изолирован: {file_path}")
        return file_path, final_code
