from mlx_agent import CoreMind
from core.logger import logger

def run_meta_test():
    logger.info("🔥 [Meta-Morph] Running Core self-modification test...")
    mind = CoreMind()
    
    target_file = "main.py"
    with open(target_file, "r") as f:
        current_code = f.read()
        
    prompt = (
        "You are Meta-Morph, an elite AI architect. Your task is to improve the system core (main.py).\n"
        "You have been given the current source code of 'main.py'.\n"
        "TASK:\n"
        "Add a new GET endpoint `/api/v1/metrics`. "
        "It should return a simple JSON {'status': 'ok', 'active_agents': 4, 'uptime': '10h'}. "
        "The rest of the code must remain fully functional and untouched.\n\n"
        f"CURRENT CODE:\n```python\n{current_code}\n```\n"
    )
    
    schema = (
        "<thought>\n"
        "Describe step-by-step where exactly to insert the new route so as not to break the rest of the code.\n"
        "</thought>\n"
        "<code>\n"
        "RETURN THE ENTIRE UPDATED main.py CODE (from start to finish).\n"
        "</code>"
    )
    
    logger.info("⚡️ [Meta-Morph] The Core is reading its own code and planning a mutation...")
    result = mind.think_structured(prompt, schema, max_tokens=4000)
    
    logger.info(f"🤔 [Meta-Morph Thought]: {result.get('thought', 'No thoughts')}")
    new_code = result.get("code", "")
    
    if not new_code or len(new_code) < 500:
        logger.info("❌ [Meta-Morph] Error: The AI produced code that is too short or empty.")
        return
        
    # Safety backup
    backup_file = "main_backup.py"
    with open(backup_file, "w") as f:
        f.write(current_code)
        
    logger.info(f"💾 [Meta-Morph] Old code saved to {backup_file}.")
    
    # Writing the mutation
    with open(target_file, "w") as f:
        f.write(new_code)
        
    logger.info("🚀 [Meta-Morph] Checking new code syntax (AST Validation)...")
    try:
        import ast
        ast.parse(new_code)
        logger.info("✅ [Meta-Morph] Syntax is correct. Mutation successful!")
    except SyntaxError as e:
        logger.info(f"❌ [Meta-Morph] SYNTAX ERROR: {e}")
        logger.info("🔄 [Meta-Morph] Reverting to backup...")
        with open(target_file, "w") as f:
            f.write(current_code)

if __name__ == "__main__":
    run_meta_test()
