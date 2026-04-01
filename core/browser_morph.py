import time
from core.logger import logger

class BrowserMorph:
    """
    E2E Валидатор. Симулирует пользователя (человека).
    Запускает headless-браузер поверх сгенерированного SaaS, кликает кнопки.
    Обеспечивает гарантию, что UI + API связка не сломалась.
    """
    def __init__(self, target_url: str = "http://localhost:5173"):
        self.target_url = target_url
        self.errors = []
        
    def _handle_console(self, msg):
        if msg.type in ['error', 'warn']:
            self.errors.append({"type": f"console_{msg.type}", "error": msg.text})
            logger.info(f"🔴 [Browser-Console] {msg.text}")

    async def simulate_user_journey(self, scenario: str = "chaos") -> dict:
        logger.info(f"🌐 [Browser-Morph] Эмуляция сценария: '{scenario}' на {self.target_url}")
        self.errors.clear()
        
        # Ленивый импорт только при вызове (чтобы ядро не ломалось без playwright)
        import asyncio
        from playwright.async_api import async_playwright
        
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page()
                
                # Подписываемся на краши JS в браузере
                page.on("pageerror", lambda err: self.errors.append({"type": "pageerror", "error": err.message}))
                page.on("console", self._handle_console)
                
                logger.info("🚦 [Browser-Morph] Открываю холст...")
                await page.goto(self.target_url, timeout=10000)
                await asyncio.sleep(2) # Даем React отрендерить компоненты
                
                if scenario == "chaos":
                    # Находим все кликабельные элементы и спамим по ним
                    interactives = page.locator('button, a, [role="button"], input[type="submit"]')
                    count = await interactives.count()
                    logger.info(f"🐒 [Browser-Morph] Chaos Monkey: Найдено {count} интерактивных элементов на холсте. Начинаю спам кликами...")
                    
                    for i in range(min(count, 15)):
                        try:
                            el = interactives.nth(i)
                            if await el.is_visible() and await el.is_enabled():
                                await el.click(timeout=1500, force=True)
                                await asyncio.sleep(0.3)
                        except Exception as e:
                            logger.error(f"⚠️ [BrowserMorph] Элемент пропал из DOM: {e}", exc_info=False)
                            self.errors.append({"type": "element_click", "error": str(e), "element_index": i})
                            
                await asyncio.sleep(1) # Ждем асинхронных стейтов (useState / useEffect краши)
                await browser.close()
                
        except Exception as e:
            logger.error(f"💥 [Browser-Morph] Ошибка инструмента Playwright: {e}", exc_info=False)
            self.errors.append({"type": "navigation_crash", "error": str(e)})

        if self.errors:
            logger.info(f"❌ [Browser-Morph] Найдено {len(self.errors)} ошибок/варнингов во время эмуляции!")
            return {"status": "failed", "errors": self.errors}
            
        logger.info("✅ [Browser-Morph] Chaos monkey: Ошибок JS/React не зафиксировано. UI стабилен.")
        return {"status": "success", "errors": []}
