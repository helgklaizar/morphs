from mlx_lm import load, generate
import json
import re
import os
from core.logger import logger

# Global variables for reusing single MLX GPU weights
_GLOBAL_MODEL = None
_GLOBAL_TOKENIZER = None

class CoreMind:
    def __init__(self, model_name="mlx-community/Meta-Llama-3-8B-Instruct-4bit"):
        global _GLOBAL_MODEL, _GLOBAL_TOKENIZER
        self.model_name = model_name
        
        # 🤝 [Hybrid Mode] Initialize Gemini as a fallback if a key exists
        self.gemini_fallback = None
        if os.environ.get("GEMINI_API_KEY"):
            logger.info("🤝 [Hybrid Mode] API key detected! Gemini is connected as a transparent fallback.")
            try:
                from core.gemini_agent import GeminiCore
                self.gemini_fallback = GeminiCore()
            except ImportError:
                pass

        if self.gemini_fallback:
            logger.info("⚡️ [CoreMind] MLX loading canceled as Gemini API is being used.")
        else:
            if _GLOBAL_MODEL is None:
                logger.info(f"🧠 Loading Core Mind ({model_name}) into Apple MLX (Singleton)...")
                try:
                    _GLOBAL_MODEL, _GLOBAL_TOKENIZER = load(self.model_name)
                    logger.info("✅ Neural network successfully loaded into UNIFIED memory (Metal GPU).")
                except Exception as e:
                    logger.info(f"⚠️ Error loading local model: {e}")
                    raise e
            else:
                logger.info("🔗 [CoreMind] Using already loaded weights (Metal GPU Shared Memory).")
            
        self.model = _GLOBAL_MODEL
        self.tokenizer = _GLOBAL_TOKENIZER
        self.current_adapter = None
        
        # 📚 Point 2: Context Window Optimization (Hidden Vector Memory)
        self.chroma_client = None
        logger.info("🗄️ [CoreMind] Old ChromaDB is disabled. Vector memory has been migrated to LanceDB/Atropos.")

    def add_to_memory(self, doc_id: str, text: str):
        pass # Logic moved to graph_rag.py

    def query_vector_memory(self, query: str, top_k: int = 2):
        """Vector layer (ChromaDB) for retrieving relevant rules without context overflow"""
        if self.chroma_client and self.memory_collection.count() > 0:
            results = self.memory_collection.query(query_texts=[query], n_results=top_k)
            if results and results["documents"] and len(results["documents"]) > 0:
                return "\n".join(results["documents"][0])
        
        # Fallback
        if not os.path.exists("../blueprints"):
            return "Memory is empty."
        return "Vector layer (Fallback) context: " + ", ".join(os.listdir("../blueprints"))

    def use_tool(self, tool_name, kwargs):
        """Calling external tools (Tool Use) to extend the core's context"""
        logger.info(f"🛠️ [CoreMind Tool Use] {tool_name}({kwargs})")
        if tool_name == "read_file":
            try:
                with open(kwargs.get("path", ""), "r") as f:
                    return f.read()
            except Exception as e:
                return f"Error: {e}"
        return "Tool not found"
        
    def think_with_react(self, prompt: str, schema_description: str, tools_list: list, max_steps: int = 5) -> dict:
        """
        🛡️ Point 1: ReAct (Reasoning and Acting) Loop
        Full cycle: Thought -> Action (Tool) -> Action Result -> Code
        Runs recursively for up to 5 steps.
        """
        messages_history = prompt + f"\n[AVAILABLE TOOLS]: {json.dumps(tools_list)}\n"
        
        for step in range(max_steps):
            logger.info(f"🔄 [ReAct Loop] Step {step+1}: AI is thinking about the next action...")
            
            # Forcing it to think
            result = self.think_structured(messages_history, schema_description + "\nOR if a tool is needed, write <tool_call>{\"name\": \"function_name\", \"args\": {\"param\": \"value\"}}</tool_call>")
            
            # If the `<tool_call>` tag is found in "thought" or "code" (raw parsing)
            tool_match = None
            if "tool_call" in result:
                tool_match = result["tool_call"]
            else:
                raw_full = result.get("thought", "") + result.get("code", "")
                fallback_tool = re.search(r'<tool_call>(.*?)</tool_call>', raw_full, re.DOTALL)
                if fallback_tool:
                    tool_match = fallback_tool.group(1).strip()
            
            if tool_match:
                try:
                    tool_data = json.loads(tool_match)
                    tool_name = tool_data.get("name")
                    tool_args = tool_data.get("args", {})
                    
                    tool_res = self.use_tool(tool_name, tool_args)
                    logger.info(f"✅ [ReAct Loop] Tool returned a result (length: {len(tool_res)} chars)")
                    
                    # Injecting the tool's response into the history!
                    messages_history += f"\n<tool_call>{tool_match}</tool_call>\n<tool_result>{tool_res}</tool_result>\nContinue executing the task."
                except Exception as e:
                    messages_history += f"\n<tool_result>TOOL ERROR: {e}</tool_result>\nFix the arguments and try again."
            else:
                logger.info("🎯 [ReAct Loop] Tools are no longer needed. Loop finished.")
                return result # Returning the final dictionary (Thought + Code)
                
        return {"thought": "ReAct Loop timeout. Step limit exceeded.", "code": "Error: Timeout"}

    def think(self, prompt: str, max_tokens: int = 512,  temperature: float = 0.2) -> str:
        """Standard unstructured generation (Zero-Shot)"""
        system_instructions = (
            "<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n"
            "You are a Core Architect, part of the Morphs business OS. Work quickly and accurately.\n"
            "<|eot_id|><|start_header_id|>user<|end_header_id|>\n"
            f"{prompt}\n<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n"
        )
        logger.info("⚡️ Thinking (Standard)...")
        # In mlx_lm, repetition penalty is passed via sampler mapping sometimes, 
        # but for safety we omit it here and rely on structured output.
        from core.memory_morph import MemoryMorph
        
        while True:
            try:
                response = generate(self.model, self.tokenizer, prompt=system_instructions, max_tokens=max_tokens)
                return response.strip().split("<|eot_id|>")[0].replace("```python", "").replace("```", "")
            except Exception as e:
                err_str = str(e).lower()
                if "context" in err_str or "exceed" in err_str or "length" in err_str or "too long" in err_str:
                    logger.warning(f"🔄 [MLX Context Exceeded] Error: {e}. Forcing context compression...")
                    new_sys = MemoryMorph.microcompact(system_instructions, max_chars=len(system_instructions) // 2)
                    if len(new_sys) >= len(system_instructions):
                        if hasattr(self, "gemini_fallback") and self.gemini_fallback:
                            logger.info(f"🔄 [Hybrid Mode] Local compression failed. Passing to Cloud API (Gemini)...")
                            return self.gemini_fallback.think(prompt, max_tokens)
                        raise e
                    system_instructions = new_sys
                    continue
                
                if hasattr(self, "gemini_fallback") and self.gemini_fallback:
                    logger.info(f"🔄 [Hybrid Mode] Local generation failed ({e}). Switching to Cloud API (Gemini)...")
                    return self.gemini_fallback.think(prompt, max_tokens)
                raise e

    def think_structured(self, prompt: str, schema_description: str, max_tokens: int = 2048, expert_adapter: str = None) -> dict:
        """
        (o1 Engine Mode) + (MoE LoRA Hot-Swapping)
        Forced generation of Graph of Thoughts and CODE via XML tags.
        If an expert_adapter ("react" or "sql") is passed, the core will hot-load the necessary neuro-weights.
        """
        skill_instruction = ""
        if expert_adapter:
            if getattr(self, "current_adapter", None) != expert_adapter:
                logger.info(f"🔥 [LoRA MoE] Hot-swapping neuro-expert: [{expert_adapter.upper()}-LORA]")
                # There will be an mx.core API for dynamic weight application, for now simulating loading:
                # apply_lora_layers(self.model, f"adapters/{expert_adapter}")
                self.current_adapter = expert_adapter
            else:
                logger.info(f"🔗 [Block PathMoA] Neuro-expert '{expert_adapter.upper()}' is already active (Context Caching).")
            
            # 🧪 [Skills Manager] Loading Markdown competencies and Hooks (Task 14)
            from core.skills_manager import SkillsManager
            from core.tool_registry_morph import ToolRegistryMorph
            
            skills_mgr = SkillsManager()
            skills_mgr.discover_skills()
            
            if expert_adapter in skills_mgr.skills:
                logger.info(f"📖 [MLX CoreMind] Skill '{expert_adapter}' with built-in hooks loaded!")
                skill_instruction = "\n🎯 SKILL INSTRUCTION (SKILL.md):\n" + skills_mgr.get_skill(expert_adapter) + "\n\n"
                
                try:
                    registry = ToolRegistryMorph()
                    skills_mgr.run_pre_hooks(expert_adapter, {}, registry=registry)
                except Exception as e:
                    logger.warning(f"⚠️ [MLX CoreMind] Error calling Pre-Hooks for skill {expert_adapter}: {e}")
        
        # 🧬 [Atropos RL] Loading Long-Term System Experience (Past Errors)
        rl_experience = "No past errors."
        try:
            from core.atropos_memory import AtroposMemory
            memory_db = AtroposMemory()
            experience = memory_db.get_relevant_experience(expert_adapter or "General", limit=3)
            if experience:
                rl_experience = experience
        except Exception as e:
            logger.info(f"⚠️ [Atropos] Error reading RL memory (LanceDB): {e}")
        system_instructions = (
            "<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n"
            "You are Enterprise CoreMind. Your thinking process must consist of a 'Graph of Thoughts' before writing code!\n"
            f"🧠 ATROPOS EXPERIENCE REPLAY (Do not make these mistakes again!):\n{rl_experience}\n\n"
            f"{skill_instruction}"
            "YOU MUST use the XML tag format for the response. No text outside the tags.\n"
            f"RESPONSE FORMAT:\n{schema_description}\n"
            "<|eot_id|><|start_header_id|>user<|end_header_id|>\n"
            f"{prompt}\n<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n"
            "<thought>\n"
        )
        
        logger.info("⚡️ Thinking O1-Mode (XML Graph of Thoughts)...")
        from core.memory_morph import MemoryMorph
        
        while True:
            try:
                response = generate(self.model, self.tokenizer, prompt=system_instructions, max_tokens=max_tokens)
                break
            except Exception as e:
                err_str = str(e).lower()
                if "context" in err_str or "exceed" in err_str or "length" in err_str or "too long" in err_str:
                    logger.warning(f"🔄 [MLX Context Exceeded O1] Error: {e}. Forcing context compression...")
                    new_sys = MemoryMorph.microcompact(system_instructions, max_chars=len(system_instructions) // 2)
                    if len(new_sys) >= len(system_instructions):
                        if hasattr(self, "gemini_fallback") and self.gemini_fallback:
                            logger.info(f"🔄 [Hybrid Mode] Local compression failed. Passing to Cloud API (Gemini)...")
                            return self.gemini_fallback.think_structured(prompt, schema_description, max_tokens, expert_adapter)
                        raise e
                    system_instructions = new_sys
                    continue

                if hasattr(self, "gemini_fallback") and self.gemini_fallback:
                    logger.info(f"🔄 [Hybrid Mode O1] Local generation failed ({e}). Delegating to Cloud API (Gemini)...")
                    return self.gemini_fallback.think_structured(prompt, schema_description, max_tokens, expert_adapter)
                raise e
        
        raw_output = "<thought>\n" + response.split("<|eot_id|>")[0].strip()
        
        tags = re.findall(r'<([a-zA-Z0-9_]+)>(.*?)</\1>', raw_output, re.DOTALL)
        result_dict = {}
        for tag, content in tags:
            clean_content = content.replace("```python", "").replace("```tsx", "").replace("```typescript", "").replace("```", "").strip()
            result_dict[tag] = clean_content
            
        if "thought" not in result_dict:
            thought_match = re.search(r'<thought>(.*?)</thought>', raw_output, re.DOTALL)
            result_dict["thought"] = thought_match.group(1).strip() if thought_match else "No thought extracted"
            
        if "code" not in result_dict and "component_code" not in result_dict:
            logger.info("⚠️ [CoreMind] XML closing code tag not found. Extracting everything after </thought>...")
            fallback_match = re.split(r'</thought>', raw_output)
            raw_code = fallback_match[-1] if len(fallback_match) > 1 else raw_output
            
            clean_code = raw_code.replace("```python", "").replace("```tsx", "").replace("```typescript", "").replace("```", "")
            clean_code = clean_code.replace("<code>", "").replace("<component_code>", "").strip()
            
            result_dict["code"] = clean_code
            result_dict["component_code"] = clean_code
            
        if "code" in result_dict and "component_code" not in result_dict:
            result_dict["component_code"] = result_dict["code"]
        if "component_code" in result_dict and "code" not in result_dict:
            result_dict["code"] = result_dict["component_code"]
            
        # 🧪 [Skills Manager] Executing Post-Hooks (Validation after generation)
        if expert_adapter and 'skills_mgr' in locals() and expert_adapter in skills_mgr.skills:
            try:
                skills_mgr.run_post_hooks(expert_adapter, result_dict.get("code", ""), registry=locals().get('registry'))
            except Exception as e:
                logger.warning(f"⚠️ [MLX CoreMind] Error calling Post-Hooks for skill {expert_adapter}: {e}")
            
        return result_dict

if __name__ == "__main__":
    mind = CoreMind()
    test_prompt = "Generate a JSON Blueprint object for 'Restaurant', where the ID is 'rest'."
    # Demonstration of connecting an expert
    result = mind.think_structured(test_prompt, schema_description="<thought>Thought</thought><code>Code</code>", expert_adapter="json_architect")
    logger.info(f"\n[Core Mind Response]:\n{result}")
