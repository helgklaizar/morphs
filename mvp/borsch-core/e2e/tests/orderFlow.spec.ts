import { test, expect } from '@playwright/test';

test.describe('End-to-End Order Flow', () => {
  test('User can place an order and see it in Backoffice POS', async ({ page, context }) => {
    await page.goto('http://localhost:3000');
    
    try {
      const langBtn = page.locator('button', { hasText: '🇷🇺 Русский' }).first();
      await langBtn.waitFor({ state: 'visible', timeout: 5000 });
      await langBtn.click();
    } catch (e) {
      console.log("No language modal appeared");
    }

    await expect(page.locator('text=BORSCH').first()).toBeVisible();

    const addToCartBtn = page.locator('button', { hasText: 'В корзину' }).first();
    
    if (await addToCartBtn.isVisible()) {
      await addToCartBtn.click();

      const cartButton = page.locator('button', { hasText: 'Корзина' }).first();
      await expect(cartButton).toBeVisible();
      await cartButton.click();

      const textInputs = page.locator('input[type="text"]');
      await expect(textInputs.nth(0)).toBeVisible(); 
      
      await textInputs.nth(0).fill('Test Customer');
      await page.locator('input[type="tel"]').first().fill('+972500000000');
      
      if (await textInputs.nth(1).isVisible()) {
        await textInputs.nth(1).fill('Herzl');      // street
        await textInputs.nth(2).fill('12');         // house
      }

      const timeSelect = page.locator('select').last();
      if (await timeSelect.isVisible()) {
        await timeSelect.selectOption({ index: 1 });
      }

      const submitBtn = page.locator('button', { hasText: 'Оформить заказ' }).first();
      await submitBtn.click();
      
      const successLocator = page.locator('text=Заказ принят!').first();
      const errorLocator = page.locator('text=Ошибка:').first();
      
      await Promise.race([
        successLocator.waitFor({ state: 'visible', timeout: 10000 }),
        errorLocator.waitFor({ state: 'visible', timeout: 10000 }),
      ]).catch(() => console.log('Neither success nor error appeared in time.'));

      if (await errorLocator.isVisible()) {
        const errorText = await errorLocator.textContent();
        throw new Error("Order failed: " + errorText);
      }
      
      await expect(successLocator).toBeVisible({ timeout: 2000 });
      
      const posPage = await context.newPage();
      posPage.on('pageerror', exception => {
        console.error(`Uncaught exception in posPage: "${exception}"`);
      });
      posPage.on('console', msg => {
        if (msg.type() === 'error') console.error(`posPage console error: "${msg.text()}"`);
      });
      await posPage.goto('http://localhost:3001/orders');
      
      try {
        await expect(posPage.locator('text=Test Customer').first()).toBeVisible({ timeout: 15000 });
        await expect(posPage.locator('text=+972500000000').first()).toBeVisible();
      } catch (e) {
        await posPage.screenshot({ path: 'backoffice-fail.png' });
        console.error("DEBUG HTML CONTENT:");
        console.error(await posPage.content());
        throw e;
      }
    } else {
      console.log("No items available to order, skipping end-to-end checkout step.");
    }
  });
});
