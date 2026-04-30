from abc import ABC, abstractmethod
from typing import List, Optional
from ..domain.models import BusinessEvent, BusinessAction

class StoragePort(ABC):
    @abstractmethod
    async def execute_query(self, query: str, params: Optional[tuple] = None) -> List[dict]:
        pass

    @abstractmethod
    async def save_event_log(self, event: BusinessEvent):
        pass

class AIPort(ABC):
    @abstractmethod
    async def analyze_business_rules(self, event: BusinessEvent, rules: str) -> BusinessAction:
        pass

class ConfigPort(ABC):
    @abstractmethod
    async def get_business_rules(self) -> str:
        pass
