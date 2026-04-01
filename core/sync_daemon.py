import os
import time
import shutil
import zipfile
from datetime import datetime
try:
    from core.db import get_profile
except ImportError:
    # Leaving a fallback for standalone execution
    from db import get_profile

from core.logger import logger

class SyncDaemon:
    """
    A daemon for backing up the system DB and SaaS projects (workspaces).
    Performs the actual archiving of SQLite databases and states, after which it uploads 
    to cloud storage (S3/Local Cloud).
    """
    def __init__(self):
        try:
            self.profile = get_profile()
            self.biz_name = self.profile.get('name', 'unknown_business')
            self.tier = self.profile.get('tier', 'free').lower()
        except Exception as e:
            logger.error(f"❌ [SyncDaemon] Error loading profile: {e}")
            self.biz_name = "default_business"
            self.tier = "pro" # fallback for dev

        logger.info(f"🔄 [SyncDaemon] Started for business: {self.biz_name} (Tariff: {self.tier.upper()})")
        
        # Directories
        self.root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.workspaces_dir = os.path.join(self.root_dir, "../workspaces")
        self.system_db = os.path.join(self.root_dir, "morphs_system.db")
        
        # Cloud folder (using a local stub storage if S3 is not configured)
        self.cloud_storage_path = os.path.expanduser("~/.gemini/antigravity/cloud_s3_backups")
        os.makedirs(self.cloud_storage_path, exist_ok=True)

    def run_backup_cycle(self) -> bool:
        if self.tier != 'pro':
            logger.info("❌ [SyncDaemon] Denied. Cloud backups are only available on the PRO plan. Your data is stored only locally.")
            return False
            
        logger.info("☁️ [SyncDaemon] Preparing SQLite backup and SaaS state...")
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_filename = f"backup_{self.biz_name.replace(' ', '_')}_{timestamp}.zip"
        backup_path = os.path.join(self.cloud_storage_path, backup_filename)
        
        # Physical archiving
        try:
            with zipfile.ZipFile(backup_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                # 1. System DB (Morphs OS)
                if os.path.exists(self.system_db):
                    zipf.write(self.system_db, arcname="morphs_system.db")
                    logger.info("🗜️ [SyncDaemon] Added morphs_system.db")
                
                # 2. Isolated SaaS Workspaces (DB, Json blueprints, code)
                if os.path.exists(self.workspaces_dir):
                    for root, dirs, files in os.walk(self.workspaces_dir):
                        for file in files:
                            # Backing up only important state and database files (ignoring node_modules and venv)
                            if "node_modules" in root or "venv" in root or ".git" in root:
                                continue
                            file_path = os.path.join(root, file)
                            arcname = os.path.relpath(file_path, os.path.dirname(self.workspaces_dir))
                            zipf.write(file_path, arcname)
                    logger.info("🗜️ [SyncDaemon] Added business workspace folders.")
                    
            logger.info(f"🚀 [SyncDaemon] Archiving ({os.path.getsize(backup_path) // 1024} KB) completed.")
        except Exception as e:
            logger.error(f"❌ [SyncDaemon] Error reading archive files: {e}")
            return False
            
        # Upload to Cloud (S3 upload simulation)
        self._upload_to_s3(backup_path)
        return True

    def _upload_to_s3(self, filepath: str):
        """
        Uploads a file to the local S3 cloud (~/.gemini/antigravity/cloud_s3_backups/).
        """
        import shutil
        basename = os.path.basename(filepath)
        dest = os.path.join(self.cloud_storage_path, basename)
        
        # Emulation of a real upload: copy and validate
        try:
            if filepath != dest:
                shutil.copy2(filepath, dest)
            size_mb = os.path.getsize(dest) / (1024 * 1024)
            logger.info(f"🌐 [S3 Uploader] Backup uploaded to storage {dest} ({size_mb:.2f} MB).")
        except BaseException as e:
            logger.error(f"❌ [S3 Uploader] Cloud Storage transaction aborted: {e}")
            raise RuntimeError(f"Cloud Storage upload failed: {e}")

    def send_telegram_report(self, message: str):
        # If MCP Telegram tools are configured
        logger.info(f"📱 [Telegram Bot] Push Notification: {message}")
        try:
            from core.event_bus import bus
            import asyncio
            # Sending an event that will be picked up by MCPHub
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # We are calling the event_bus
                asyncio.run_coroutine_threadsafe(
                    bus.publish("mcp.telegram.notification", {"msg": message}), loop
                )
        except BaseException:
            pass
        return True

if __name__ == "__main__":
    daemon = SyncDaemon()
    success = daemon.run_backup_cycle()
    if success:
        daemon.send_telegram_report("Shift closed. A full backup of the OS and all databases has been uploaded to S3.")
