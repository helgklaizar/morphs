import asyncio
from core.event_bus import SwarmEventBus

def test_event_bus_mock():
    async def run_test():
        import redis.exceptions
        bus = SwarmEventBus()
        try:
            await bus.connect()
        except redis.exceptions.ConnectionError:
            import pytest
            pytest.skip("Redis is not running locally. Skipping EventBus test.")
        tracker = {"called": False, "payload": None}
        async def handler(payload):
            tracker["called"] = True
            tracker["payload"] = payload
            
        await bus.subscribe("test_topic", handler)
        await bus.publish("test_topic", {"key": "value"})
        
        # Give pubsub time to process the message
        await asyncio.sleep(0.5)
        
        assert tracker["called"] is True
        assert tracker["payload"]["key"] == "value"
        
        # Cleanup
        if bus._listener_task:
            bus._listener_task.cancel()
            try:
                await bus._listener_task
            except asyncio.CancelledError:
                pass

    asyncio.run(run_test())
