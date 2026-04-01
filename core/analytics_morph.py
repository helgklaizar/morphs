import asyncio
import sqlite3
import os
import glob
from core.logger import logger

class AnalyticsMorph:
    """
    Data Scientist в коробке.
    Подключается к боевым базам данных сгенерированных SaaS-бизнесов
    в папках workspaces/ и сканирует таблицы.
    """

    def __init__(self, api_key: str = None):
        self.mind = None
        if not api_key:
            api_key = os.environ.get("GEMINI_API_KEY")
        if api_key:
            from core.gemini_agent import GeminiCore
            self.mind = GeminiCore(api_key=api_key)
        else:
            try:
                from core.mlx_agent import CoreMind
                self.mind = CoreMind()
            except ImportError as e:
                import logging
                logging.getLogger(__name__).warning("Не удалось импортировать CoreMind (MLX): %s", e)
        
    def analyze_db(self, db_path: str) -> str:
        if not os.path.exists(db_path):
            return "БД не найдена."
            
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = cursor.fetchall()
            
            db_context = ""
            for t_col in tables:
                table = t_col[0]
                if "sqlite_" in table.lower() or "alembic" in table.lower():
                    continue
                try:
                    cursor.execute(f"SELECT * FROM {table} LIMIT 5")
                    rows = cursor.fetchall()
                    cursor.execute(f"PRAGMA table_info({table})")
                    columns = [col[1] for col in cursor.fetchall()]
                    
                    db_context += f"\nТаблица: {table} (Колонки: {columns})\n"
                    db_context += "Сэмплы:\n"
                    for row in rows:
                        db_context += f"- {row}\n"
                except Exception as e:
                    logger.warning(f"🔥 [Analytics] Ошибка при чтении {table}: {e}")
                
            conn.close()

            if not db_context.strip():
                return None

            if not self.mind:
                return f"Сырые данные (нет LLM):\n{db_context}"

            prompt = (
                f"ОПЕРАЦИЯ: Предиктивная аналитика бизнес-БД ({os.path.basename(os.path.dirname(db_path))}).\n"
                f"Проанализируй схему базы данных и фрагменты данных.\n"
                f"Сделай 2 конкретных бизнес-вывода: что продается лучше или где есть пробелы.\n\n"
                f"ДАННЫЕ БД:\n{db_context}"
            )
            schema = "<thought>Анализ таблиц</thought>\n<report>Строгий короткий бизнес-отчет (3 предложения)</report>"
            
            res = self.mind.think_structured(prompt, schema)
            return res.get("report", "Ошибка генерации отчета.")
        except Exception as e:
            logger.error(f"Ошибка парсинга БД: {e}", exc_info=True)
            return None

    async def run_data_audit_loop(self):
        logger.info("📈 [Analytics-Morph] Прослушивание Workspaces для предиктивной аналитики запущено.")
        root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        workspaces_dir = os.path.join(root_dir, "../workspaces")
        
        while True:
            await asyncio.sleep(20) # Демо-период
            
            try:
                # Ищем базы данных сгенерированных проектов
                reports = []
                if os.path.exists(workspaces_dir):
                    db_files = glob.glob(os.path.join(workspaces_dir, "**/*.db"), recursive=True)
                    for db_file in db_files:
                        if "morphs_system.db" in db_file:
                           continue
                        report = self.analyze_db(db_file)
                        if report and report != "БД не найдена.":
                            biz_name = os.path.basename(os.path.dirname(os.path.dirname(db_file)))
                            reports.append(f"🟢 **Проект `{biz_name}`**:\n{report}")
                            
                if reports:
                    final_report = "\n\n".join(reports)
                    from core.event_bus import bus
                    await bus.publish("chat.notification", {
                        "msg": f"💡 [Analytics-Morph] Сводка Аудита Баз Данных Вокрспейсов:\n{final_report}\n\nХочешь сгенерирую рекомендации по стимулированию роста для этих проектов?"
                    })
                
                # Ждем час перед следующим аудитом (120 секунд для теста)
                await asyncio.sleep(120) 
            except Exception as e:
                logger.error(f"⚠️ [Analytics-Morph] Ошибка парсинга: {e}", exc_info=True)
                await asyncio.sleep(60)
