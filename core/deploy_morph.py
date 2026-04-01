import os
import yaml
from core.logger import logger

class DeployMorph:
    """
    Инфраструктурный DevSecOps Агент. Умеет паковать Morphs-OS и SaaS бизнесы
    в артефакты: Docker/docker-compose для Production запуска.
    """

    def _extract_dependencies(self, workspace_dir: str) -> None:
        """
        Заглушка: Модуль теперь не ПАРСИТ файлы через ast,
        а требует наличия requirements.txt / package.json от Coder-агента.
        Если их нет, создает базовый набор.
        """
        pass

    def generate_deploy_artifacts(self, workspace_dir: str, project_name: str):
        logger.info(f"🐳 [Deploy-Morph] Динамическое определение инфра-ресурсов (DevOps) для {project_name} в {workspace_dir}...")
        
        os.makedirs(workspace_dir, exist_ok=True)
        backend_dir = os.path.join(workspace_dir, "backend")
        frontend_dir = os.path.join(workspace_dir, "frontend")
        
        os.makedirs(backend_dir, exist_ok=True)
        
        from config import settings
        
        # 1. Сборка Dockerfile для Бэкенда (Автоопределение стека)
        requirements_path = os.path.join(backend_dir, "requirements.txt")
        package_json_path = os.path.join(backend_dir, "package.json")
        
        dockerfile = ""
        if os.path.exists(package_json_path):
            try:
                import json
                with open(package_json_path, "r", encoding="utf-8") as f:
                    pj = json.load(f)
                start_cmd = "npm start"
                if "scripts" in pj and "start" in pj["scripts"]:
                    start_cmd = "npm run start"
                elif "scripts" in pj and "dev" in pj["scripts"]:
                    start_cmd = "npm run dev"
            except Exception:
                start_cmd = "node index.js"
                
            dockerfile = f"""FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm install --production
COPY backend/ .
# Производственный запуск Node.js {project_name}
CMD {json.dumps(start_cmd.split())}
"""
        else:
            # Fallback на Python
            has_reqs = os.path.exists(requirements_path)
            
            # Ищем точку входа для uvicorn
            main_module = "main:app"
            if os.path.exists(backend_dir):
                for file in os.listdir(backend_dir):
                    if file.endswith(".py"):
                        with open(os.path.join(backend_dir, file), "r", encoding="utf-8") as pf:
                            if "FastAPI()" in pf.read() or "FastAPI(" in pf.read():
                                main_module = f"{file[:-3]}:app"
                                break

            reqs_cmd = "RUN pip install --no-cache-dir -r requirements.txt" if has_reqs else "RUN echo 'No backend dependencies provided. Using standard lib.'"
            
            dockerfile = f"""FROM python:3.12-slim
WORKDIR /app
COPY backend/ .
{reqs_cmd}
# Производственный запуск FastAPI {project_name}
CMD ["uvicorn", "{main_module}", "--host", "0.0.0.0", "--port", "{settings.SAAS_BACKEND_PORT}"]
"""
        
        docker_path = os.path.join(workspace_dir, "Dockerfile")
        with open(docker_path, "w", encoding="utf-8") as f:
            f.write(dockerfile)
            
        # 2. Сборка docker-compose.yml (Комбайн)
        compose_config = {
            "version": "3.8",
            "services": {
                f"{project_name.lower()}_backend": {
                    "build": ".",
                    "ports": [f"{settings.SAAS_BACKEND_PORT}:{settings.SAAS_BACKEND_PORT}"],
                    "environment": ["ENV=production"]
                },
                f"{project_name.lower()}_frontend": {
                    "image": "node:20-alpine",
                    "working_dir": "/app",
                    "volumes": ["./frontend:/app"],
                    "command": "npm run start",
                    "ports": [f"{settings.SAAS_FRONTEND_PORT}:{settings.SAAS_FRONTEND_PORT}"]
                }
            }
        }
        
        compose_path = os.path.join(workspace_dir, "docker-compose.yml")
        with open(compose_path, "w", encoding="utf-8") as f:
            yaml.dump(compose_config, f, default_flow_style=False, allow_unicode=True)
            
        logger.info("✅ [Deploy-Morph] Docker-кластер артефакты (Dockerfile + Compose) написаны! Готовы к `docker compose up`.")
        return compose_path

    async def deploy_to_local_registry(self, workspace_dir: str):
        """
        Фактический запуск SaaS-бизнеса в локальном Docker.
        Выполняет 'docker compose up -d --build' через BashHarness.
        """
        from bash_harness import BashHarness, BashCommandInput
        logger.info(f"🚀 [Deploy-Morph] Инициирую деплой в Docker через Sandboxed BashHarness: {workspace_dir}...")
        
        compose_path = os.path.join(workspace_dir, "docker-compose.yml")
        if not os.path.exists(compose_path):
            raise FileNotFoundError(f"docker-compose.yml не найден в {workspace_dir}!")
            
        harness = BashHarness()
        cmd_input = BashCommandInput(
            command="docker compose up -d --build",
            cwd=workspace_dir,
            timeout=600,  # 10 минут на сборку Docker
            dangerously_disable_sandbox=True # Разрешаем докеру использовать пути
        )
        
        try:
            result = await harness.execute(cmd_input)
            
            if result.return_code == 0:
                logger.info("✅ [Deploy-Morph] Проект успешно развернут! Контейнеры поднимаются.")
                return True
            else:
                logger.error(f"❌ [Deploy-Morph] Ошибка при старте Docker: {result.stderr}")
                return False
        except Exception as e:
            logger.error(f"❌ [Deploy-Morph] Критическая ошибка песочницы: {str(e)}", exc_info=True)
            return False

if __name__ == "__main__":
    import asyncio
    deployer = DeployMorph()
    deployer.generate_deploy_artifacts("../workspaces/test_saas", "Test_SaaS")
    # asyncio.run(deployer.deploy_to_local_registry("../workspaces/test_saas"))
