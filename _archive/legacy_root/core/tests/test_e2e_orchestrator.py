import os
import shutil
from unittest.mock import patch, MagicMock, AsyncMock

from dotenv import load_dotenv
load_dotenv()

import asyncio
try:
    loop = asyncio.get_running_loop()
except RuntimeError:
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

from core.main import SetupRequest, swarm_orchestrator
from core.workspace_manager import WorkspaceManager
from core.file_writer_morph import FileWriterMorph
from core.logger import logger

@patch("core.browser_morph.BrowserMorph.simulate_user_journey", return_value={"status": "success", "errors": []})
@patch("core.healer_morph.HealerMorph.run_tests", new_callable=AsyncMock, return_value=(0, "ok", ""))
@patch("core.healer_morph.HealerMorph.heal_code", new_callable=AsyncMock)
@patch("core.gemini_agent.GeminiCore.think_structured", return_value={"thought": "plan", "code": "def gen1(): pass", "multi_file": "<file path='src/App.tsx'>code</file>"})
@patch("core.db_morph.DBMorph.generate_orm_schema") # prevent bg tasks
def test_full_business_pipeline(mock_generate_orm, mock_gemini, mock_heal, mock_run_tests, mock_browser):
    # Cleanup residue before test starts
    wm = WorkspaceManager()
    project_dir = os.path.join(wm.base_dir, "smartcoffeeshop")
    if os.path.exists(project_dir):
        shutil.rmtree(project_dir, ignore_errors=True)



    # Simulate a request from the frontend
    request = SetupRequest(
        business_type="Smart Coffee Shop",
        modules=["inventory", "pos"]
    )
    
    # Bypassing Redis EventBus, we call on_task_created directly to wait for the response in the test
    payload = {
        "task_id": "gen_test",
        "business_type": request.business_type,
        "message": " ".join(request.modules)
    }
    
    # Mock EventBus so it recursively calls the next handlers instead of sending to Redis
    async def mock_publish(event, payload_data):
        if event == "swarm.backend.generated":
            await swarm_orchestrator.on_backend_generated(payload_data)
        elif event == "swarm.ui.generated":
            await swarm_orchestrator.on_ui_generated(payload_data)
        elif event == "swarm.task.completed":
            await swarm_orchestrator.on_task_completed(payload_data)
        elif event == "swarm.workspace.write_module":
            writer = FileWriterMorph()
            await writer.on_write_module(payload_data)
    
    with patch("core.swarm_orchestrator.bus.publish", side_effect=mock_publish), \
         patch("core.file_writer_morph.bus.publish", side_effect=mock_publish):
        asyncio.run(swarm_orchestrator.on_task_created(payload))
    
    # Assertions
    project_slug = "smartcoffeeshop"
    wm = WorkspaceManager()
    project_dir = os.path.join(wm.base_dir, project_slug)
    
    assert os.path.exists(project_dir), "Orchestrator did not create the project folder!"
    
    # Blueprints should have been saved
    state_file = "blueprints/smartcoffeeshop_state.json"
    assert os.path.exists(state_file), "State (Blueprint) was not saved!"
    
    logger.info("✅ [E2E Orchestrator Test] The pipeline ran flawlessly! Workspace and backend are up.")
    
    # Cleanup
    if os.path.exists(project_dir):
         shutil.rmtree(project_dir)
    if os.path.exists(state_file):
         os.remove(state_file)
