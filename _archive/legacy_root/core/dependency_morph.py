import subprocess
import os
from core.logger import logger

class DependencyMorph:
    """
    Узел Агентской Сети для управления внешними библиотеками.
    Если ИИ-программисту нужен пакет (например, 'recharts' или 'framer-motion'),
    он обращается к этому Агенту, который скачивает пакет и валидирует его.
    """
    def __init__(self, workspace_path: str):
        self.workspace_path = workspace_path
        self.frontend_path = os.path.join(workspace_path, "frontend")
        
    def request_npm_package(self, package_name: str) -> bool:
        logger.info(f"📦 [Dependency-Morph] Получен запрос от Swarm на установку NPM-пакета: {package_name}")
        if not os.path.exists(self.frontend_path):
            logger.info("❌ [Dependency-Morph] Frontend workspace не найден.")
            return False
            
        logger.info(f"⏳ [Dependency-Morph] Выполняю 'npm install {package_name}'...")
        res = subprocess.run(["npm", "install", package_name], cwd=self.frontend_path, capture_output=True, text=True)
        
        if res.returncode == 0:
            logger.info(f"✅ [Dependency-Morph] Пакет {package_name} успешно внедрен в SaaS.")
            return True
        else:
            logger.info(f"🔥 [Dependency-Morph] Ошибка установки {package_name}: {res.stderr}")
            return False
