import sqlite3
import os
from core.logger import logger

DB_PATH = "../morphs_system.db"
SCHEMA_PATH = "../schema.sql"

def init_db():
    logger.info("💽 Initializing SQLite (Local-first) database...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create tables from schema.sql (if they don't already exist)
    if os.path.exists(SCHEMA_PATH):
        with open(SCHEMA_PATH, 'r') as f:
            schema_script = f.read()
            cursor.executescript(schema_script)
            
    # Add a subscriptions table (to implement the Free vs PRO model)
    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS business_profile (
            id TEXT PRIMARY KEY,
            business_name TEXT,
            tier TEXT CHECK(tier IN ('free', 'pro')) DEFAULT 'free',
            telegram_chat_id TEXT
        );
        INSERT OR IGNORE INTO business_profile (id, business_name, tier) VALUES ('biz_1', 'My Coffee Shop', 'pro');
        
        CREATE TABLE IF NOT EXISTS business_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type TEXT,
            payload TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    """)
    
    conn.commit()
    conn.close()
    logger.info("✅ Database is ready.")

def get_profile():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM business_profile LIMIT 1")
    row = cursor.fetchone()
    conn.close()
    return {"id": row[0], "name": row[1], "tier": row[2], "telegram_id": row[3]}

def save_event(event_type: str, payload: str):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("INSERT INTO business_events (event_type, payload) VALUES (?, ?)", (event_type, payload))
    conn.commit()
    conn.close()

def execute_sql(query: str, params: tuple = ()):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(query, params)
    
    if query.strip().upper().startswith("SELECT"):
        res = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description] if cursor.description else []
        conn.close()
        return [dict(zip(columns, row)) for row in res]
    
    conn.commit()
    conn.close()
    return {"status": "executed"}

if __name__ == "__main__":
    init_db()
