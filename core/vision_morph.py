import os
from google import genai
from core.logger import logger

class VisionMorph:
    """
    Пункт 3: Vision-Morph (Реверс-инжиниринг UI)
    Агент-оценщик перегоняет картинку с Dribbble/Figma в JSON-архитектуру React компонентов.
    Копируем крутой дизайн глазами!
    """
    def __init__(self, model_name: str = "gemini-2.5-pro"):
        api_key = os.environ.get("GEMINI_API_KEY")
        self.client = genai.Client(api_key=api_key) if api_key else None
        self.model_name = model_name

    def analyze_screenshot(self, image_path: str) -> str:
        if not self.client:
            return "❌ [Vision-Morph] Ошибка: GEMINI_API_KEY не установлен. Мультимодальность отключена."
            
        logger.info(f"👁️ [Vision-Morph] Сканирую скриншот UI ({image_path})...")
        
        try:
            # Для нового genai лучше загрузить файл или отдать байты
            # Мы отдаем байты как Part-объект, если используем File/Part API, или просто байты (genai handle bytes)
            with open(image_path, "rb") as f:
                image_data = f.read()

            prompt = (
                "Ты эксперт Frontend-Архитектор с орлиным зрением (Vision-Morph).\n"
                "Глядя на этот скриншот дашборда/дизайна, проведи реверс-инжиниринг и декомпозиций UI.\n"
                "Твой результат должен быть JSON-объектом, описывающим иерархию компонентов,\n"
                "названия стилей (Tailwind) и цвета. Кодер возьмет это за эталон.\n\n"
                "Формат вывода строго JSON (можешь обернуть в ```json)."
            )
            
            # genai.Client() принимает raw bytes or list[bytes]
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=[prompt, image_data]
            )
            
            logger.info("✅ [Vision-Morph] Зрительная архитектура извлечена! Готово для Кодера.")
            return response.text
            
        except FileNotFoundError:
            return "❌ [Vision-Morph] Скриншот не найден по указанному пути."
        except Exception as e:
            logger.info(f"🔥 [Vision-Morph] Ошибка оптического трекинга: {e}")
            return f"Error: {e}"

    def get_ui_schema_for_coder(self, screenshot_path: str) -> str:
        """Метод-обертка для вызова из Workflow (Дебаты/Генерация)"""
        json_arch = self.analyze_screenshot(screenshot_path)
        return json_arch
