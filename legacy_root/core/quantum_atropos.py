import os
import math
import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Callable, List
from core.gemini_agent import GeminiCore
from core.logger import logger

class MCTSNode:
    def __init__(self, code_state: str, parent=None, action: str = None, error_trace: str = ""):
        self.code_state = code_state
        self.parent = parent
        self.action = action # Which prompt/temperature led here
        self.error_trace = error_trace
        self.children: List['MCTSNode'] = []
        self.visits = 0
        self.value = 0.0
        self.is_terminal = False
        
    def ucb1(self, c_param=1.41) -> float:
        if self.visits == 0:
            return float('inf')
        return (self.value / self.visits) + c_param * math.sqrt(math.log(self.parent.visits) / self.visits)

class QuantumAtropos:
    """
    Honest Decision Tree MCTS (Monte Carlo Tree Search) for Healer-Morph.
    Implements the classic phases: Selection (UCB1), Expansion, Simulation (Rollout), Backpropagation.
    """
    
    def __init__(self, api_key: str = None):
        self.mind = None
        if not api_key:
            api_key = os.environ.get("GEMINI_API_KEY")
        if api_key:
            from core.gemini_agent import GeminiCore
            self.mind = GeminiCore(api_key=api_key)
        else:
            try:
                from core.mlx_agent import CoreMind
                self.mind = CoreMind()
            except ImportError:
                pass
        
    def _generate_branch(self, prompt: str, schema: str, temperature: float, expert_adapter: str = None) -> str:
        """Generate a separate mutation branch."""
        from core.cost_hook import global_cost_manager
        if not self.mind:
            logger.error("❌ [Quantum] No Gemini API key found. Returning an empty branch.")
            return ""
            
        kwargs = {"temperature": temperature}
        if expert_adapter:
            kwargs["expert_adapter"] = expert_adapter
            
        res = self.mind.think_structured(prompt, schema, **kwargs)
        patch = res.get("patch", "")
        
        # Track cost (approximation)
        prompt_tokens = len(prompt) // 4
        comp_tokens = len(patch) // 4
        global_cost_manager.add_usage("gemini-2.5-pro", prompt_tokens, comp_tokens)
        
        return patch

    async def search_best_patch(
        self, 
        broken_code: str, 
        error_trace: str, 
        validation_callback: Callable[[str], tuple[bool, str]],
        branches: int = 3,
        expert_block_adapter: str = None
    ) -> str:
        """
        Main MCTS loop (Honest algorithm).
        """
        logger.info(f"🌌 [Quantum Atropos] Initializing honest MCTS tree (Iterations={branches})...")
        root = MCTSNode(code_state=broken_code, error_trace=error_trace)
        loop = asyncio.get_event_loop()
        schema = "<thought>Patch idea</thought>\n<patch>Full source code of the file without errors</patch>"
        
        for i in range(branches):
            # 1. Selection (Choosing a promising node via UCB1)
            curr = root
            while curr.children and len(curr.children) >= 2 and not curr.is_terminal:
                curr = max(curr.children, key=lambda c: c.ucb1())
                
            if curr.is_terminal and curr.value > 0:
                break
                
            # 2. Expansion (Generating a new node considering the previous error)
            temp = 0.2 + (len(curr.children) * 0.2)
            prompt = (
                f"THE CODE DOES NOT PASS THE TESTS.\n"
                f"Original/Current state:\n```python\n{curr.code_state}\n```\n"
                f"Error traceback:\n{curr.error_trace[-2000:]}\n\n"
                f"Your task is to suggest one perfect fix. Return the FULL corrected code."
            )
            
            patch = await loop.run_in_executor(None, self._generate_branch, prompt, schema, temp, expert_block_adapter)
            

            if not patch or len(patch) < 10:
                continue
                
            patch = patch.replace("```python", "").replace("```tsx", "").replace("```", "").strip()
            
            # 3. Simulation (Rollout Validation)
            try:
                if asyncio.iscoroutinefunction(validation_callback):
                    is_valid, stderr = await validation_callback(patch)
                else:
                    is_valid, stderr = validation_callback(patch)
            except Exception as e:
                is_valid, stderr = False, str(e)
                
            reward = 1.0 if is_valid else -1.0
            
            new_node = MCTSNode(code_state=patch, parent=curr, action=f"Temp={temp}", error_trace=stderr)
            curr.children.append(new_node)
            
            if is_valid:
                new_node.is_terminal = True
                
            # 4. Backpropagation
            prop_node = new_node
            while prop_node is not None:
                prop_node.visits += 1
                prop_node.value += reward
                prop_node = prop_node.parent
                
            if is_valid:
                logger.info("🟩 [Quantum Atropos] Green branch found ahead of schedule!")
                return new_node.code_state
                
        # Select the best node in the tree
        def get_all_nodes(n):
            nodes = [n]
            for c in n.children:
                nodes.extend(get_all_nodes(c))
            return nodes
            
        all_nodes = get_all_nodes(root)
        best_node = max(all_nodes, key=lambda n: n.value)
        
        if best_node == root or best_node.value <= 0:
            logger.info("❌ [Quantum Atropos] MCTS tree did not find a safe patch. Bankrupt.")
            return None
            
        logger.info("✅ [Quantum Atropos] MCTS converged on a patch. Selecting the best branch found.")
        return best_node.code_state