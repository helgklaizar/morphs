import os
import json
from mlx_agent import CoreMind
from core.logger import logger

class ArchivistMorph:
    def __init__(self):
        self.mind = CoreMind()
        logger.info("📚 [Archivist-Morph] Проснулся. Проверяю переполнение локальной памяти...")

    def fold_memory(self):
        """
        Проверяет папку blueprints и json-файлы.
        Если они слишком большие, сжимает историю в bullet-points.
        """
        blueprints_dir = "../blueprints"
        if not os.path.exists(blueprints_dir):
            return

        for filename in os.listdir(blueprints_dir):
            if not filename.endswith(".json"):
                continue

            filepath = os.path.join(blueprints_dir, filename)
            try:
                with open(filepath, "r") as f:
                    content = f.read()
            except Exception as e:
                logger.info(f"⚠️ [Archivist] Ошибка открытия {filename}: {e}")
                continue

            # Memory Folding Logic: Если контекст разросся
            if len(content) > 3000:
                logger.info(f"🧹 [Archivist-Morph] Файл {filename} слишком большой ({len(content)} байт). Начинаю компрессию (Memory Folding)...")
                
                prompt = (
                    f"Ты Архивист. Сожми этот лог работы агентов в максимально короткие и емкие bullet-points.\n"
                    f"Оставь ТОЛЬКО суть: архитектуру, пути API, названия таблиц и ключи. Удали всю воду.\n"
                    f"ИСТОДНИК:\n{content}"
                )
                
                schema = (
                    "<thought>Пиши что хочешь</thought>\n"
                    "<code>Здесь сжатый JSON с ключевыми метриками (keys, endpoints, architecture)</code>"
                )
                
                result = self.mind.think_structured(prompt, schema, max_tokens=1000, expert_adapter="archivist")
                compressed_json_str = result.get("code", "")
                
                # Сохраняем обратно как мини-слепок
                try:
                    compressed_json = json.loads(compressed_json_str)
                    with open(filepath, "w") as f:
                        json.dump(compressed_json, f, indent=4)
                    logger.info(f"📦 [Archivist-Morph] Успех! Файл {filename} сжат. Освобождено токенов ИИ-контекста.")
                except Exception as e:
                    logger.info(f"⚠️ [Archivist-Morph] Ошибка парсинга сжатого JSON, пропускаю. {e}")
            else:
                pass

if __name__ == "__main__":
    arch = ArchivistMorph()
    arch.fold_memory()
