import ast
from core.logger import logger

class CodeSmellMorph:
    """
    Item 4: Code-Smell Analyzer (Technical Debt Metrics)
    Measures the Cyclomatic Complexity (McCabe Complexity) of new functions.
    If the AI writes a monster with 15 if/else statements, the transaction is rolled back.
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
        Parses the AST and calculates the complexity for each function/class.
        Returns: {"is_clean": bool, "violators": [details...]}
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
                logger.info(f"🛑 [CodeSmell-Morph] Technical Debt detected! {len(violators)} functions exceed the complexity limit of {self.max_complexity}.")
            else:
                logger.info(f"✅ [CodeSmell-Morph] The code is clean. Cyclomatic complexity is within the normal range (up to {self.max_complexity}).")
                
            return {
                "is_clean": is_clean,
                "violators": violators
            }
            
        except SyntaxError as e:
            # If the syntax is broken, we cannot measure the complexity.
            # Leaving this for the Healer-Morph.
            return {"is_clean": False, "violators": [{"type": "syntax_error", "name": "SyntaxError", "complexity": 999, "line": getattr(e, "lineno", 0)}]}
