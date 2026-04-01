from mlx_agent import CoreMind
from core.logger import logger

def run_meta_test():
    logger.info("🔥 [Meta-Morph] Запуск теста само-модификации Ядра...")
    mind = CoreMind()
    
    target_file = "main.py"
    with open(target_file, "r") as f:
        current_code = f.read()
        
    prompt = (
        "Ты — Meta-Morph, элитный ИИ-архитектор. Твоя задача: улучшить ядро системы (main.py).\n"
        "Тебе передан текущий исходный код 'main.py'.\n"
        "ЗАДАЧА:\n"
        "Добавь новый GET endpoint `/api/v1/metrics`. "
        "Пусть он возвращает простой JSON {'status': 'ok', 'active_agents': 4, 'uptime': '10h'}. "
        "Остальной код должен остаться полностью рабочим и нетронутым.\n\n"
        f"ТЕКУЩИЙ КОД:\n```python\n{current_code}\n```\n"
    )
    
    schema = (
        "<thought>\n"
        "Пошагово распиши, куда именно вставить новый роут, чтобы не сломать остальной код.\n"
        "</thought>\n"
        "<code>\n"
        "ВЕРНИ ВЕСЬ ОБНОВЛЕННЫЙ КОД main.py ЦЕЛИКОМ (от начала и до конца).\n"
        "</code>"
    )
    
    logger.info("⚡️ [Meta-Morph] Ядро читает свой собственный код и планирует мутацию...")
    result = mind.think_structured(prompt, schema, max_tokens=4000)
    
    logger.info(f"🤔 [Meta-Morph Мысль]: {result.get('thought', 'Нет мыслей')}")
    new_code = result.get("code", "")
    
    if not new_code or len(new_code) < 500:
        logger.info("❌ [Meta-Morph] Ошибка: ИИ выдал слишком короткий или пустой код.")
        return
        
    # Страховочное сохранение
    backup_file = "main_backup.py"
    with open(backup_file, "w") as f:
        f.write(current_code)
        
    logger.info(f"💾 [Meta-Morph] Старый код сохранен в {backup_file}.")
    
    # Записываем мутацию
    with open(target_file, "w") as f:
        f.write(new_code)
        
    logger.info("🚀 [Meta-Morph] Проверка синтаксиса нового кода (AST Validation)...")
    try:
        import ast
        ast.parse(new_code)
        logger.info("✅ [Meta-Morph] Синтаксис корректен. Мутация успешна!")
    except SyntaxError as e:
        logger.info(f"❌ [Meta-Morph] СИНТАКСИЧЕСКАЯ ОШИБКА: {e}")
        logger.info("🔄 [Meta-Morph] Откатываемся к бэкапу...")
        with open(target_file, "w") as f:
            f.write(current_code)

if __name__ == "__main__":
    run_meta_test()
