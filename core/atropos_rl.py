import json
import os
import glob
from core.logger import logger

TRAIN_FILE = "train.jsonl"
VALID_FILE = "valid.jsonl"

def prepare_dataset(tasks_dir: str):
    """
    Atropos Experience Replay (RL)
    Reads all verdict.json files from task folders (.tasks/*/) and creates a dataset
    for fine-tuning the model (RLHF/DPO) in the background on Apple Silicon MLX.
    """
    if not os.path.exists(tasks_dir):
        logger.info(f"📭 [Atropos RL] Audit folder {tasks_dir} is empty.")
        return

    dataset = []
    
    # Search for verdict.json files in all subfolders
    verdict_files = glob.glob(os.path.join(tasks_dir, "*", "verdict.json"))
    
    for v_file in verdict_files:
        try:
            with open(v_file, "r") as f:
                data = json.load(f)
                
            # If the task is successful (1) or failed (0), we form a prompt-response pair
            # In real RLHF: success = chosen, failed = rejected
            status = data.get("status", "")
            if status == "success" or "success" in status.lower():
                prompt = data.get("task_description", "Do the task")
                # For simplicity, we add a fixed response or take the source code
                response = data.get("final_code", "logger.info('success')")
                
                # Formatting for Llama-3 (Alpaca/Instruct)
                text = f"<|begin_of_text|><|start_header_id|>user<|end_header_id|>\n{prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n{response}<|eot_id|>"
                dataset.append({"text": text})
                
        except (json.JSONDecodeError, KeyError) as e:
            logger.info(f"⚠️ [Atropos RL] Parsing error in {v_file}: {e}")
            continue

    if not dataset:
        logger.info("🤷‍♂️ [Atropos RL] No successful verdicts (verdict.json) found for training.")
        return

    with open(TRAIN_FILE, "w") as f:
        for item in dataset:
            f.write(json.dumps(item) + "\n")
            
    # MLX requires a validation set
    with open(VALID_FILE, "w") as f:
        f.write(json.dumps(dataset[0]) + "\n")

    logger.info(f"✅ [Atropos RL] LoRA dataset created: '{TRAIN_FILE}' ({len(dataset)} experience samples from the evidence folder).")
    logger.info("\n🚀 [Command to start The Sleep Mode on GPU]")
    logger.info("python -m mlx_lm.lora --train --model mlx-community/Meta-Llama-3-8B-Instruct-4bit --data . --batch-size 1 --lora-layers 4 --iters 100")

if __name__ == "__main__":
    tasks_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "workspaces", ".tasks"))
    # For testing, it can also be a local folder
    if not os.path.exists(tasks_root):
        tasks_root = ".tasks"
    prepare_dataset(tasks_root)
