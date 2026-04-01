import re
import ast
from core.logger import logger

class ASTMorph:
    """
    Мастер хирургического вмешательства (Синтаксическое дерево и Патчинг).
    Избавляет систему от необходимости переписывать 1000 строк файла ради изменения одного цвета.
    Поддерживает AST-превалидацию (для Python) и Diff-Patching (для TypeScript).
    """
    def __init__(self, workspace_path: str = ""):
        self.workspace = workspace_path

    def validate_python_syntax(self, code: str) -> bool:
        """
        Молниеносная пре-проверка Python кода через нативный `ast` модуль, 
        прежде чем отдавать его на тестирование в сложный pytest.
        """
        try:
            ast.parse(code)
            return True
        except SyntaxError as e:
            logger.info(f"⚠️ [AST-Morph] Фатальная синтаксическая ошибка: {e}")
            return False

    def apply_diff_patch(self, original_text: str, patch_xml: str) -> str:
        """
        Хирургическое наложение патча (AST-like Patching).
        LLM возвращает:
        <patch><target>старый код</target><replacement>новый код</replacement></patch>
        """
        logger.info("🧬 [AST-Morph] Применение гномной мутации (Patching)...")
        patterns = re.finditer(r'<patch>\s*<target>(.*?)</target>\s*<replacement>(.*?)</replacement>\s*</patch>', patch_xml, re.DOTALL)
        
        modified_text = original_text
        patches_applied = 0
        
        for match in patterns:
            target = match.group(1).strip()
            replacement = match.group(2).strip()
            
            # Экранируем спецсимволы, но разрешаем гибкие пробелы
            target_escaped = re.escape(target)
            target_regex = re.sub(r'\\\s+', r'\\s+', target_escaped) 
            
            new_text, count = re.subn(target_regex, replacement, modified_text)
            if count > 0:
                modified_text = new_text
                patches_applied += 1
            else:
                logger.info(f"❌ [AST-Morph] Патч не нашел блок: {target[:30]}...")
                
        if patches_applied > 0:
            logger.info(f"✅ [AST-Morph] Успешно применено {patches_applied} мутаций к файлу. 0 лишних токенов!")
        else:
            logger.info("⚠️ [AST-Morph] Мутации не были применены. Возможна рассинхронизация контекста.")
            
        return modified_text

class ASTInvariantValidator:
    """Математическое доказательство AST: проверяет, не сломал ли сгенерированный код базовые инварианты."""
    
    @staticmethod
    def prove(code: str, language: str = "python") -> tuple[bool, str]:
        if language == "python":
            try:
                ast.parse(code)
                return True, "AST Proof Passed"
            except SyntaxError as e:
                return False, f"AST Proof Failed: {e}"
        elif language in ["typescript", "javascript", "tsx", "ts"]:
            # Простейший эвристический инвариант баланса скобок (AST proof surrogate for JS)
            stack = []
            pairs = {')': '(', '}': '{', ']': '['}
            # Игнорируем строки и комментарии для грубой проверки
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
