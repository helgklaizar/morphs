import re
import ast
from core.logger import logger

class ASTMorph:
    """
    A master of surgical intervention (Abstract Syntax Tree and Patching).
    Saves the system from having to rewrite 1000 lines of a file just to change one color.
    Supports AST pre-validation (for Python) and Diff-Patching (for TypeScript).
    """
    def __init__(self, workspace_path: str = ""):
        self.workspace = workspace_path

    def validate_python_syntax(self, code: str) -> bool:
        """
        Lightning-fast pre-check of Python code using the native `ast` module,
        before sending it for testing in a complex pytest setup.
        """
        try:
            ast.parse(code)
            return True
        except SyntaxError as e:
            logger.info(f"⚠️ [AST-Morph] Fatal syntax error: {e}")
            return False

    def apply_diff_patch(self, original_text: str, patch_xml: str) -> str:
        """
        Surgical application of a patch (AST-like Patching).
        The LLM returns:
        <patch><target>old code</target><replacement>new code</replacement></patch>
        """
        logger.info("🧬 [AST-Morph] Applying patch mutation (Patching)...")
        patterns = re.finditer(r'<patch>\s*<target>(.*?)</target>\s*<replacement>(.*?)</replacement>\s*</patch>', patch_xml, re.DOTALL)
        
        modified_text = original_text
        patches_applied = 0
        
        for match in patterns:
            target = match.group(1).strip()
            replacement = match.group(2).strip()
            
            # Escape special characters, but allow flexible whitespace
            target_escaped = re.escape(target)
            target_regex = re.sub(r'\\\s+', r'\\s+', target_escaped) 
            
            new_text, count = re.subn(target_regex, replacement, modified_text)
            if count > 0:
                modified_text = new_text
                patches_applied += 1
            else:
                logger.info(f"❌ [AST-Morph] Patch did not find the block: {target[:30]}...")
                
        if patches_applied > 0:
            logger.info(f"✅ [AST-Morph] Successfully applied {patches_applied} mutations to the file. 0 extra tokens!")
        else:
            logger.info("⚠️ [AST-Morph] Mutations were not applied. Possible context desynchronization.")
            
        return modified_text

class ASTInvariantValidator:
    """Mathematical AST proof: checks if the generated code has broken basic invariants."""
    
    @staticmethod
    def prove(code: str, language: str = "python") -> tuple[bool, str]:
        if language == "python":
            try:
                ast.parse(code)
                return True, "AST Proof Passed"
            except SyntaxError as e:
                return False, f"AST Proof Failed: {e}"
        elif language in ["typescript", "javascript", "tsx", "ts"]:
            # The simplest heuristic invariant for bracket balance (AST proof surrogate for JS)
            stack = []
            pairs = {')': '(', '}': '{', ']': '['}
            # Ignore strings and comments for a rough check
            clean_code = re.sub(r'//.*', '', code)
            clean_code = re.sub(r'/\*.*?\*/', '', clean_code, flags=re.DOTALL)
            clean_code = re.sub(r'(["\'])(?:(?=(\\?))\2.)*?\1', '', clean_code)
            
            for char in clean_code:
                if char in "({[":
                    stack.append(char)
                elif char in ")}]":
                    if not stack or stack[-1] != pairs[char]:
                        return False, f"AST Proof Failed: Unbalanced brackets at '{char}'"
                    stack.pop()
            if stack:
                return False, f"AST Proof Failed: Unclosed brackets '{stack[-1]}'"
            return True, "AST Balance Passed"
        return True, "No AST checker for this language"
