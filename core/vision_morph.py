import os
from google import genai
from core.logger import logger

class VisionMorph:
    """
    Item 3: Vision-Morph (UI Reverse Engineering)
    The assessor agent converts an image from Dribbble/Figma into a JSON architecture of React components.
    We copy cool designs with our eyes!
    """
    def __init__(self, model_name: str = "gemini-2.5-pro"):
        api_key = os.environ.get("GEMINI_API_KEY")
        self.client = genai.Client(api_key=api_key) if api_key else None
        self.model_name = model_name

    def analyze_screenshot(self, image_path: str) -> str:
        if not self.client:
            return "❌ [Vision-Morph] Error: GEMINI_API_KEY is not set. Multimodality is disabled."
            
        logger.info(f"👁️ [Vision-Morph] Scanning UI screenshot ({image_path})...")
        
        try:
            # For the new genai, it's better to upload a file or provide bytes
            # We provide bytes as a Part object if using the File/Part API, or just bytes (genai handles bytes)
            with open(image_path, "rb") as f:
                image_data = f.read()

            prompt = (
                "You are an expert Frontend Architect with an eagle eye (Vision-Morph).\n"
                "Looking at this dashboard/design screenshot, perform reverse engineering and UI decomposition.\n"
                "Your result must be a JSON object describing the component hierarchy,\n"
                "style names (Tailwind), and colors. The Coder will use this as a reference.\n\n"
                "The output format must be strictly JSON (you can wrap it in ```json)."
            )
            
            # genai.Client() accepts raw bytes or list[bytes]
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=[prompt, image_data]
            )
            
            logger.info("✅ [Vision-Morph] Visual architecture extracted! Ready for the Coder.")
            return response.text
            
        except FileNotFoundError:
            return "❌ [Vision-Morph] Screenshot not found at the specified path."
        except Exception as e:
            logger.info(f"🔥 [Vision-Morph] Optical tracking error: {e}")
            return f"Error: {e}"

    def get_ui_schema_for_coder(self, screenshot_path: str) -> str:
        """Wrapper method for calling from the Workflow (Debate/Generation)"""
        json_arch = self.analyze_screenshot(screenshot_path)
        return json_arch
