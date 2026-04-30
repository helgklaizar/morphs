import json
import time
import os
import asyncio
from core.quantum_atropos import QuantumAtropos
from core.security_morph import SecurityMorph
from core.logger import logger

class HealerMorph:
    def __init__(self, project_path: str, target_file: str):
        self.project_path = project_path
        self.target_file = target_file
        
        from core.atropos_memory import AtroposMemory
        self.memory_db = AtroposMemory()
        
        logger.info("💡 [Healer-Morph] Waking up Agent (with Quantum Atropos / LanceDB)...")
        # Initialize the quantum healer (MCTS)
        self.quantum = QuantumAtropos()
        
    async def run_tests(self):
        logger.info(f"💡 [Healer-Morph] Running tests via npx vitest in {self.project_path} ...")
        from core.bash_harness import BashHarness, BashCommandInput
        harness = BashHarness()
        
        # Run npx vitest for the entire project or a specific file
        target = self.target_file if self.target_file else ""
        out = await harness.execute(BashCommandInput(
            command=f"npx vitest run {target}",
            cwd=self.project_path,
            timeout=30
        ))
        
        # If the command is not found (e.g., npx), it will return code 127
        return out.return_code, out.stdout, out.stderr

    async def validate_patch_callback(self, patch_code: str) -> tuple[bool, str]:
        """
        Callback for QuantumAtropos. Save the patch to a temporary layer (hot-swap)
        and run real tests. Returns (success, error traceback).
        """
        # Backup the original file
        with open(self.target_file, "r") as f:
            original = f.read()
            
        try:
            # Inject the patch
            with open(self.target_file, "w") as f:
                f.write(patch_code)
            
            # 1. First, a pentest
            pentester = SecurityMorph()
            is_safe = pentester.run_pentest(self.target_file)
            if not is_safe:
                return False, "Security check failed (AST Invariant violation)."
                
            # 2. REAL TEST: Run vitest / bun test in isolation for this file
            from core.bash_harness import BashHarness, BashCommandInput
            harness = BashHarness()
            
            # Run bun test (or npm run test) only for this file
            out = await harness.execute(BashCommandInput(
                command=f"npx vitest run {self.target_file}",
                cwd=self.project_path,
                timeout=10
            ))
            
            return out.return_code == 0, out.stderr
            
        except Exception as e:
            logger.error(f"🔥 [Healer-Morph] Validation error: {e}")
            return False, str(e)
        finally:
            # Restore the files (Rollback)
            with open(self.target_file, "w") as f:
                f.write(original)

    async def heal_code(self, task_dir: str):
        """Reads the Evidence Folder and fixes the code through parallel branches of Quantum Atropos."""
        logger.info(f"🔥 [Healer-Morph] Tests failed. Scanning evidence from {task_dir}...")
        
        evidence_log = ""
        build_path = os.path.join(task_dir, "evidence", "build.txt")
        if os.path.exists(build_path):
            with open(build_path, "r") as f:
                evidence_log += f"VITEST/BUN LOG:\n{f.read()}\n\n"
                
        browser_path = os.path.join(task_dir, "evidence", "browser_errors.json")
        if os.path.exists(browser_path):
            with open(browser_path, "r") as f:
                evidence_log += f"PLAYWRIGHT BROWSER LOG:\n{f.read()}\n\n"

        if not os.path.exists(self.target_file):
            return "File not found", False

        with open(self.target_file, "r") as f:
            broken_code = f.read()

        # If the file just contains the word 'broken' (a stub from old tests) - fix it quickly
        # Stub removed (Audit Step 1).

        logger.info("🔮 [Healer-Morph + Quantum] Starting MCTS Patch Search Tree...")
        
        best_patch = await self.quantum.search_best_patch(
            broken_code=broken_code,
            error_trace=evidence_log[-2000:],
            validation_callback=self.validate_patch_callback,
            branches=3,
            expert_block_adapter="healer"
        )

        if not best_patch:
            logger.info("❌ [Healer-Morph] MCTS Tree did not find a safe/passing patch. Bankrupt.")
            return evidence_log, False
            
        logger.info(f"🔧 [Healer-Morph] MCTS Patch found! Applying to {self.target_file}")
        with open(self.target_file, "w") as f:
            f.write(best_patch)
            
        return evidence_log, True

    def record_trajectory(self, prompt, action, reward, state_after):
        self.memory_db.record_experience(
            error=prompt[-2000:], # Save the last 2000 characters of the error
            fixed_code=action,
            reward=reward
        )
        logger.info("🧠 [Atropos RL] Response trajectory (success/failure) saved to LanceDB.")
