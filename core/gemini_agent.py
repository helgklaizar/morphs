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

# Регистрация хука для подсчета токенов в фоне
PostSamplingHooks.register(
    lambda model_name, in_toks, out_toks: global_cost_manager.add_usage(model_name, in_toks, out_toks)
)

class GeminiCore:
    """
    «Тяжелая Артиллерия» ИИ.
    Используется для архитектурных решений, где нужна логика Gemini 3.1 Pro / 2.5 Pro 
    с контекстом 2M+ токенов, вместо локальных 8B параметров Llama-3.
    Имеет ТОЧНО ТАКОЙ ЖЕ интерфейс `think` и `think_structured`, как локальный CoreMind (Drop-in Replacement).
    """

    def __init__(self, model_name="gemini-2.5-pro", api_key=None):
        logger.info(f"☁️ [GeminiCore] Подключение к облаку Google Model: {model_name}...")
        self.model_name = model_name
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY")
        if not self.api_key:
            logger.info("⚠️ [GeminiCore] Внимание: GEMINI_API_KEY не установлен. Вызовы API упадут!")
        
        self.client = genai.Client(api_key=self.api_key)
        logger.info("✅ [GeminiCore] Подключение успешно.")

    def think(
        self,
        prompt: str,
        max_tokens: int = 8192,
        temperature: float = 0.5,
        agent_role: str = "",
        tool_output: str = "",
    ) -> str:
        """
        Стандартная генерация.

        Args:
            agent_role:   Роль агента для prompt hierarchy (слой 'agent').
            tool_output:  Вывод инструмента — будет обогащён system-reminder тегами
                          и инжектирован в начало промпта.
        """
        logger.info("⚡️ [GeminiCore] Мышление (Standard)...")
        from core.memory_morph import MemoryMorph

        # ── [Prompt Hierarchy] Сборка системного промпта ──────────────────
        built = build_agent_prompt(
            agent_role=agent_role or "Ты — Enterprise CoreMind. Действуй строго как крутой Senior разработчик.",
        )
        system_instruction = built.static_system

        # ── [SystemReminder] Инжектируем поведенческие теги в tool output ──
        enriched_tool = ""
        if tool_output:
            enriched_tool = inject_reminders(tool_output, source="tool_output", extra_context=prompt)

        # Финальный промпт: dynamic_prefix + tool output + задача
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
                    logger.warning(f"🔄 [ContextLengthExceeded] Экстренный перехват ошибки: {e}. Принудительное сжатие контекста...")
                    new_prompt = MemoryMorph.microcompact(final_prompt, max_chars=len(final_prompt) // 2)
                    if len(new_prompt) >= len(final_prompt):
                        logger.error("❌ Контекст не удалось сжать!")
                        raise e
                    final_prompt = new_prompt
                    continue
                logger.error(f"❌ [GeminiCore] Ошибка генерации: {e}")
                return "Error"
        
        # 💵 Трекинг токенов (Post-sampling Hook)
        try:
            if hasattr(response, "usage_metadata") and response.usage_metadata:
                in_toks = response.usage_metadata.prompt_token_count
                out_toks = response.usage_metadata.candidates_token_count
                PostSamplingHooks.execute(model_name=self.model_name, in_toks=in_toks, out_toks=out_toks)
        except Exception as e:
            logger.info(f"⚠️ [PostHook] Не удалось извлечь токены: {e}")

        try:
            raw = response.text or ""
            # Удаляем system-reminder теги из ответа перед возвратом пользователю
            return strip_reminders(raw)
        except Exception as e:
            logger.error(f"❌ [GeminiCore] Ошибка извлечения текста из API: {e}. Response: {response}")
            return "Error"

    def think_structured(self, prompt: str, schema_description: str, max_tokens: int = 8192, expert_adapter: str = None, temperature: float = 0.5) -> dict:
        """
        Форсированная генерация Graph of Thoughts и КОДА через XML теги.
        """
        skill_instruction = ""
        if expert_adapter:
            logger.info(f"🔥 [GeminiCore] Настройка системного промпта для специализации: [{expert_adapter.upper()}]")
            
            # 🧪 [Skills Manager] Загружаем Markdown-компетенции и Хуки (Task 14)
            from core.skills_manager import SkillsManager
            from core.tool_registry_morph import ToolRegistryMorph
            
            skills_mgr = SkillsManager()
            skills_mgr.discover_skills()
            
            if expert_adapter in skills_mgr.skills:
                logger.info(f"📖 [GeminiCore] Подгружен скилл '{expert_adapter}' со встроенными хуками!")
                skill_instruction = "\n🎯 ИНСТРУКЦИЯ СКИЛЛА (SKILL.md):\n" + skills_mgr.get_skill(expert_adapter) + "\n\n"
                
                # Запускаем pre_hooks, интегрируясь с реестром тулзов
                try:
                    registry = ToolRegistryMorph()
                    skills_mgr.run_pre_hooks(expert_adapter, {}, registry=registry)
                except Exception as e:
                    logger.warning(f"⚠️ [GeminiCore] Ошибка при вызове Pre-Hooks скилла {expert_adapter}: {e}")
            
        # 🧬 [Atropos RL] Загружаем память ошибок проектов (LanceDB Vector DB), чтобы Gemini их не повторяла
        rl_experience = "Нет прошлых ошибок."
        try:
            from core.atropos_memory import AtroposMemory
            memory_db = AtroposMemory()
            experience = memory_db.get_relevant_experience(expert_adapter or "General", limit=10)
            if experience:
                rl_experience = experience
        except Exception as e:
            logger.info(f"⚠️ [GeminiCore] AtroposMemory warning: {e}")

        # ── [Prompt Hierarchy] Многослойная сборка O1-промпта ─────────────
        agent_role_str = (
            "Ты — Enterprise CoreMind (Gemini Edition). "
            "Твой процесс мышления должен состоять из 'Дерева Рассуждений' перед написанием кода!\n"
            "ОБЯЗАТЕЛЬНО используй формат XML-тегов для ответа. Никакого текста вне тегов.\n"
            f"ФОРМАТ ОТВЕТА:\n{schema_description}"
        )
        built = build_agent_prompt(
            agent_role=agent_role_str,
            skill_content=skill_instruction or None,
            rl_experience=rl_experience if rl_experience != "Нет прошлых ошибок." else None,
        )
        system_instruction = built.static_system
        # dynamic_prefix (agent role + skill + RL) идёт в начало user-промпта
        dynamic_prefix = built.dynamic_prefix
        
        logger.info("⚡️ [GeminiCore] Мышление O1-Mode (XML Graph of Thoughts)...")
        
        from core.memory_morph import MemoryMorph

        # Собираем финальный промпт: dynamic layers + user task
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
                    logger.warning(f"🔄 [ContextLengthExceeded] Экстренный перехват ошибки: {e}. Принудительное сжатие контекста...")
                    new_prompt = MemoryMorph.microcompact(final_prompt, max_chars=len(final_prompt) // 2)
                    if len(new_prompt) >= len(final_prompt):
                        logger.error("❌ [ContextLengthExceeded] Контекст не удалось сжать!")
                        raise e
                    final_prompt = new_prompt
                    continue
                logger.error(f"❌ [GeminiCore] Ошибка генерации O1: {e}")
                response = None
                break
        
        if not response:
            return {"thought": "Error", "code": "Error generated", "component_code": "Error generated"}

        # 💵 Трекинг токенов (Post-sampling Hook)
        try:
            if hasattr(response, "usage_metadata") and response.usage_metadata:
                in_toks = response.usage_metadata.prompt_token_count
                out_toks = response.usage_metadata.candidates_token_count
                PostSamplingHooks.execute(model_name=self.model_name, in_toks=in_toks, out_toks=out_toks)
        except Exception as e:
            logger.info(f"⚠️ [PostHook] Не удалось извлечь токены: {e}")
        
        try:
            raw_output = response.text or ""
            if not raw_output:
                logger.error(f"❌ [GeminiCore] Пустой ответ от API! Response Data: {response}")
                raw_output = "<thought>Error</thought><code>Error generated</code>"
        except Exception as e:
            logger.error(f"❌ [GeminiCore] Ошибка извлечения текста из API: {e}. Response: {response}")
            raw_output = "<thought>Error</thought><code>Error generated</code>"
            
        # Парсер 1-в-1 как в mlx_agent.py, чтобы остальной код программы не пришлось менять
        tags = re.findall(r'<([a-zA-Z0-9_]+)>(.*?)</\1>', raw_output, re.DOTALL)
        result_dict = {tag: content.replace("```python", "").replace("```tsx", "").replace("```", "").strip() for tag, content in tags}
            
        if "thought" not in result_dict:
            thought_match = re.search(r'<thought>(.*?)</thought>', raw_output, re.DOTALL)
            result_dict["thought"] = thought_match.group(1).strip() if thought_match else "Нет мыслей"
            
        if "code" not in result_dict and "component_code" not in result_dict:
            fallback = re.split(r'</thought>', raw_output)[-1]
            clean = fallback.replace("```python", "").replace("```tsx", "").replace("```", "").replace("<code>", "").replace("<component_code>", "").strip()
            result_dict["code"] = clean
            result_dict["component_code"] = clean
            
        if "code" in result_dict and "component_code" not in result_dict:
            result_dict["component_code"] = result_dict["code"]
        if "component_code" in result_dict and "code" not in result_dict:
            result_dict["code"] = result_dict["component_code"]
            
        # 🧪 [Skills Manager] Исполняем Post-Hooks (Валидация после генерации)
        if expert_adapter and 'skills_mgr' in locals() and expert_adapter in skills_mgr.skills:
            try:
                skills_mgr.run_post_hooks(expert_adapter, result_dict.get("code", ""), registry=locals().get('registry'))
            except Exception as e:
                logger.warning(f"⚠️ [GeminiCore] Ошибка при вызове Post-Hooks скилла {expert_adapter}: {e}")
                
        return result_dict
