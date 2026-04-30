import json
import os
import glob
from core.logger import logger

class AtroposTrainer:
    """
    Evolutionary Offline AI Fine-Tuning (RLHF/DPO).
    Reads trajectories where the AI made a mistake and Healer-Morph corrected it.
    Forms a dataset for 'nightly sleep' (Fine-Tuning on MLX),
    so that the core never makes such architectural and syntactic failures again.
    """
    def __init__(self, trajectories_dir: str = "trajectories", output_dataset: str = "atropos_dpo_dataset.jsonl"):
        self.trajectories_dir = trajectories_dir
        self.output_dataset = output_dataset
        os.makedirs(self.trajectories_dir, exist_ok=True)
        
    def build_dpo_dataset(self) -> int:
        logger.info("🌙 [Atropos Sleep] Dream collector activated. Reading error and healing logs...")
        dataset = []
        
        # Search for all trajectory files (JSON format)
        for t_file in glob.glob(os.path.join(self.trajectories_dir, "*.json")):
            try:
                with open(t_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    
                # If Healer_morph found an error and was able to fix it
                if data.get("reward") == 1 and "prompt" in data and "fixed_code" in data and "broken_code" in data:
                    dataset.append({
                        "prompt": data["prompt"],
                        "chosen": data["fixed_code"],      # The ideal code that works
                        "rejected": data["broken_code"]    # The code that failed in Pytest/Vitest
                    })
            except Exception as e:
                logger.info(f"⚠️ Error reading trajectory {t_file}: {e}")
                
        if not dataset:
            logger.info("💤 [Atropos Sleep] No new experience for training. The AI is perfect (for now).")
            return 0
            
        with open(self.output_dataset, "w", encoding="utf-8") as f:
            for item in dataset:
                f.write(json.dumps(item) + "\\n")
                
        logger.info(f"🧬 [Atropos Sleep] DPO dataset formed ({len(dataset)} samples) for training: {self.output_dataset}.")
        logger.info(f"🧠 In the future, a local Fine-Tuning script will be launched here: 'mlx_lm.lora --train --data {self.output_dataset}'")
        return len(dataset)
        
    def run_nightly_evolution(self):
        """ Training trigger (OS calls this at night via Cron) """
        samples = self.build_dpo_dataset()
        if samples > 0:
            # Stub for the MLX Training Loop system call
            return True
        return False
