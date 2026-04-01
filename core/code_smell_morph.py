import ast
from core.logger import logger

class CodeSmellMorph:
    """
    Пункт 4: Code-Smell Analyzer (Метрики ТехДолга)
    Измеряет Цикломатическую сложность (McCabe Complexity) новых функций.
    Если ИИ написал монстра на 15 if/else — транзакция откатывается.
    """
    def __init__(self, max_complexity: int = 15):
        self.max_complexity = max_complexity

    def _calculate_complexity(self, node) -> int:
        complexity = 1
        for child in ast.walk(node):
            if isinstance(child, (ast.If, ast.While, ast.For, ast.ExceptHandler, 
                                  ast.AsyncFor, ast.AsyncWith, ast.AsyncFunctionDef,
                                  ast.BoolOp)):
                if isinstance(child, ast.BoolOp):
                    complexity += len(child.values) - 1
                else:
                    complexity += 1
        return complexity

    def analyze_python_code(self, code: str) -> dict:
        """
        Парсит AST и рассчитывает сложность для каждой функции/класса.
        Возвращает: {"is_clean": bool, "violators": [details...]}
        """
        violators = []
        try:
            tree = ast.parse(code)
            
            for node in ast.walk(tree):
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    c = self._calculate_complexity(node)
                    if c > self.max_complexity:
                        violators.append({
                            "type": "function",
                            "name": node.name,
                            "complexity": c,
                            "line": node.lineno
                        })
            
            is_clean = len(violators) == 0
            
            if not is_clean:
                logger.info(f"🛑 [CodeSmell-Morph] Обнаружен ТехДолг! {len(violators)} функций превышают лимит сложности {self.max_complexity}.")
            else:
                logger.info(f"✅ [CodeSmell-Morph] Код чистый. Цикломатическая сложность в норме (до {self.max_complexity}).")
                
            return {
                "is_clean": is_clean,
                "violators": violators
            }
            
        except SyntaxError as e:
            # Если синтаксис битый, мы не можем измерить сложность.
            # Оставляем это Healer-Morph'у
            return {"is_clean": False, "violators": [{"type": "syntax_error", "name": "SyntaxError", "complexity": 999, "line": getattr(e, "lineno", 0)}]}
