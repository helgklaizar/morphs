import os
import sqlite3
import pytest
from core.reactor_morph import ReactorMorph
import db

class DummyMind:
    def __init__(self, expected_sql=""):
        self.expected_sql = expected_sql
        self.called = False
    def think(self, prompt, max_tokens, temperature):
        self.called = True
        return f"{self.expected_sql}<|eot_id|>"

def setup_test_db(tmp_path):
    db.DB_PATH = str(tmp_path / "test.db")
    conn = sqlite3.connect(db.DB_PATH)
    cursor = conn.cursor()
    cursor.execute("CREATE TABLE inventory (id INTEGER, count INTEGER)")
    cursor.execute("INSERT INTO inventory VALUES (123, 10)")
    conn.commit()
    conn.close()

def test_reactor_morph_sql_action(tmp_path):
    setup_test_db(tmp_path)
    
    class TestReactorMorph(ReactorMorph):
        def __init__(self):
            self.mind = DummyMind("UPDATE inventory SET count = count - 1 WHERE id = 123")
            
            # Setup mock ports for Hexagonal Architecture Compatibility
            from core.core.application.reactor_service import ReactorService
            from core.core.application.ports import StoragePort, AIPort, ConfigPort
            from core.core.domain.models import BusinessAction
            from core.infrastructure.sqlite_adapter import SQLiteAdapter
            
            class TestStorage(SQLiteAdapter):
                async def save_event_log(self, event):
                    # Bypassing the save_event_log to avoid lacking 'business_events' table
                    pass
            
            class TestAI(AIPort):
                def __init__(self, mind):
                    self.mind = mind
                async def analyze_business_rules(self, event, rules):
                    resp = self.mind.think("dummy", 1024, 0.1)
                    clean_resp = resp.replace("<|eot_id|>", "").strip()
                    if clean_resp == "SKIP":
                        return BusinessAction(action_type="SKIP")
                    else:
                        return BusinessAction(action_type="SQL_MUTATION", command=clean_resp)
                        
            class TestConfig(ConfigPort):
                async def get_business_rules(self):
                    return "dummy_rules"
            
            self.service = ReactorService(
                ai_engine=TestAI(self.mind),
                storage=TestStorage(db.DB_PATH),
                config=TestConfig()
            )
            
    agent = TestReactorMorph()
    agent.react("order_placed", '{"item_id": 123}')
    
    assert agent.mind.called
    
    # Verify DB was modified actually
    conn = sqlite3.connect(db.DB_PATH)
    c = conn.cursor()
    c.execute("SELECT count FROM inventory WHERE id = 123")
    val = c.fetchone()[0]
    conn.close()
    assert val == 9

def test_reactor_morph_skip_action(tmp_path):
    setup_test_db(tmp_path)
    
    class TestReactorMorph(ReactorMorph):
        def __init__(self):
            self.mind = DummyMind("SKIP")
            
            # Setup mock ports for Hexagonal Architecture Compatibility
            from core.core.application.reactor_service import ReactorService
            from core.core.application.ports import StoragePort, AIPort, ConfigPort
            from core.core.domain.models import BusinessAction
            from core.infrastructure.sqlite_adapter import SQLiteAdapter
            
            class TestStorage(SQLiteAdapter):
                async def save_event_log(self, event):
                    pass
            
            class TestAI(AIPort):
                def __init__(self, mind):
                    self.mind = mind
                async def analyze_business_rules(self, event, rules):
                    resp = self.mind.think("dummy", 1024, 0.1)
                    clean_resp = resp.replace("<|eot_id|>", "").strip()
                    if clean_resp == "SKIP":
                        return BusinessAction(action_type="SKIP")
                    else:
                        return BusinessAction(action_type="SQL_MUTATION", command=clean_resp)
                        
            class TestConfig(ConfigPort):
                async def get_business_rules(self):
                    return "dummy_rules"
            
            self.service = ReactorService(
                ai_engine=TestAI(self.mind),
                storage=TestStorage(db.DB_PATH),
                config=TestConfig()
            )
            
    agent = TestReactorMorph()
    agent.react("view_homepage", "{}")
    
    assert agent.mind.called
    
    # DB count shouldn't have changed
    conn = sqlite3.connect(db.DB_PATH)
    c = conn.cursor()
    c.execute("SELECT count FROM inventory WHERE id = 123")
    val = c.fetchone()[0]
    conn.close()
    assert val == 10
