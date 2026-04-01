import asyncio
from core.logger import logger
from core.healer_morph import HealerMorph
from core.browser_morph import BrowserMorph
from config import settings

class VerificationMorph:
    """
    Независимый "Судья". Изолирован от слоя генерации.
    Единственный, кто может вынести вердикт "Success".
    Защищает от LLM-самообмана.
    """
    def __init__(self, target_dir: str, work_dir: str, target_file: str):
        self.target_dir = target_dir
        self.work_dir = work_dir
        self.target_file = target_file
        
    async def run_verification(self) -> tuple[bool, str]:
        """
        Запускает изолированные тесты. Сначала unit-тесты (HealerMorph),
        затем E2E (BrowserMorph). Возвращает (успех, evidence_log).
        """
        logger.info("⚖️ [Verification-Morph] Начинаю жесткую независимую верификацию...")
        evidence_log = ""
        
        # 1. Запуск Unit/Vitest тестов
        healer = HealerMorph(self.target_dir, self.target_file)
        # Assuming HealerMorph.run_tests was fixed in reality, but we use the existing return signature
        try:
            code_res, out, err = await healer.run_tests()
        except TypeError:
            # If the signature is actually out directly
            out = await healer.run_tests()
            code_res = out.return_code
            err = out.stderr
            out = out.stdout

        evidence_log += f"VITEST STDOUT:\n{out}\nVITEST STDERR:\n{err}\n"
        
        if code_res != 0:
            logger.warning("❌ [Verification-Morph] Unit-тесты ПРОВАЛЕНЫ.")
            return False, evidence_log
            
        logger.info("✅ [Verification-Morph] Unit-тесты ПРОЙДЕНЫ.")
        
        # 2. Запуск E2E Browser Playwright
        try:
            bm = BrowserMorph(target_url=f"http://localhost:{settings.VITE_DEV_PORT}")
            chaos_report = await bm.simulate_user_journey("chaos")
            
            evidence_log += f"\nE2E BROWSER REPORT:\n{chaos_report}\n"
            
            if chaos_report.get("status") == "failed":
                logger.warning("❌ [Verification-Morph] E2E-тесты (Browser) ПРОВАЛЕНЫ.")
                return False, evidence_log
                
        except Exception as e:
            msg = f"Browser E2E validation error: {e}"
            evidence_log += f"\nE2E EXCEPTION:\n{msg}\n"
            logger.warning(f"❌ [Verification-Morph] {msg}")
            # If browser tests fail to run, we might not want to hard fail unless strictly required,
            # but for a strict verification agent, any exception is a failure.
            return False, evidence_log
            
        logger.info("✅ [Verification-Morph] E2E-тесты ПРОЙДЕНЫ. Итог: SUCCESS.")
        return True, evidence_log
