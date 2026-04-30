import asyncio
import time
from typing import Dict, Any
from core.logger import logger

class WatchdogMorph:
    """
    Supervisor (Watchdog). Monitors hung tasks in the background and kills/restarts 
    the hung 'Thinking' process of the AI. Out-Of-Memory protection.
    Integrated with asyncio Task Management.
    """
    def __init__(self, kill_timeout: int = 45, poll_interval: float = 5.0):
        self.kill_timeout = kill_timeout
        self.poll_interval = poll_interval
        self.active_tasks: Dict[str, Dict[str, Any]] = {}

    def register_task(self, task_id: str, name: str, task_ref: asyncio.Task = None):
        self.active_tasks[task_id] = {
            "name": name, 
            "start_time": time.time(),
            "task_ref": task_ref
        }
        logger.info(f"👁️ [Watchdog-Morph] Now monitoring process '{name}' (ID: {task_id})")
        
    def complete_task(self, task_id: str):
        if task_id in self.active_tasks:
            name = self.active_tasks[task_id]["name"]
            del self.active_tasks[task_id]
            logger.info(f"✅ [Watchdog-Morph] Process '{name}' completed normally. Removed from supervision.")

    async def monitor_loop(self):
        logger.info("👁️ [Watchdog-Morph] Started background monitoring of the swarm (OOM/Hang Protection).")
        while True:
            now = time.time()
            for tid, info in list(self.active_tasks.items()):
                if now - info["start_time"] > self.kill_timeout:
                    logger.info(f"⚠️ [Watchdog-Morph] HANG DETECTED: Node {info['name']} has been hanging for more than {self.kill_timeout} sec! Performing Hard-Reset (Cancel)...")
                    if info["task_ref"] and not info["task_ref"].done():
                        info["task_ref"].cancel()
                    self.complete_task(tid)
                    
                    try:
                        from event_bus import bus
                        await bus.publish("watchdog.task_killed", {"task_id": tid, "name": info["name"]})
                    except Exception as e:
                        logger.info(f"⚠️ [Watchdog] Error broadcasting killed-event: {e}")
            await asyncio.sleep(self.poll_interval)
