from main import SetupRequest, swarm_orchestrator
import asyncio
from core.logger import logger

# Понижаем сложность, запрашивая только 1 таблицу
req = SetupRequest(
    business_type="Simple Todo List App",
    modules=["tasks"]
)

if __name__ == "__main__":
    logger.info("🚀 [LIVE TEST] Начинаем тестовый прогон генерации 'Todo List'...")
    try:
        asyncio.run(swarm_orchestrator.trigger_task("live_test", req.business_type, " ".join(req.modules)))
        logger.info(f"🏁 [LIVE TEST Итог]: Завершено")
    except Exception as e:
        logger.info(f"❌ [LIVE TEST Ошибка]: {e}")
