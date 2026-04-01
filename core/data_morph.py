import os
import subprocess
from mlx_agent import CoreMind
from core.logger import logger

class DataMorph:
    def __init__(self):
        # We don't instantiate CoreMind here to avoid early loading, we fetch the global if possible
        # Or we just create one (it's a singleton pattern inside mlx_agent if we implement it, but wait: CoreMind() loads model)
        # Actually in main.py boot_mind() sets a global mind. 
        # But we can just import from main! Actually no, circular import.
        # Let's just create a new one, MLX caches weights if it's the same process.
        pass

    def generate_mock_data(self, router_file_path: str, business_type: str):
        logger.info(f"🧬 [Data-Morph] Анализирую {router_file_path} для генерации мок-данных...")
        
        # We use the existing mind from main or create a new instance (which is fast if weights are in memory)
        mind = CoreMind()
        
        with open(router_file_path, "r") as f:
            router_code = f.read()
            
        module_name = os.path.basename(router_file_path)[:-3]
            
        prompt = f"""
Ты Data-Morph. Твоя задача: наполнить базу данных реалистичными данными (Mock Data).
Вот сгенерированный код FastAPI роутера (SQLAlchemy) для бизнеса "{business_type}":

```python
{router_code}
```

Напиши скрипт на Python, который генерирует 50 красивых, реалистичных, осмысленных записей для КАЖДОЙ таблицы, найденной в этом коде, и сохраняет их в БД.
Используй ТОЛЬКО стандартные библиотеки (random, datetime, uuid, string). Придумай массивы с красивыми реалистичными названиями для генерации.

Правила для скрипта:
1. Он должен лежать в той же папке, что и роутер.
2. Сделай импорт нужных классов SQLAlchemy и объекта `session` прямо из модуля `{module_name}`.
Например: `from {module_name} import session, CafeTable` (смотри как таблицы называются в коде).
3. Добавь вызов commit(): `session.commit()`.
4. Верни ТОЛЬКО чистый Python код без Markdown разметки. БЕЗ оберток ```python ```.
5. Обязательно вставь блок `if __name__ == '__main__':`!
"""
        schema = (
            "<thought>\n"
            "Здесь распиши пошагово: какие классы таблиц импортировать, как создавать фейковые записи и коммитить их.\n"
            "</thought>\n"
            "<code>\n"
            "Здесь СТРОГО финальный чистый Python код скрипта, готовый к исполнению.\n"
            "</code>"
        )
        
        logger.info("⚡️ [Data-Morph] Пишу скрипт наполнения БД (structured)...")
        result = mind.think_structured(prompt, schema, max_tokens=2048)
        logger.info(f"🤔 [Data-Morph Мысль]: {result.get('thought', 'Нет мыслей')}")
        
        script_code = result.get("code", "")
        # Очистка хвостов (на всякий случай)
        script_code = script_code.replace("```python", "").replace("```", "").strip()
        
        logger.info("🚀 [Data-Morph] Валидация безопасности скрипта (AST-Sandbox)...")
        
        # 🛡️ Point 3: Secure Sandbox (AST Scanning)
        import ast
        try:
            tree = ast.parse(script_code)
            banned_modules = {"os", "sys", "subprocess", "shutil", "pathlib", "socket", "urllib", "requests"}
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for name in node.names:
                        if name.name.split('.')[0] in banned_modules:
                            raise ValueError(f"Галлюцинация: ИИ попытался импортировать опасный модуль '{name.name}'!")
                elif isinstance(node, ast.ImportFrom):
                    if node.module and node.module.split('.')[0] in banned_modules:
                        raise ValueError(f"Галлюцинация: ИИ попытался импортировать из '{node.module}'!")
            logger.info("✅ [AST-Sandbox] Скрипт безопасен. Зловредного импорта не найдено.")
        except Exception as e:
            logger.info(f"❌ [AST-Sandbox] Угроза безопасности! Скрипт отбракован: {e}")
            return
            
        script_path = os.path.join(os.path.dirname(router_file_path), f"seed_{module_name}.py")
        with open(script_path, "w") as f:
            f.write(script_code)
            
        logger.info(f"🚀 [Data-Morph] Запускаю скрипт посева данных: {script_path}...")
        
        # Add routers/ to PYTHONPATH so the import works
        env = os.environ.copy()
        core_dir = os.path.abspath(os.path.dirname(os.path.dirname(router_file_path))) # path to core/
        routers_dir = os.path.abspath(os.path.dirname(router_file_path))
        env["PYTHONPATH"] = routers_dir
        
        # Run from core directory so 'sqlite:///name.db' is created in core
        result = subprocess.run(["python", script_path], cwd=core_dir, env=env, capture_output=True, text=True)
        if result.returncode == 0:
            logger.info(f"✅ [Data-Morph] Успешно! База данных заполнена. Вывод: {result.stdout}")
        else:
            logger.info(f"❌ [Data-Morph] Ошибка при заполнении: {result.stderr}")
            # Optional: We could call HealerMorph here if we wanted!

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 2:
        DataMorph().generate_mock_data(sys.argv[1], sys.argv[2])
