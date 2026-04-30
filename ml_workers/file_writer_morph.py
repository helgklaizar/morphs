import os
import asyncio
from event_bus import bus
from workspace_manager import WorkspaceManager
from core.logger import logger

class FileWriterMorph:
    """A standalone worker for writing files, receiving data via EventBus (P2P)."""
    def __init__(self):
        self.wm = WorkspaceManager()

    async def setup_listeners(self):
        logger.info("💾 [FileWriter] Subscribing to the file system write topic...")
        await bus.subscribe("swarm.workspace.write_module", self.on_write_module)

    async def on_write_module(self, payload: dict):
        project_name = payload.get("project_name")
        multi_file_xml = payload.get("multi_file_xml")
        target_dir = payload.get("target_dir")
        task_id = payload.get("task_id")
        work_dir = payload.get("work_dir")

        logger.info(f"💾 [FileWriter] Received a command to write files via the P2P bus: {project_name}")
        
        created_files = self.wm.extract_multi_file(project_name, multi_file_xml)
        
        os.makedirs(target_dir, exist_ok=True)
        app_code = "export default function Error() { return <div>No files</div> }"
        
        if "src/App.tsx" in created_files:
            with open(created_files["src/App.tsx"], "r") as f:
                app_code = f.read()

        with open(os.path.join(target_dir, "GeneratedModule.tsx"), "w") as f:
            f.write(app_code)
            
        with open(os.path.join(target_dir, "GeneratedModule.test.tsx"), "w") as f:
            f.write("import {test} from 'vitest'")

        # Triggering the next stage (as intended in the P2P architecture)
        await bus.publish("swarm.ui.generated", {
            "task_id": task_id,
            "project_name": project_name,
            "work_dir": work_dir,
            "target_dir": target_dir
        })
