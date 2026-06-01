import asyncio
import os
import json
from core.core.application.reactor_service import ReactorService
from core.core.domain.models import BusinessEvent, EventType
from core.infrastructure.mlx_adapter import MLXAgentAdapter
from core.infrastructure.sqlite_adapter import SQLiteAdapter
from core.infrastructure.config_adapter import YAMLConfigAdapter
from core.logger import logger

class ReactorMorph:
    """
    Refactored ReactorMorph using Hexagonal Architecture.
    Acts as an entry point/adapter for legacy code.
    """
    def __init__(self):
        # 1. Setup Infrastructure
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        db_path = os.path.join(base_dir, "morphs_system.db")
        
        self.ai_adapter = MLXAgentAdapter()
        self.storage_adapter = SQLiteAdapter(db_path)
        self.config_adapter = YAMLConfigAdapter(os.path.join(os.getcwd(), "rules/*.yaml"))
        
        # 2. Setup Application Service
        self.service = ReactorService(
            ai_engine=self.ai_adapter,
            storage=self.storage_adapter,
            config=self.config_adapter
        )

    def react(self, event_type: str, payload: str):
        """
        Main entry point for legacy code. Runs the async service synchronously or via existing loop.
        """
        # Превращаем в доменную модель
        domain_event = BusinessEvent(
            event_id="untracked",
            event_type=EventType.BUSINESS_RULE, # Default mapping
            payload={"raw_payload": payload, "legacy_type": event_type}
        )

        try:
            try:
                loop = asyncio.get_running_loop()
            except RuntimeError:
                loop = None

            if loop and loop.is_running():
                loop.create_task(self.service.react(domain_event))
            else:
                asyncio.run(self.service.react(domain_event))
                
        except Exception as e:
            logger.error(f"❌ [Reactor-Morph Refactored] Critical error: {e}")
