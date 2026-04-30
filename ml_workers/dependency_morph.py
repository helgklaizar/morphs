import subprocess
import os
from core.logger import logger

class DependencyMorph:
    """
    Agent Network node for managing external libraries.
    If the AI programmer needs a package (e.g., 'recharts' or 'framer-motion'),
    it contacts this Agent, which downloads and validates the package.
    """
    def __init__(self, workspace_path: str):
        self.workspace_path = workspace_path
        self.frontend_path = os.path.join(workspace_path, "frontend")
        
    def request_npm_package(self, package_name: str) -> bool:
        logger.info(f"📦 [Dependency-Morph] Request received from Swarm to install NPM package: {package_name}")
        if not os.path.exists(self.frontend_path):
            logger.info("❌ [Dependency-Morph] Frontend workspace not found.")
            return False
            
        logger.info(f"⏳ [Dependency-Morph] Executing 'npm install {package_name}'...")
        res = subprocess.run(["npm", "install", package_name], cwd=self.frontend_path, capture_output=True, text=True)
        
        if res.returncode == 0:
            logger.info(f"✅ [Dependency-Morph] Package {package_name} successfully integrated into the SaaS.")
            return True
        else:
            logger.info(f"🔥 [Dependency-Morph] Error installing {package_name}: {res.stderr}")
            return False
