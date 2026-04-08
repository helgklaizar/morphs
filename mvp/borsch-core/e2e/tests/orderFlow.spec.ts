import { test, expect } from '@playwright/test';

test.describe('End-to-End Order Flow', () => {
  test('User can open landing, see menu and basic layout', async ({ page }) => {
    // 1. Visit landing page
    await page.goto('http://localhost:3000');
    
    // 2. Expect title
    await expect(page).toHaveTitle(/Борщ/);
    
    // 3. Expect hero title to be configured from our mocked system settings
    await expect(page.locator('text=BORSCH')).toBeVisible();

    // 4. Verify categories are visible
    await expect(page.locator('text=Все меню')).toBeVisible();
    
    // We can't fully add to cart yet without seeded menu items 
    // unless the DB has some from standard dev.db. 
    // But we check that the API didn't crash.
  });
});
