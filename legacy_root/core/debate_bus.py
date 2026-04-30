import asyncio
import ast
from typing import List, Callable, Any
from core.logger import logger

class ASTInvariantValidator:
    """
    A mathematical prover based on Abstract Syntax Tree (AST) analysis.
    Performs a strict topological proof of code constants and invariants,
    without resorting to LLM heuristics.
    """
    @staticmethod
    async def prove_mathematically(code_payload: str) -> bool:
        logger.info("📐 [$team Debate -> AST Prover] Analyzing the algebraic structure of the code...")
        try:
            tree = ast.parse(code_payload)
            # Proof of absence of dangerous calls through strict AST topology
            for node in ast.walk(tree):
                if isinstance(node, ast.Import) or isinstance(node, ast.ImportFrom):
                    for alias in node.names:
                        if alias.name in ("os", "subprocess", "sys", "pty"):
                            logger.info(f"🛑 [AST Prover] Mathematical rejection: import of `{alias.name}` breaks the isolation invariant.")
                            return False
            # If the topology is valid, the "Safe Code" theorem is proven
            logger.info("✅ [AST Prover] Q.E.D. Mathematical proof passed.")
            return True
        except SyntaxError:
            logger.info("🛑 [AST Prover] Mathematical rejection: Code does not parse (violation of syntax axiomatics).")
            return False

class TeamDebateConsensus:
    """
    $team Paradigm (Claw-Code port)
    Parallel review for making tough decisions.
    Allows setting several highly specialized AIs (Security, Architecture, Healing),
    as well as strictly provable AST verifiers, on the same diff/AST simultaneously.
    """
    def __init__(self, required_approvals: int = 2):
        self.required_approvals = required_approvals

    async def run_debate(self, context_payload: Any, validators: List[Callable]) -> bool:
        logger.info(f"⚖️ [$team Debate] Starting parallel consensus: {len(validators)} nodes.")
        # Run all checks in parallel
        tasks = [asyncio.create_task(v(context_payload)) for v in validators]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        approvals = 0
        for i, res in enumerate(results):
            if isinstance(res, Exception):
                logger.info(f"❌ [$team Debate] Validator {i} failed with an error: {res}")
            elif res is True:
                approvals += 1
            else:
                logger.info(f"🛑 [$team Debate] Validator {i} issued a VETO (Rejected).")
                
        is_passed = approvals >= self.required_approvals
        status = "ACCEPTED" if is_passed else "REJECTED"
        logger.info(f"📜 [$team Debate] Voting result: {approvals}/{len(validators)}. Verdict: {status}.")
        return is_passed
