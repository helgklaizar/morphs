import json
import os
import glob
from core.logger import logger

class AtroposTrainer:
    """
    Эволюционное Офлайн-Дообучение ИИ (RLHF/DPO).
    Считывает траектории, где ИИ ошибся, а Healer-Morph его исправил.
    Формирует датасет для 'ночного сна' (Fine-Tuning на MLX), 
    чтобы ядро больше никогда не допускало таких архитектурных и синтаксических провалов.
    """
    def __init__(self, trajectories_dir: str = "trajectories", output_dataset: str = "atropos_dpo_dataset.jsonl"):
        self.trajectories_dir = trajectories_dir
        self.output_dataset = output_dataset
        os.makedirs(self.trajectories_dir, exist_ok=True)
        
    def build_dpo_dataset(self) -> int:
        logger.info("🌙 [Atropos Sleep] Сборщик снов активирован. Читаю логи ошибок и исцелений...")
        dataset = []
        
        # Поиск всех файлов траекторий (формат JSON)
        for t_file in glob.glob(os.path.join(self.trajectories_dir, "*.json")):
            try:
                with open(t_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    
                # Если Healer_morph нашел ошибку и смог ее починить
                if data.get("reward") == 1 and "prompt" in data and "fixed_code" in data and "broken_code" in data:
                    dataset.append({
                        "prompt": data["prompt"],
                        "chosen": data["fixed_code"],      # Идеальный код, который работает
                        "rejected": data["broken_code"]    # Код, который упал в Pytest/Vitest
                    })
            except Exception as e:
                logger.info(f"⚠️ Ошибка чтения траектории {t_file}: {e}")
                
        if not dataset:
            logger.info("💤 [Atropos Sleep] Нет свежего опыта для обучения. ИИ идеален (пока).")
            return 0
            
        with open(self.output_dataset, "w", encoding="utf-8") as f:
            for item in dataset:
                f.write(json.dumps(item) + "\\n")
                
        logger.info(f"🧬 [Atropos Sleep] Сформирован DPO датасет ({len(dataset)} семплов) для обучения: {self.output_dataset}.")
        logger.info(f"🧠 В будущем здесь будет запущен скрипт локального Fine-Tuning: 'mlx_lm.lora --train --data {self.output_dataset}'")
        return len(dataset)
        
    def run_nightly_evolution(self):
        """ Триггер запуска обучения (ОС вызывает это ночью через Cron) """
        samples = self.build_dpo_dataset()
        if samples > 0:
            # Заглушка системного вызова MLX Training Loop
            return True
        return False
