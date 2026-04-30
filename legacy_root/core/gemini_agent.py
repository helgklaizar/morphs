import os
import re
import json
from google import genai
from google.genai import types
from core.logger import logger
from core.cost_hook import global_cost_manager
from core.post_sampling_hooks import PostSamplingHooks
from core.prompt_hierarchy import PromptHierarchy, build_agent_prompt, KV_CACHE_BOUNDARY
from core.system_reminder import inject_reminders, strip_reminders

# Registering a hook for background token counting
PostSamplingHooks.register(
    lambda model_name, in_toks, out_toks: global_cost_manager.add_usage(model_name, in_toks, out_toks)
)

class GeminiCore:
    """
    The "Heavy Artillery" of AI.
    Used for architectural solutions where Gemini 3.1 Pro / 2.5 Pro logic is needed
    with a context of 2M+ tokens, instead of the local 8B parameter Llama-3.
    Has the EXACT SAME `think` and `think_structured` interface as the local CoreMind (Drop-in Replacement).
    """

    def __init__(self, model_name="gemini-2.5-pro", api_key=None):
        logger.info(f"☁️ [GeminiCore] Connecting to Google Cloud Model: {model_name}...")
        self.model_name = model_name
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY")
        if not self.api_key:
            logger.info("⚠️ [GeminiCore] Warning: GEMINI_API_KEY is not set. API calls will fail!")
        
        self.client = genai.Client(api_key=self.api_key)
        logger.info("✅ [GeminiCore] Connection successful.")

    def think(
        self,
        prompt: str,
        max_tokens: int = 8192,
        temperature: float = 0.5,
        agent_role: str = "",
        tool_output: str = "",
    ) -> str:
        """
        Standard generation.

        Args:
            agent_role:   The agent's role for the prompt hierarchy ('agent' layer).
            tool_output:  The tool's output — will be enriched with system-reminder tags
                          and injected at the beginning of the prompt.
        """
        logger.info("⚡️ [GeminiCore] Thinking (Standard)...")
        from core.memory_morph import MemoryMorph

        # ── [Prompt Hierarchy] Assembling the system prompt ──────────────────
        built = build_agent_prompt(
            agent_role=agent_role or "You are Enterprise CoreMind. Act strictly as a cool Senior developer.",
        )
        system_instruction = built.static_system

        # ── [SystemReminder] Injecting behavioral tags into tool output ──
        enriched_tool = ""
        if tool_output:
            enriched_tool = inject_reminders(tool_output, source="tool_output", extra_context=prompt)

        # Final prompt: dynamic_prefix + tool output + task
        parts = [p for p in [built.dynamic_prefix, enriched_tool, prompt] if p]
        final_prompt = "\n\n".join(parts)

        while True:
            try:
                response = self.client.models.generate_content(
                    model=self.model_name,
                    contents=[final_prompt],
                    config=types.GenerateContentConfig(
                        temperature=temperature,
                        max_output_tokens=max_tokens,
                        system_instruction=system_instruction,
                    )
                )
                break
            except Exception as e:
                err_str = str(e).lower()
                if "context" in err_str or "exceed" in err_str or "400" in err_str:
                    logger.warning(f"🔄 [ContextLengthExceeded] Emergency error interception: {e}. Forcing context compression...")
                    new_prompt = MemoryMorph.microcompact(final_prompt, max_chars=len(final_prompt) // 2)
                    if len(new_prompt) >= len(final_prompt):
                        logger.error("❌ Failed to compress context!")
                        raise e
                    final_prompt = new_prompt
                    continue
                logger.error(f"❌ [GeminiCore] Generation error: {e}")
                return "Error"
        
        # 💵 Token tracking (Post-sampling Hook)
        try:
            if hasattr(response, "usage_metadata") and response.usage_metadata:
                in_toks = response.usage_metadata.prompt_token_count
                out_toks = response.usage_metadata.candidates_token_count
                PostSamplingHooks.execute(model_name=self.model_name, in_toks=in_toks, out_toks=out_toks)
        except Exception as e:
            logger.info(f"⚠️ [PostHook] Failed to extract tokens: {e}")

        try:
            raw = response.text or ""
            # Remove system-reminder tags from the response before returning to the user
            return strip_reminders(raw)
        except Exception as e:
            logger.error(f"❌ [GeminiCore] Error extracting text from API: {e}. Response: {response}")
            return "Error"

    def think_structured(self, prompt: str, schema_description: str, max_tokens: int = 8192, expert_adapter: str = None, temperature: float = 0.5) -> dict:
        """
        Forced generation of Graph of Thoughts and CODE via XML tags.
        """
        skill_instruction = ""
        if expert_adapter:
            logger.info(f"🔥 [GeminiCore] Configuring system prompt for specialization: [{expert_adapter.upper()}]")
            
            # 🧪 [Skills Manager] Loading Markdown competencies and Hooks (Task 14)
            from core.skills_manager import SkillsManager
            from core.tool_registry_morph import ToolRegistryMorph
            
            skills_mgr = SkillsManager()
            skills_mgr.discover_skills()
            
            if expert_adapter in skills_mgr.skills:
                logger.info(f"📖 [GeminiCore] Loaded skill '{expert_adapter}' with built-in hooks!")
                skill_instruction = "\n🎯 SKILL INSTRUCTION (SKILL.md):\n" + skills_mgr.get_skill(expert_adapter) + "\n\n"
                
                # Running pre_hooks, integrating with the tool registry
                try:
                    registry = ToolRegistryMorph()
                    skills_mgr.run_pre_hooks(expert_adapter, {}, registry=registry)
                except Exception as e:
                    logger.warning(f"⚠️ [GeminiCore] Error calling Pre-Hooks for skill {expert_adapter}: {e}")
            
        # 🧬 [Atropos RL] Loading project error memory (LanceDB Vector DB) so Gemini doesn't repeat them
        rl_experience = "No past mistakes."
        try:
            from core.atropos_memory import AtroposMemory
            memory_db = AtroposMemory()
            experience = memory_db.get_relevant_experience(expert_adapter or "General", limit=10)
            if experience:
                rl_experience = experience
        except Exception as e:
            logger.info(f"⚠️ [GeminiCore] AtroposMemory warning: {e}")

        # ── [Prompt Hierarchy] Multi-layered O1-prompt assembly ─────────────
        agent_role_str = (
            "You are Enterprise CoreMind (Gemini Edition). "
            "Your thought process must consist of a 'Tree of Thoughts' before writing code!\n"
            "You MUST use the XML tag format for the response. No text outside the tags.\n"
            f"RESPONSE FORMAT:\n{schema_description}"
        )
        built = build_agent_prompt(
            agent_role=agent_role_str,
            skill_content=skill_instruction or None,
            rl_experience=rl_experience if rl_experience != "No past mistakes." else None,
        )
        system_instruction = built.static_system
        # dynamic_prefix (agent role + skill + RL) goes at the beginning of the user prompt
        dynamic_prefix = built.dynamic_prefix
        
        logger.info("⚡️ [GeminiCore] Thinking in O1-Mode (XML Graph of Thoughts)...")
        
        from core.memory_morph import MemoryMorph

        # Assembling the final prompt: dynamic layers + user task
        parts = [p for p in [dynamic_prefix, prompt] if p]
        final_prompt = "\n\n".join(parts)

        while True:
            try:
                response = self.client.models.generate_content(
                    model=self.model_name,
                    contents=[final_prompt],
                    config=types.GenerateContentConfig(
                        temperature=temperature,
                        max_output_tokens=max_tokens,
                        system_instruction=system_instruction,
                    )
                )
                break
            except Exception as e:
                err_str = str(e).lower()
                if "context" in err_str or "exceed" in err_str or "400" in err_str:
                    logger.warning(f"🔄 [ContextLengthExceeded] Emergency error interception: {e}. Forcing context compression...")
                    new_prompt = MemoryMorph.microcompact(final_prompt, max_chars=len(final_prompt) // 2)
                    if len(new_prompt) >= len(final_prompt):
                        logger.error("❌ [ContextLengthExceeded] Failed to compress context!")
                        raise e
                    final_prompt = new_prompt
                    continue
                logger.error(f"❌ [GeminiCore] O1 generation error: {e}")
                response = None
                break
        
        if not response:
            return {"thought": "Error", "code": "Error generated", "component_code": "Error generated"}

        # 💵 Token tracking (Post-sampling Hook)
        try:
            if hasattr(response, "usage_metadata") and response.usage_metadata:
                in_toks = response.usage_metadata.prompt_token_count
                out_toks = response.usage_metadata.candidates_token_count
                PostSamplingHooks.execute(model_name=self.model_name, in_toks=in_toks, out_toks=out_toks)
        except Exception as e:
            logger.info(f"⚠️ [PostHook] Failed to extract tokens: {e}")
        
        try:
            raw_output = response.text or ""
            if not raw_output:
                logger.error(f"❌ [GeminiCore] Empty response from API! Response Data: {response}")
                raw_output = "<thought>Error</thought><code>Error generated</code>"
        except Exception as e:
            logger.error(f"❌ [GeminiCore] Error extracting text from API: {e}. Response: {response}")
            raw_output = "<thought>Error</thought><code>Error generated</code>"
            
        # Parser is 1-to-1 the same as in mlx_agent.py, so the rest of the program's code doesn't need to be changed
        tags = re.findall(r'<([a-zA-Z0-9_]+)>(.*?)</\1>', raw_output, re.DOTALL)
        result_dict = {tag: content.replace("```python", "").replace("```tsx", "").replace("```", "").strip() for tag, content in tags}
            
        if "thought" not in result_dict:
            thought_match = re.search(r'<thought>(.*?)</thought>', raw_output, re.DOTALL)
            result_dict["thought"] = thought_match.group(1).strip() if thought_match else "No thoughts"
            
        if "code" not in result_dict and "component_code" not in result_dict:
            fallback = re.split(r'</thought>', raw_output)[-1]
            clean = fallback.replace("```python", "").replace("```tsx", "").replace("```", "").replace("<code>", "").replace("<component_code>", "").strip()
            result_dict["code"] = clean
            result_dict["component_code"] = clean
            
        if "code" in result_dict and "component_code" not in result_dict:
            result_dict["component_code"] = result_dict["code"]
        if "component_code" in result_dict and "code" not in result_dict:
            result_dict["code"] = result_dict["component_code"]
            
        # 🧪 [Skills Manager] Executing Post-Hooks (Validation after generation)
        if expert_adapter and 'skills_mgr' in locals() and expert_adapter in skills_mgr.skills:
            try:
                skills_mgr.run_post_hooks(expert_adapter, result_dict.get("code", ""), registry=locals().get('registry'))
            except Exception as e:
                logger.warning(f"⚠️ [GeminiCore] Error calling Post-Hooks for skill {expert_adapter}: {e}")
                
        return result_dict
