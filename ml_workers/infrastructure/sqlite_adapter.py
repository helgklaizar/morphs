import sqlite3
import os
import json
from typing import List, Optional
from ..core.application.ports import StoragePort
from ..core.domain.models import BusinessEvent

class SQLiteAdapter(StoragePort):
    def __init__(self, db_path: str):
        self.db_path = db_path

    async def execute_query(self, query: str, params: Optional[tuple] = None) -> List[dict]:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute(query, params or ())
        
        if query.strip().upper().startswith("SELECT"):
            res = cursor.fetchall()
            columns = [desc[0] for desc in cursor.description] if cursor.description else []
            conn.close()
            return [dict(zip(columns, row)) for row in res]
        
        conn.commit()
        conn.close()
        return [{"status": "executed"}]

    async def save_event_log(self, event: BusinessEvent):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO business_events (event_type, payload) VALUES (?, ?)", 
            (event.event_type.value, json.dumps(event.payload))
        )
        conn.commit()
        conn.close()
