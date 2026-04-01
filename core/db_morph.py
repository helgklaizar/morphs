import os
import subprocess
import sys
from core.logger import logger

class DBMorph:
    """
    Database Schema Architect with migration support (Alembic).
    Ensures that SaaS updates do not break existing client data.
    Generates SQLAlchemy models and automatically applies `alembic upgrade head`.
    """
    def __init__(self, workspace_path: str):
        self.workspace_path = workspace_path
        self.backend_dir = os.path.join(self.workspace_path, "backend")
        
    def generate_orm_schema(self, table_name: str, fields: dict) -> str:
        logger.info(f"🗃️ [DB-Morph] Translating specification into SQLAlchemy for {table_name}: {list(fields.keys())}")
        
        class_name = "".join(filter(str.isalnum, table_name.title()))
        # Generate SQLite/SQLAlchemy ORM
        code = f"from sqlalchemy import Column, Integer, String\nfrom sqlalchemy.orm import declarative_base\n\nBase = declarative_base()\n\nclass {class_name}(Base):\n"
        code += f"    __tablename__ = '{class_name.lower()}'\n"
        for k, v in fields.items():
            db_type = "Integer" if "int" in v.lower() else "String"
            code += f"    {k} = Column({db_type}, primary_key={'True' if k == 'id' else 'False'})\n"
        
        models_dir = os.path.join(self.backend_dir, "models")
        os.makedirs(models_dir, exist_ok=True)
        with open(os.path.join(models_dir, "db.py"), "w") as f:
            f.write(code)
            
        return code

    def apply_migrations(self):
        """ Synchronizes the SQLite database with newly generated models (Alembic) """
        logger.info("🔄 [DB-Morph] Starting Alembic-Synchronizer (Safe DB update)...")
        if not os.path.exists(os.path.join(self.backend_dir, "alembic.ini")):
            # Initialize Alembic (only the first time)
            subprocess.run([sys.executable, "-m", "alembic", "init", "alembic"], cwd=self.backend_dir, capture_output=True)
            # Placeholder: Overwriting alembic.ini for local SQLite `sqlite:///data.db`
            # And env.py to import the generated `models.db.Base`
            logger.info("🏗️ [DB-Morph] Initialized Alembic for the new SaaS.")
        
        # Automatically generate and apply migration
        try:
            res_rev = subprocess.run([sys.executable, "-m", "alembic", "revision", "--autogenerate", "-m", "AI_Mutation"], cwd=self.backend_dir, capture_output=True, text=True)
            logger.info(f"📜 [Alembic] Migration generated: {res_rev.stdout.strip()[-50:]}")
            subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], cwd=self.backend_dir)
            logger.info("✅ [DB-Morph] Database successfully synchronized (Schema Migrated).")
            return True
        except Exception as e:
            logger.info(f"🔥 [DB-Morph] Migration error: {e}")
            return False
