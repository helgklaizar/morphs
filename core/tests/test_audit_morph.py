import asyncio
import os
import json
import shutil
from core.audit_morph import AuditMorph

def test_audit_morph_full():
    async def run_test():
        workspace = "tmp_audit_workspace"
        os.makedirs(workspace, exist_ok=True)
        
        try:
            with open(os.path.join(workspace, "bad_code.py"), "w") as f:
                f.write("def login():\n    api_key='AIzaSy123456789'\n    return api_key")
                
            with open(os.path.join(workspace, "budget.json"), "w") as f:
                json.dump({"total_requests": 100, "failed_requests": 35, "cost_usd": 1.5}, f)
                
            audit = AuditMorph(workspace)
            res = await audit.run_full_audit()
            
            # 1. Chaos should pass
            assert res["chaos_test_passed"] is True
            
            # 2. SAST should fail
            assert len(res["sast_vulnerabilities"]) > 0
            assert "Hardcoded secret" in res["sast_vulnerabilities"][0]
            
            # 3. Tokenomics should fail
            tok_audit = await audit.run_tokenomics_audit(os.path.join(workspace, "budget.json"))
            assert tok_audit["inflation_rate"] == 0.35
            assert tok_audit["status"] == "WARNING_HIGH_INFLATION"
            
            # Overall score
            assert audit.health_score == 75  # 100 - 10 (Sast regex match) - 15 (Tokenomics)
            assert audit.health_score < 80
        finally:
            shutil.rmtree(workspace, ignore_errors=True)

    asyncio.run(run_test())
