import os
import re
import asyncio
from google import genai
from google.genai import types

# Assumes GEMINI_API_KEY is natively in environment

async def translate_file(client, filepath, semaphore):
    async with semaphore:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # If no Cyrillic characters are detected, skip translation immediately
        if not re.search(r'[А-Яа-я]', content):
            return 0

        print(f"Translating: {filepath}...")
        
        prompt = f"""You are a professional code localization tool. 
Task: Translate all Russian text (comments, docstrings, string literals, fastAPI descriptions, print statements) in the following codebase file into English.
CRITICAL RULES:
1. DO NOT change any logic, variable names, classes, functions, structure, syntax, formatting, or indentation (especially for Python/YAML files).
2. DO NOT wrap the output in markdown code blocks like ```python. Output ONLY the raw file string so it can be written directly back to disk.
3. Preserve the exact programmatic behavior.

CODE TO TRANSLATE:
{content}
"""
        try:
            response = await client.aio.models.generate_content(
                model='gemini-2.5-pro',
                contents=prompt,
                config=types.GenerateContentConfig(temperature=0.0)
            )
            
            result = response.text
            
            # Clean up potential markdown formatting injection
            if result.startswith("```"):
                lines = result.split('\n')
                if len(lines) > 1 and lines[-1].startswith("```"):
                    result = '\n'.join(lines[1:-1])
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(result)
            print(f"✅ Translated: {filepath}")
            return 1
            
        except Exception as e:
            print(f"❌ Error translating {filepath}: {e}")
            return 0

async def main():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("GEMINI_API_KEY environment variable not set. Please export it.")
        return
        
    client = genai.Client()
    semaphore = asyncio.Semaphore(15) # Max 15 concurrent API calls to respect rate limits
    
    files_to_translate = []
    
    # Only target core files for now to avoid altering generated sandbox stuff
    search_dirs = ['core'] 
    
    for search_dir in search_dirs:
        for root, dirs, f in os.walk(search_dir):
            if any(x in root for x in ['.git', 'venv', 'node_modules', '__pycache__', '.pytest_cache', '.lancedb']):
                continue
            for file in f:
                if file.endswith(('.py', '.yaml', '.md', '.json', '.ts', '.tsx')):
                    files_to_translate.append(os.path.join(root, file))

    print(f"Found {len(files_to_translate)} files in target directories. Checking for Cyrillic...")
    
    tasks = [translate_file(client, filepath, semaphore) for filepath in files_to_translate]
    results = await asyncio.gather(*tasks)
    
    translated_count = sum(results)
    print(f"\n🎉 Finished translating {translated_count} files containing Russian.")

if __name__ == "__main__":
    asyncio.run(main())
