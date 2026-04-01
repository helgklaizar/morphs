import asyncio
from core.watchdog_morph import WatchdogMorph

def test_watchdog_timeout():
    async def run_test():
        wd = WatchdogMorph(kill_timeout=0.5, poll_interval=0.2)
        
        async def hanging():
            await asyncio.sleep(5)
            
        task_ref = asyncio.create_task(hanging())
        wd.register_task("t1", "test_hang", task_ref)
        
        # Monitor for a bit
        monitor_task = asyncio.create_task(wd.monitor_loop())
        
        await asyncio.sleep(1.5) # Wait for watchdog to trigger
        
        assert "t1" not in wd.active_tasks # removed
        assert task_ref.cancelled() # cancelled
        
        monitor_task.cancel()
        try:
            await monitor_task
        except asyncio.CancelledError:
            pass

    asyncio.run(run_test())

def test_watchdog_complete_early():
    async def run_test():
        wd = WatchdogMorph(kill_timeout=5)
        wd.register_task("t2", "fast", None)
        assert "t2" in wd.active_tasks
        wd.complete_task("t2")
        assert "t2" not in wd.active_tasks
        
    asyncio.run(run_test())
