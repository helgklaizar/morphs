"""
Тесты для Prompt Engineering & Hierarchy Engine.
Покрывают: PromptHierarchy, SystemReminder, base_contracts.yaml.
"""
import pytest
from core.prompt_hierarchy import (
    PromptHierarchy,
    build_agent_prompt,
    KV_CACHE_BOUNDARY,
    _BUILTIN_CONTRACTS,
)
from core.system_reminder import (
    SystemReminder,
    inject_reminders,
    strip_reminders,
)


# ===========================================================================
# PromptHierarchy Tests
# ===========================================================================

class TestPromptHierarchy:

    def test_kv_cache_boundary_present(self):
        """Маркер KV Cache Boundary ВСЕГДА присутствует в full_system."""
        built = PromptHierarchy().build()
        assert KV_CACHE_BOUNDARY in built.full_system

    def test_static_contains_contracts(self):
        """Статический слой содержит жёсткие контракты."""
        built = PromptHierarchy().build()
        assert "CONTRACT-01" in built.static_system
        assert "CONTRACT-02" in built.static_system
        assert "CONTRACT-03" in built.static_system
        assert "CONTRACT-04" in built.static_system
        assert "CONTRACT-05" in built.static_system

    def test_layer_priority_override_first(self):
        """override слой идёт первым в static_system."""
        h = PromptHierarchy()
        h.set_layer("override", "CRITICAL OVERRIDE RULE")
        h.set_layer("default", "Default style")
        built = h.build()
        idx_override = built.static_system.index("CRITICAL OVERRIDE RULE")
        idx_default = built.static_system.index("Default style")
        assert idx_override < idx_default

    def test_agent_layer_in_dynamic(self):
        """agent слой попадает в dynamic_prefix, не в static_system."""
        h = PromptHierarchy()
        h.set_layer("agent", "I AM THE API MORPH")
        built = h.build()
        assert "I AM THE API MORPH" in built.dynamic_prefix
        assert "I AM THE API MORPH" not in built.static_system

    def test_custom_skill_in_dynamic(self):
        """custom/skill слой попадает в dynamic_prefix."""
        h = PromptHierarchy()
        h.set_layer("custom", "# SKILL: Python Expert")
        built = h.build()
        assert "SKILL: Python Expert" in built.dynamic_prefix

    def test_coordinator_in_static(self):
        """coordinator слой всегда статический."""
        h = PromptHierarchy()
        h.set_layer("coordinator", "Swarm P2P rules")
        built = h.build()
        assert "Swarm P2P rules" in built.static_system

    def test_build_agent_prompt_with_skill_and_rl(self):
        """build_agent_prompt корректно распределяет слои."""
        built = build_agent_prompt(
            agent_role="Ты API Morph",
            skill_content="# FastAPI Expert",
            coordinator_rules="EventBus только через Redis",
            rl_experience="Урок: не используй синхронный Playwright в async коде",
        )
        assert "CONTRACT-01" in built.static_system        # контракты в static
        assert "EventBus" in built.static_system            # coordinator в static
        assert "API Morph" in built.dynamic_prefix          # agent в dynamic
        assert "FastAPI Expert" in built.dynamic_prefix     # skill в dynamic
        assert "Playwright" in built.dynamic_prefix         # RL в dynamic
        assert KV_CACHE_BOUNDARY in built.full_system

    def test_build_without_optional_params(self):
        """build_agent_prompt работает без опциональных параметров."""
        built = build_agent_prompt(agent_role="Simple Agent")
        assert built.static_system
        assert KV_CACHE_BOUNDARY in built.full_system

    def test_rl_none_not_injected(self):
        """Если RL experience по умолчанию ('нет ошибок') — не инжектируется."""
        built = build_agent_prompt(
            agent_role="Agent",
            rl_experience=None,
        )
        assert "ATROPOS RL EXPERIENCE" not in built.dynamic_prefix

    def test_rl_injected_when_provided(self):
        """Реальный RL опыт инжектируется в dynamic."""
        built = build_agent_prompt(
            agent_role="Agent",
            rl_experience="Урок 1: не использовать global state",
        )
        assert "ATROPOS RL EXPERIENCE" in built.dynamic_prefix
        assert "global state" in built.dynamic_prefix


# ===========================================================================
# SystemReminder Tests
# ===========================================================================

class TestSystemReminder:

    def test_sql_triggers_owasp_reminder(self):
        """SQL ключевые слова триггерят OWASP SQLi напоминание."""
        output = "SELECT * FROM users WHERE id = " + "'" + "user_input" + "'"
        enriched = inject_reminders(output, source="test")
        assert "<system-reminder" in enriched
        assert "owasp_sql" in enriched or "SQLi" in enriched or "CONTRACT-04" in enriched

    def test_try_except_triggers_no_silent_except(self):
        """try/except в коде триггерит CONTRACT-03 напоминание."""
        output = "try:\n    do_something()\nexcept Exception:\n    pass"
        enriched = inject_reminders(output, source="test")
        assert "CONTRACT-03" in enriched or "no_silent_except" in enriched

    def test_delete_triggers_reversibility(self):
        """delete/drop триггерят Reversibility CONTRACT-05."""
        output = "DROP TABLE users;"
        enriched = inject_reminders(output, source="test")
        assert "CONTRACT-05" in enriched or "REMOTE_DESTRUCTIVE" in enriched

    def test_html_triggers_xss_reminder(self):
        """HTML/JSX триггерит XSS напоминание."""
        output = "<div dangerouslySetInnerHTML={{__html: userInput}} />"
        enriched = inject_reminders(output, source="test")
        assert "XSS" in enriched or "owasp_xss" in enriched

    def test_strip_reminders_removes_tags(self):
        """strip_reminders удаляет все system-reminder теги из текста."""
        output = 'Result: done\n\n<system-reminder id="test">Some directive</system-reminder>'
        cleaned = strip_reminders(output)
        assert "<system-reminder" not in cleaned
        assert "Result: done" in cleaned

    def test_strip_reminders_multiple_tags(self):
        """strip_reminders удаляет несколько тегов."""
        output = (
            "code here\n\n"
            '<system-reminder id="a">Reminder A</system-reminder>\n'
            '<system-reminder id="b">Reminder B</system-reminder>'
        )
        cleaned = strip_reminders(output)
        assert "Reminder A" not in cleaned
        assert "Reminder B" not in cleaned
        assert "code here" in cleaned

    def test_empty_output_returns_unchanged(self):
        """Пустой вывод возвращается без изменений."""
        reminder = SystemReminder()
        assert reminder.inject("") == ""

    def test_disabled_reminder_returns_unchanged(self):
        """При enabled=False ничего не инжектируется."""
        reminder = SystemReminder(enabled=False)
        output = "SELECT * FROM users"
        assert reminder.inject(output) == output

    def test_max_reminders_limit(self):
        """Не более max_reminders тегов инжектируется."""
        reminder = SystemReminder(max_reminders=1)
        output = "SELECT * FROM users WHERE id=? DELETE FROM table DROP TABLE; try: except: pass"
        enriched = reminder.inject(output)
        count = enriched.count("<system-reminder")
        assert count <= 1

    def test_inject_manual_specific_ids(self):
        """inject_manual инжектирует конкретные напоминания по ID."""
        reminder = SystemReminder()
        output = "some output"
        enriched = reminder.inject_manual(output, reminder_ids=["no_new_files", "owasp_sql"])
        assert 'id="no_new_files"' in enriched
        assert 'id="owasp_sql"' in enriched

    def test_inject_manual_unknown_id_logs_warning(self):
        """inject_manual для неизвестного ID не падает, но ничего не добавляет."""
        reminder = SystemReminder()
        output = "some output"
        enriched = reminder.inject_manual(output, reminder_ids=["nonexistent_id"])
        assert enriched == output  # ничего не добавлено


# ===========================================================================
# Contract Content Tests (Anti-Speculation, File-Bloat, etc.)
# ===========================================================================

class TestBuiltinContracts:

    def test_anti_speculation_contract_present(self):
        assert "CONTRACT-01" in _BUILTIN_CONTRACTS
        assert "Anti-Speculation" in _BUILTIN_CONTRACTS or "про запас" in _BUILTIN_CONTRACTS

    def test_file_economy_contract_present(self):
        assert "CONTRACT-02" in _BUILTIN_CONTRACTS
        assert "File-Economy" in _BUILTIN_CONTRACTS or "новый файл" in _BUILTIN_CONTRACTS

    def test_no_silent_except_contract_present(self):
        assert "CONTRACT-03" in _BUILTIN_CONTRACTS
        assert "try/except" in _BUILTIN_CONTRACTS or "Silent" in _BUILTIN_CONTRACTS

    def test_owasp_contract_present(self):
        assert "CONTRACT-04" in _BUILTIN_CONTRACTS
        assert "OWASP" in _BUILTIN_CONTRACTS
        assert "SQLi" in _BUILTIN_CONTRACTS or "SQL Injection" in _BUILTIN_CONTRACTS
        assert "XSS" in _BUILTIN_CONTRACTS

    def test_reversibility_contract_present(self):
        assert "CONTRACT-05" in _BUILTIN_CONTRACTS
        assert "REMOTE_DESTRUCTIVE" in _BUILTIN_CONTRACTS
        assert "LOCAL_REVERSIBLE" in _BUILTIN_CONTRACTS

    def test_injection_guard_contract_present(self):
        assert "CONTRACT-06" in _BUILTIN_CONTRACTS
        assert "InjectionGuard" in _BUILTIN_CONTRACTS

    def test_system_reminder_contract_present(self):
        assert "CONTRACT-07" in _BUILTIN_CONTRACTS
        assert "system-reminder" in _BUILTIN_CONTRACTS
