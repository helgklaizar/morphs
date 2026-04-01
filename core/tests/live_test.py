from main import SetupRequest, swarm_orchestrator
import asyncio
from core.logger import logger

# Lowering the complexity by requesting only 1 table
req = SetupRequest(
    business_type="Simple Todo List App",
    modules=["tasks"]
)

if __name__ == "__main__":
    logger.info("🚀 [LIVE TEST] Starting a test run of 'Todo List' generation...")
    try:
        asyncio.run(swarm_orchestrator.trigger_task("live_test", req.business_type, " ".join(req.modules)))
        logger.info(f"🏁 [LIVE TEST Result]: Completed")
    except Exception as e:
        logger.info(f"❌ [LIVE TEST Error]: {e}")
