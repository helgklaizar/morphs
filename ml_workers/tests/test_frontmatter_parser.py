import pytest
from core.tools.frontmatter_parser import FrontmatterParser

def test_parse_valid_frontmatter():
    content = """---
name: "TestSkill"
description: "A test skill"
hooks:
  pre: "validate_ast"
  post: "notify_slack"
---
# Content here
This is a test skill.
"""
    context = FrontmatterParser.parse_string(content)
    
    assert context.metadata["name"] == "TestSkill"
    assert context.metadata["description"] == "A test skill"
    assert "validate_ast" in context.pre_hooks
    assert "notify_slack" in context.post_hooks
    
    assert "Content here" in context.content
    assert "This is a test skill." in context.content

def test_parse_no_frontmatter():
    content = "Just some ordinary text"
    context = FrontmatterParser.parse_string(content)
    
    assert context.metadata == {}
    assert context.content.strip() == "Just some ordinary text"

def test_parse_empty_frontmatter():
    content = "---\n\n---\nBody"
    context = FrontmatterParser.parse_string(content)
    
    assert context.metadata == {}
    assert context.content.strip() == "Body"

def test_parse_invalid_yaml():
    content = "---\n[Invalid YAML\n---\nBody text"
    context = FrontmatterParser.parse_string(content)
    
    assert context.metadata == {}
    assert "Body text" in context.content
