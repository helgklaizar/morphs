import os
import ast
from core.logger import logger

class EvolutionMorph:
    """
    Самооптимизация и Рекурсивное улучшение (Self-Evolution).
    ИИ, который читает собственный исходный код Orchestrator-а 
    и выявляет Tech Debt (высокую цикломатическую сложность через AST).
    """

    def scan_core(self):
        logger.info("🧬 [Evolution-Morph] Сканирую собственный исходный код (AST) на наличие узких мест...")
        
        main_path = "main.py"
        if not os.path.exists(main_path):
            return "File 'main.py' not found"
            
        with open(main_path, "r", encoding="utf-8") as f:
            code = f.read()

        try:
            tree = ast.parse(code)
        except Exception as e:
            logger.info(f"💥 [Evolution-Morph] Синтаксическая ошибка: {e}")
            return "SyntaxError in Main"

        complexity_report = []
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                complexity = 1
                for child in ast.walk(node):
                    if isinstance(child, (ast.If, ast.For, ast.While, ast.Try, ast.With, ast.ExceptHandler)):
                        complexity += 1
                        
                if complexity > 15:
                    complexity_report.append(f"Функция '{node.name}' имеет спагетти-сложность: {complexity}/15.")

        if complexity_report:
            logger.info("💡 [Evolution-Morph] Tech Debt: Найден спагетти-код в Ядре!")
            for issue in complexity_report:
                logger.info(f"   -> {issue}")
            
            return "Refactoring needed"
            
        logger.info("✅ [Evolution-Morph] Ядро оптимизировано на 100%. Tech debt = 0.")
        return "Optimized"
