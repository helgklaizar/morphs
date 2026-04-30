import os
import re
from google import genai
import time

client = genai.Client() # Assumes GEMINI_API_KEY from environment

def translate_file(filepath):
    print(f"Translating {filepath}...")
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check if cyrillic is present
        if not re.search(r'[А-Яа-я]', content):
            return True
            
        prompt = f"""You are a code translation tool. Translate all Russian text (comments, docstrings, logger messages, string literals, print statements) in the following code into English. 
DO NOT change ANY code logic, variable names, classes, functions, structure, syntax, or indentation.
Preserve the exact programmatic behavior.
Output ONLY the raw file content in English without any markdown formatting wrappers like "```python" or "```".

{content}"""

        response = client.models.generate_content(
            model='gemini-2.5-pro',
            contents=prompt,
        )
        
        result = response.text
        # Clean up markdown if accidentally added
        if result.startswith("```"):
            lines = result.split('\n')
            if len(lines) > 1 and lines[-1].startswith("```"):
                result = '\n'.join(lines[1:-1])

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(result)
        return True
    except Exception as e:
        print(f"Error translating {filepath}: {e}")
        return False

files_to_translate = []
for root, dirs, f in os.walk('core'):
    if any(x in root for x in ['.git', 'venv', 'node_modules', '__pycache__', '.pytest_cache', '.lancedb']):
        continue
    for file in f:
        if file.endswith(('.py', '.yaml')):
            files_to_translate.append(os.path.join(root, file))

# Translate the first 10 for safety/speed and commit
count = 0
for file in files_to_translate:
    with open(file, 'r', encoding='utf-8') as fh:
        c = fh.read()
    if re.search(r'[А-Яа-я]', c):
        if translate_file(file):
            count += 1
            time.sleep(2) # avoid ratelimit
            
print(f"Translated {count} files.")
