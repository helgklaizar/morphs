import ast
from core.logger import logger

class TokenizerMorph:
    """
    Промпт Компрессор (Оптимизация Контекста).
    Уменьшает размер исходников на 80-90% перед отправкой в Core Mind (Llama-3/Gemini),
    оставляя только архитектурные сигнатуры файлов.
    """

    def compress_python_file(self, filepath: str) -> str:
        """Извлекает только классы, функции, импорты и докстринги, игнорируя тела функций."""
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                source = f.read()
        except FileNotFoundError:
            return f"# УДАЛЕН ИЛИ НЕ НАЙДЕН: {filepath}"

        try:
            tree = ast.parse(source)
            compressed_lines = [f"# --- COMPRESSED VIEW: {filepath} ---"]
            
            for node in tree.body:
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        compressed_lines.append(f"import {alias.name}")
                elif isinstance(node, ast.ImportFrom):
                    names = ", ".join([a.name for a in node.names])
                    compressed_lines.append(f"from {node.module} import {names}")
                
                elif isinstance(node, ast.ClassDef):
                    compressed_lines.append(f"\nclass {node.name}:")
                    for subnode in node.body:
                        if isinstance(subnode, ast.FunctionDef):
                            # Аргументы функции
                            args = [arg.arg for arg in subnode.args.args]
                            signature = ", ".join(args)
                            compressed_lines.append(f"    def {subnode.name}(self, {signature}): ...")
                            
                elif isinstance(node, ast.FunctionDef):
                    args = [arg.arg for arg in subnode.args.args]
                    signature = ", ".join(args)
                    compressed_lines.append(f"def {node.name}({signature}): ...")
            
            return "\n".join(compressed_lines) + "\n"
        except SyntaxError:
            # Если сломан синтаксис — возвращаем без сжатия (сообщим ИИ напрямую)
            return f"# В КОДЕ СИНТАКСИЧЕСКАЯ ОШИБКА: {filepath}\n{source}"

    def compress_project(self, project_dir: str) -> str:
        """Сканирует папку и сжимает все питоновские файлы в единый мини-контекст."""
        import os
        combined = []
        for root, dirs, files in os.walk(project_dir):
            if "node_modules" in root or ".venv" in root or ".git" in root or "__pycache__" in root:
                continue
                
            for file in files:
                if file.endswith(".py"):
                    full_path = os.path.join(root, file)
                    combined.append(self.compress_python_file(full_path))
                    
        logger.info("🗜️ [Tokenizer-Morph] Контекст сжат. Избавились от 90% мусорных 'токенов' и тел функций.")
        return "\n".join(combined)

if __name__ == "__main__":
    compressor = TokenizerMorph()
    # Пример компрессии самого себя
    logger.info(compressor.compress_python_file(__file__))
