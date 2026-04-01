import json
import os
import glob
from core.logger import logger

TRAIN_FILE = "train.jsonl"
VALID_FILE = "valid.jsonl"

def prepare_dataset(tasks_dir: str):
    """
    Atropos Experience Replay (RL)
    Читает все файлы verdict.json из папок задач (.tasks/*/) и создает датасет
    для дообучения модели (RLHF/DPO) в фоновом режиме на Apple Silicon MLX.
    """
    if not os.path.exists(tasks_dir):
        logger.info(f"📭 [Atropos RL] Папка аудита {tasks_dir} пуста.")
        return

    dataset = []
    
    # Ищем файлы verdict.json во всех подпапках
    verdict_files = glob.glob(os.path.join(tasks_dir, "*", "verdict.json"))
    
    for v_file in verdict_files:
        try:
            with open(v_file, "r") as f:
                data = json.load(f)
                
            # Если задача успешна (1) или провалена (0), мы формируем промпт-ответ
            # В реальном RLHF: success = chosen, failed = rejected
            status = data.get("status", "")
            if status == "success" or "success" in status.lower():
                prompt = data.get("task_description", "Сделай задачу")
                # Для упрощения добавляем фиксированный ответ или берем исходник
                response = data.get("final_code", "logger.info('success')")
                
                # Форматирование под Llama-3 (Alpaca/Instruct)
                text = f"<|begin_of_text|><|start_header_id|>user<|end_header_id|>\n{prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n{response}<|eot_id|>"
                dataset.append({"text": text})
                
        except (json.JSONDecodeError, KeyError) as e:
            logger.info(f"⚠️ [Atropos RL] Ошибка парсинга {v_file}: {e}")
            continue

    if not dataset:
        logger.info("🤷‍♂️ [Atropos RL] Не найдено успешных вердиктов (verdict.json) для обучения.")
        return

    with open(TRAIN_FILE, "w") as f:
        for item in dataset:
            f.write(json.dumps(item) + "\n")
            
    # MLX требует валидационный сет
    with open(VALID_FILE, "w") as f:
        f.write(json.dumps(dataset[0]) + "\n")

    logger.info(f"✅ [Atropos RL] Сформирован датасет LoRA: '{TRAIN_FILE}' ({len(dataset)} семплов опыта из папки evidence).")
    logger.info("\n🚀 [Команда для старта The Sleep Mode на GPU]")
    logger.info("python -m mlx_lm.lora --train --model mlx-community/Meta-Llama-3-8B-Instruct-4bit --data . --batch-size 1 --lora-layers 4 --iters 100")

if __name__ == "__main__":
    tasks_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "workspaces", ".tasks"))
    # Для теста может быть и локальная папка
    if not os.path.exists(tasks_root):
        tasks_root = ".tasks"
    prepare_dataset(tasks_root)
