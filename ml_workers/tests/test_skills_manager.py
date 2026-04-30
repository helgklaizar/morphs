import os
import pytest
from core.skills_manager import SkillsManager
from core.tools.frontmatter_parser import FrontmatterContext

def test_skills_manager_discovery(tmp_path):
    skills_dir = tmp_path / "skills"
    os.makedirs(skills_dir)
    skill_file = skills_dir / "test_skill.md"
    skill_file.write_text("""---
name: "TestSkill"
description: "A test skill"
hooks:
  pre: ["test_pre_hook"]
---
Body content""", encoding="utf-8")
    
    manager = SkillsManager(skills_dir=str(skills_dir))
    manager.discover_skills()
    
    assert "TestSkill" in manager.skills
    skill_content = manager.get_skill("TestSkill")
    assert "Body content" in skill_content

def test_hooks_execution(tmp_path):
    skills_dir = tmp_path / "skills"
    os.makedirs(skills_dir)
    
    manager = SkillsManager(skills_dir=str(skills_dir))
    ctx = FrontmatterContext(
        metadata={"name": "TestSkill", "hooks": {"pre": ["test_hook"], "post": []}},
        content="body",
        pre_hooks=["test_hook"],
        post_hooks=[],
        stop_hooks=[]
    )
    manager.skills["TestSkill"] = ctx
    
    # Just checking the methods don't crash
    manager.run_pre_hooks("TestSkill", {})
    manager.run_post_hooks("TestSkill", {})
