import time
from core.logger import logger

class BrowserMorph:
    """
    E2E Validator. Simulates a user (human).
    Launches a headless browser over the generated SaaS, clicks buttons.
    Ensures that the UI + API connection is not broken.
    """
    def __init__(self, target_url: str = "http://localhost:5173"):
        self.target_url = target_url
        self.errors = []
        
    def _handle_console(self, msg):
        if msg.type in ['error', 'warn']:
            self.errors.append({"type": f"console_{msg.type}", "error": msg.text})
            logger.info(f"🔴 [Browser-Console] {msg.text}")

    async def simulate_user_journey(self, scenario: str = "chaos") -> dict:
        logger.info(f"🌐 [Browser-Morph] Emulating scenario: '{scenario}' on {self.target_url}")
        self.errors.clear()
        
        # Lazy import only on call (so the core doesn't break without playwright)
        import asyncio
        from playwright.async_api import async_playwright
        
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page()
                
                # Subscribing to JS crashes in the browser
                page.on("pageerror", lambda err: self.errors.append({"type": "pageerror", "error": err.message}))
                page.on("console", self._handle_console)
                
                logger.info("🚦 [Browser-Morph] Opening the canvas...")
                await page.goto(self.target_url, timeout=10000)
                await asyncio.sleep(2) # Letting React render components
                
                if scenario == "chaos":
                    # Finding all clickable elements and spamming them
                    interactives = page.locator('button, a, [role="button"], input[type="submit"]')
                    count = await interactives.count()
                    logger.info(f"🐒 [Browser-Morph] Chaos Monkey: Found {count} interactive elements on the canvas. Starting click spam...")
                    
                    for i in range(min(count, 15)):
                        try:
                            el = interactives.nth(i)
                            if await el.is_visible() and await el.is_enabled():
                                await el.click(timeout=1500, force=True)
                                await asyncio.sleep(0.3)
                        except Exception as e:
                            logger.error(f"⚠️ [BrowserMorph] Element disappeared from DOM: {e}", exc_info=False)
                            self.errors.append({"type": "element_click", "error": str(e), "element_index": i})
                            
                await asyncio.sleep(1) # Waiting for asynchronous states (useState / useEffect crashes)
                await browser.close()
                
        except Exception as e:
            logger.error(f"💥 [Browser-Morph] Playwright tool error: {e}", exc_info=False)
            self.errors.append({"type": "navigation_crash", "error": str(e)})

        if self.errors:
            logger.info(f"❌ [Browser-Morph] Found {len(self.errors)} errors/warnings during emulation!")
            return {"status": "failed", "errors": self.errors}
            
        logger.info("✅ [Browser-Morph] Chaos monkey: No JS/React errors detected. UI is stable.")
        return {"status": "success", "errors": []}
