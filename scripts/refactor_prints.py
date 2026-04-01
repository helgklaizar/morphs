import os
import re

def refactor_file(filepath):
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # Skip logger.py itself
    if filepath.endswith('logger.py') or 'site-packages' in filepath or 'venv' in filepath:
        return

    # Check if there's any print statement or except Exception that does nothing
    needs_logger = bool(re.search(r'\bprint\(', content))
    
    # Replace empty pass in exceptions (if any)
    new_content = re.sub(r'except Exception as e:\s+pass', r'except Exception as e:\n            logger.error(f"Error: {e}")', content)
    new_content = re.sub(r'except Exception:\s+pass', r'except Exception as e:\n            logger.error(f"Error: {e}")', new_content)

    if needs_logger or new_content != content:
        # Replace print(  with logger.info(
        new_content = re.sub(r'\bprint\(', 'logger.info(', new_content)

        # Ensure from core.logger import logger is present
        if 'from core.logger import logger' not in new_content:
            # Find the best place to insert: after the last import or at the top
            import_matches = list(re.finditer(r'^(?:import|from).*$', new_content, re.MULTILINE))
            if import_matches:
                last_import = import_matches[-1]
                insert_pos = last_import.end()
                new_content = new_content[:insert_pos] + "\nfrom core.logger import logger" + new_content[insert_pos:]
            else:
                new_content = "from core.logger import logger\n" + new_content

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)

if __name__ == '__main__':
    for root, dirs, files in os.walk('core'):
        for file in files:
            if file.endswith('.py'):
                refactor_file(os.path.join(root, file))
    print("Refactoring done.")
