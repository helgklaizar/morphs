from dataclasses import dataclass, field
from typing import Dict, Any, Optional
from enum import Enum

class EventType(str, Enum):
    BUSINESS_RULE = "business_rule"
    SYSTEM_ALERT = "system_alert"
    USER_ACTION = "user_action"
    DEPLOYMENT = "deployment"

@dataclass(frozen=True)
class BusinessEvent:
    event_id: str
    event_type: EventType
    payload: Dict[str, Any]
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class BusinessAction:
    action_type: str  # e.g., "SQL_MUTATION", "NOTIFY", "SKIP"
    command: Optional[str] = None
    reasoning: Optional[str] = None
