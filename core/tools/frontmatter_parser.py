import os
import yaml
import re
from dataclasses import dataclass
from typing import Dict, Any, Optional

@dataclass
class FrontmatterContext:
    metadata: Dict[str, Any]
    content: str
    pre_hooks: list = None
    post_hooks: list = None
    stop_hooks: list = None

class FrontmatterParser:
    """
    Parses YAML frontmatter (---) from markdown files to extract skills/plugins metadata
    and declarative Pre/Post/Stop hooks (Task 14).
    """
    FRONTMATTER_REGEX = re.compile(r"^\s*---\s*\n(.*?)\n---\s*\n(.*)", re.DOTALL)

    @staticmethod
    def parse_file(filepath: str) -> Optional[FrontmatterContext]:
        if not os.path.exists(filepath):
            return None
            
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                text = f.read()
                
            return FrontmatterParser.parse_string(text)
        except Exception as e:
            from core.logger import logger
            logger.error(f"Failed to parse frontmatter from {filepath}: {e}")
            return None

    @staticmethod
    def parse_string(text: str) -> FrontmatterContext:
        match = FrontmatterParser.FRONTMATTER_REGEX.match(text)
        if not match:
            return FrontmatterContext(metadata={}, content=text)
            
        yaml_content = match.group(1)
        md_content = match.group(2)
        
        try:
            metadata = yaml.safe_load(yaml_content) or {}
        except yaml.YAMLError as e:
            from core.logger import logger
            logger.error(f"YAML Parse Error: {e}")
            metadata = {}
            
        # Parse hooks declarative keys
        hooks = metadata.get("hooks", {})
        pre_hooks = hooks.get("pre", [])
        post_hooks = hooks.get("post", [])
        stop_hooks = hooks.get("stop", [])
        
        return FrontmatterContext(
            metadata=metadata,
            content=md_content,
            pre_hooks=pre_hooks if isinstance(pre_hooks, list) else [pre_hooks],
            post_hooks=post_hooks if isinstance(post_hooks, list) else [post_hooks],
            stop_hooks=stop_hooks if isinstance(stop_hooks, list) else [stop_hooks]
        )
