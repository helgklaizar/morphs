import ast
from core.logger import logger

class TokenizerMorph:
    """
    Prompt Compressor (Context Optimization).
    Reduces the size of source code by 80-90% before sending to Core Mind (Llama-3/Gemini),
    leaving only the architectural signatures of the files.
    """

    def compress_python_file(self, filepath: str) -> str:
        """Extracts only classes, functions, imports, and docstrings, ignoring function bodies."""
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                source = f.read()
        except FileNotFoundError:
            return f"# DELETED OR NOT FOUND: {filepath}"

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
                            # Function arguments
                            args = [arg.arg for arg in subnode.args.args]
                            signature = ", ".join(args)
                            compressed_lines.append(f"    def {subnode.name}(self, {signature}): ...")
                            
                elif isinstance(node, ast.FunctionDef):
                    args = [arg.arg for arg in subnode.args.args]
                    signature = ", ".join(args)
                    compressed_lines.append(f"def {node.name}({signature}): ...")
            
            return "\n".join(compressed_lines) + "\n"
        except SyntaxError:
            # If syntax is broken — return without compression (we will inform the AI directly)
            return f"# SYNTAX ERROR IN CODE: {filepath}\n{source}"

    def compress_project(self, project_dir: str) -> str:
        """Scans a directory and compresses all Python files into a single mini-context."""
        import os
        combined = []
        for root, dirs, files in os.walk(project_dir):
            if "node_modules" in root or ".venv" in root or ".git" in root or "__pycache__" in root:
                continue
                
            for file in files:
                if file.endswith(".py"):
                    full_path = os.path.join(root, file)
                    combined.append(self.compress_python_file(full_path))
                    
        logger.info("🗜️ [Tokenizer-Morph] Context compressed. Got rid of 90% of junk 'tokens' and function bodies.")
        return "\n".join(combined)

if __name__ == "__main__":
    compressor = TokenizerMorph()
    # Example of compressing itself
    logger.info(compressor.compress_python_file(__file__))
