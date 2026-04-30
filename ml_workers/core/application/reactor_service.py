import logging
from .ports import StoragePort, AIPort, ConfigPort
from ..domain.models import BusinessEvent, BusinessAction

logger = logging.getLogger(__name__)

class ReactorService:
    def __init__(self, ai_engine: AIPort, storage: StoragePort, config: ConfigPort):
        self.ai = ai_engine
        self.storage = storage
        self.config = config

    async def react(self, event: BusinessEvent) -> BusinessAction:
        """
        Основной сценарий обработки событий через бизнес-правила (RAG).
        """
        logger.info(f"🕵️‍♂️ [ReactorService] Handling event: {event.event_type}")
        
        # 1. Загружаем правила из порта конфгов
        rules = await self.config.get_business_rules()
        
        # 2. Анализируем через AI порт
        action = await self.ai.analyze_business_rules(event, rules)
        
        # 3. Применяем последствия в портах (если требуется)
        if action.action_type == "SQL_MUTATION" and action.command:
            logger.info(f"⚡ [ReactorService] Applying SQL mutation: {action.command}")
            await self.storage.execute_query(action.command)
        
        # 4. Логируем событие (async repo pattern)
        await self.storage.save_event_log(event)
        
        return action
