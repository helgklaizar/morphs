import os
import glob
import re

class FileTools:
    """
    Strict, specialized file tools to replace raw bash access (Tool Re-architecture).
    """
    
    @staticmethod
    def read_file(filepath: str) -> str:
        """Reads the content of a file."""
        if not os.path.exists(filepath):
            return f"Error: File {filepath} does not exist."
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                return f.read()
        except Exception as e:
            return f"Error reading file {filepath}: {e}"

    @staticmethod
    def edit_file(filepath: str, old_text: str, new_text: str) -> str:
        """Edits a file by replacing old_text with new_text (str.replace)."""
        if not os.path.exists(filepath):
            return f"Error: File {filepath} does not exist."
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            
            if old_text not in content:
                return f"Error: The exact text '{old_text}' was not found in {filepath}."
                
            updated = content.replace(old_text, new_text)
            
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(updated)
            return f"Success: Updated {filepath}."
        except Exception as e:
            return f"Error editing file {filepath}: {e}"

    @staticmethod
    def glob_files(pattern: str, base_dir: str = ".") -> str:
        """Finds files matching a glob pattern."""
        try:
            original_dir = os.getcwd()
            os.chdir(base_dir)
            files = glob.glob(pattern, recursive=True)
            os.chdir(original_dir)
            if not files:
                return "No files found."
            return "\n".join(files)
        except Exception as e:
            if 'original_dir' in locals():
                os.chdir(original_dir)
            return f"Error running glob: {e}"

    @staticmethod
    def grep_search(pattern: str, filepath: str) -> str:
        """Searches for a regex pattern inside a specific file."""
        if not os.path.exists(filepath):
            return f"Error: File {filepath} does not exist."
        try:
            matches = []
            with open(filepath, "r", encoding="utf-8") as f:
                for line_num, line in enumerate(f, 1):
                    if re.search(pattern, line):
                        matches.append(f"{line_num}: {line.rstrip()}")
            
            if not matches:
                return f"No matches for pattern '{pattern}' in {filepath}."
            return "\n".join(matches)
        except Exception as e:
            return f"Error running grep on {filepath}: {e}"
