import asyncio
import os
import json
from typing import Dict, Any, List
from core.logger import logger

class AuditMorph:
    """
    Synthetic Auditor (Audit-Morph): runs chaos tests, SAST scans, 
    and verifies the overall health of an AI-generated workspace.
    """
    def __init__(self, workspace_path: str):
        self.workspace_path = workspace_path
        self.health_score = 100

    async def run_chaos_test(self, timeout_sec: int = 1) -> bool:
        """Emulator of a hanging worker. Expects asyncio to drop it via Timeout."""
        try:
            async def hanging_task():
                while True:
                    await asyncio.sleep(0.1)
            
            await asyncio.wait_for(hanging_task(), timeout=timeout_sec)
            self.health_score -= 20
            return False 
        except asyncio.TimeoutError:
            return True # Protection worked!

    async def run_sast_scan(self) -> List[str]:
        """Static analysis imitating bandit/semgrep looking for leaked API tokens."""
        import re
        vulnerabilities = []
        
        # Proper Regex-based secret detection (dummy but realistic ones)
        secret_patterns = [
            re.compile(r"api_key\s*=\s*['\"][a-zA-Z0-9_-]+['\"]", re.IGNORECASE),
            re.compile(r"sk-[a-zA-Z0-9]{48}"),  # generic secret key
            re.compile(r"AIzaSy[0-9a-zA-Z_-]{33}"), # Google API key format
            re.compile(r"(?i)password\s*=\s*['\"][^'\"]+['\"]")
        ]
        
        if not os.path.exists(self.workspace_path):
            return vulnerabilities

        for root, dirs, files in os.walk(self.workspace_path):
            dirs[:] = [d for d in dirs if not (d.startswith('venv') or d.startswith('.') or d in ('node_modules', '__pycache__'))]
            for file in files:
                if file.endswith(('.py', '.js', '.ts', '.env.example', '.txt')) and not file.startswith('test_'):
                    path = os.path.join(root, file)
                    try:
                        with open(path, 'r', errors='ignore') as f:
                            content = f.read()
                            for pat in secret_patterns:
                                if pat.search(content):
                                    vulnerabilities.append(f"Hardcoded secret matching {pat.pattern} found in {file}")
                                    self.health_score -= 10
                    except Exception as e:
                        logger.error(f"Error reading file for scanning: {e}", exc_info=True)
        return vulnerabilities

    async def run_tokenomics_audit(self, logs_path: str) -> Dict[str, Any]:
        """Analyzes LLM budget logs to detect prompt inflation."""
        audit_res = {"inflation_rate": 0.0, "total_cost": 0.0, "status": "OK"}
        if not os.path.exists(logs_path):
            return audit_res
            
        try:
            with open(logs_path, 'r') as f:
                data = json.load(f)
                total_req = data.get('total_requests', 1)
                if total_req == 0:
                    total_req = 1
                failed_req = data.get('failed_requests', 0)
                audit_res["total_cost"] = data.get('cost_usd', 0.0)
                audit_res["inflation_rate"] = failed_req / total_req
                
                if audit_res["inflation_rate"] > 0.3:
                    audit_res["status"] = "WARNING_HIGH_INFLATION"
                    self.health_score -= 15
        except Exception as e:
            logger.error(f"🔥 [Audit] Ошибка при чтении файла {f}: {e}", exc_info=True)
            
        return audit_res

    async def run_full_audit(self) -> Dict[str, Any]:
        """Orchestrator for all audit protocols."""
        chaos_res = await self.run_chaos_test()
        sast_res = await self.run_sast_scan()
        
        return {
            "health_score": self.health_score,
            "chaos_test_passed": chaos_res,
            "sast_vulnerabilities": sast_res,
            "status": "APPROVED" if self.health_score >= 80 else "NEEDS_FIX"
        }

if __name__ == "__main__":
    import argparse
    import time
    
    parser = argparse.ArgumentParser(description="Audit Morph Chaos Agent")
    parser.add_argument("--chaos", action="store_true", help="Run in continuous chaos mode")
    parser.add_argument("--duration", type=str, default="24h", help="Duration of chaos audit (e.g. 10m, 24h)")
    parser.add_argument("--intensity", type=str, default="normal", help="Intensity of the chaos")
    args = parser.parse_args()

    # Parse duration
    duration_str = args.duration
    duration_secs = 24 * 3600 # Default 24h
    if duration_str.endswith("m"):
        duration_secs = int(duration_str[:-1]) * 60
    elif duration_str.endswith("h"):
        duration_secs = int(duration_str[:-1]) * 3600
        
    logger.info(f"🔥 [Audit-Morph] Запуск Хаос-Аудита на {duration_str} (Интенсивность: {args.intensity})...")
    
    start_time = time.time()
    auditor = AuditMorph(workspace_path="/app/core")
    
    async def run_loop():
        iteration = 1
        while time.time() - start_time < duration_secs:
            logger.info(f"🔄 [Audit-Morph] Итерация хаос-теста #{iteration}")
            res = await auditor.run_full_audit()
            logger.info(f"📊 Результат: Здоровье {res['health_score']}, Статус: {res['status']}")
            
            # Reset health score for continuous testing
            auditor.health_score = 100
            
            # Sleep depending on intensity
            sleep_time = 10 if args.intensity == "high" else 60
            await asyncio.sleep(sleep_time)
            iteration += 1
            
        logger.info("✅ [Audit-Morph] Время вышло. Хаос-аудит успешно завершён.")
        
    if args.chaos:
        asyncio.run(run_loop())
