import os

files_to_test = [
    "analytics_morph", "ast_morph", "atropos_rl", "atropos_trainer", 
    "browser_morph", "data_morph", "db_morph", "dependency_morph", 
    "deploy_morph", "economy_morph", "evolution_morph", "gemini_agent", 
    "git_morph", "graph_rag", "main", "memory_morph", "security_morph", 
    "tokenizer_morph", "workspace_manager"
]

template = """import pytest
import core.{mod} as target_module

def test_{mod}_smoke():
    \"\"\"Смоук-тест на проверку импортов и синтаксиса модуля.\"\"\"
    assert target_module is not None
"""

created_count = 0
for mod in files_to_test:
    test_file = f"/Users/klai/AI/morphs/core/test_{mod}.py"
    if not os.path.exists(test_file):
        with open(test_file, "w") as f:
            f.write(template.format(mod=mod))
        created_count += 1
        print(f"Created {test_file}")

print(f"Successfully generated {created_count} smoke test units.")
