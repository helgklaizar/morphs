import os
import glob
from core.logger import logger
from core.tools.frontmatter_parser import FrontmatterParser, FrontmatterContext

class SkillsManager:
    """
    Manages Anthropic-like agent skills loaded from markdown files.
    Extracts declarative Pre/Post/Stop hooks (Task 14) and instructions.
    """
    def __init__(self, skills_dir: str = "skills"):
        self.skills_dir = skills_dir
        self.skills: dict[str, FrontmatterContext] = {}
        
    def discover_skills(self):
        """Scans the skills directory and parses all skill files."""
        if not os.path.exists(self.skills_dir):
            logger.info(f"📂 [Skills Manager] Skills directory '{self.skills_dir}' not found.")
            return

        pattern = os.path.join(self.skills_dir, "**", "SKILL.md")
        files = glob.glob(pattern, recursive=True)
        # Also let's check basic .md files directly in the directory
        files.extend(glob.glob(os.path.join(self.skills_dir, "*.md")))

        count = 0
        for md_file in set(files): # unique
            context = FrontmatterParser.parse_file(md_file)
            if context:
                # Resolve skill name from metadata or filename
                skill_name = context.metadata.get("name", os.path.basename(md_file).replace(".md", ""))
                self.skills[skill_name] = context
                count += 1
                
        logger.info(f"🧠 [Skills Manager] Discovered {count} skills with Frontmatter hooks.")

    def get_skill(self, name: str) -> str:
        """Returns the prompt instruction part of the skill."""
        if name in self.skills:
            return self.skills[name].content
        return ""

    def run_pre_hooks(self, skill_name: str, args: dict, registry=None):
        """Executes declared pre-hooks before the skill is utilized."""
        skill = self.skills.get(skill_name)
        if not skill or not skill.pre_hooks:
            return
        
        for hook in skill.pre_hooks:
            logger.info(f"⚡ [Hook: PRE] Executing `{hook}` for skill '{skill_name}'...")
            if registry and hook in registry.registry:
                func = registry.registry[hook].get("func")
                if callable(func):
                    try:
                        res = func(**args)
                        logger.info(f"✅ [Hook: PRE] {hook} result: {str(res)[:100]}")
                    except Exception as e:
                        logger.error(f"❌ [Hook: PRE] {hook} failed: {e}")
            else:
                logger.warning(f"⚠️ [Hook: PRE] Hook '{hook}' not found in Tool Registry or not callable.")

    def run_post_hooks(self, skill_name: str, result: any, registry=None):
        """Executes declared post-hooks to validate output."""
        skill = self.skills.get(skill_name)
        if not skill or not skill.post_hooks:
            return
        
        for hook in skill.post_hooks:
            logger.info(f"⚡ [Hook: POST] Validating result with `{hook}` for skill '{skill_name}'...")
            if registry and hook in registry.registry:
                func = registry.registry[hook].get("func")
                if callable(func):
                    try:
                        valid = func(result=result)
                        logger.info(f"✅ [Hook: POST] {hook} check passed: {valid}")
                    except Exception as e:
                        logger.error(f"❌ [Hook: POST] {hook} check failed: {e}")
            else:
                logger.warning(f"⚠️ [Hook: POST] Hook '{hook}' not found in Tool Registry.")

    def get_available_skills(self) -> list:
        return list(self.skills.keys())
