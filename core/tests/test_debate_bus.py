import asyncio
from core.debate_bus import TeamDebateConsensus

def test_debate_consensus_pass():
    async def run_test():
        debate = TeamDebateConsensus(required_approvals=2)
        async def val_pass_1(payload): return True
        async def val_pass_2(payload): return True
        async def val_fail(payload): return False
        result = await debate.run_debate("test_payload", [val_pass_1, val_pass_2, val_fail])
        assert result is True
    asyncio.run(run_test())

def test_debate_consensus_fail():
    async def run_test():
        debate = TeamDebateConsensus(required_approvals=2)
        async def val_pass(payload): return True
        async def val_fail_1(payload): return False
        async def val_fail_2(payload): return False
        result = await debate.run_debate("test_payload", [val_pass, val_fail_1, val_fail_2])
        assert result is False
    asyncio.run(run_test())
