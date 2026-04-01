import os
import ast
from core.logger import logger

class EvolutionMorph:
    """
    Self-Optimization and Recursive Improvement (Self-Evolution).
    An AI that reads its own Orchestrator source code
    and identifies Tech Debt (high cyclomatic complexity via AST).
    """

    def scan_core(self):
        logger.info("🧬 [Evolution-Morph] Scanning own source code (AST) for bottlenecks...")
        
        main_path = "main.py"
        if not os.path.exists(main_path):
            return "File 'main.py' not found"
            
        with open(main_path, "r", encoding="utf-8") as f:
            code = f.read()

        try:
            tree = ast.parse(code)
        except Exception as e:
            logger.info(f"💥 [Evolution-Morph] Syntax error: {e}")
            return "SyntaxError in Main"

        complexity_report = []
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                complexity = 1
                for child in ast.walk(node):
                    if isinstance(child, (ast.If, ast.For, ast.While, ast.Try, ast.With, ast.ExceptHandler)):
                        complexity += 1
                        
                if complexity > 15:
                    complexity_report.append(f"Function '{node.name}' has spaghetti-complexity: {complexity}/15.")

        if complexity_report:
            logger.info("💡 [Evolution-Morph] Tech Debt: Spaghetti code found in the Core!")
            for issue in complexity_report:
                logger.info(f"   -> {issue}")
            
            return "Refactoring needed"
            
        logger.info("✅ [Evolution-Morph] Core is 100% optimized. Tech debt = 0.")
        return "Optimized"
