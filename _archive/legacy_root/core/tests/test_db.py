import os
import pytest
import db

@pytest.fixture
def temp_db(tmp_path):
    # Override paths to use temporary directory
    db.DB_PATH = str(tmp_path / "test_system.db")
    db.SCHEMA_PATH = str(tmp_path / "test_schema.sql")
    
    # Create fake schema.sql
    with open(db.SCHEMA_PATH, "w") as f:
        f.write("CREATE TABLE IF NOT EXISTS dummy (id INTEGER);\n")
        
    yield
    
def test_init_db_and_get_profile(temp_db):
    db.init_db()
    assert os.path.exists(db.DB_PATH)
    profile = db.get_profile()
    assert profile["id"] == "biz_1"
    assert profile["tier"] == "pro"
    assert profile["name"] == "My Coffee Shop"
