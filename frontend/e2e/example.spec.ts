
import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
    await page.goto('http://localhost:3000');
    // Check if title contains typical app name or similar
    // Adjust based on actual app title
    await expect(page).toHaveTitle(/MambaX/);
});

test('check navigation', async ({ page }) => {
    // Navigate to auth page (login page is /auth/phone in this app)
    await page.goto('http://localhost:3000/auth/phone');
    // Use domcontentloaded instead of networkidle to avoid HMR hanging
    await page.waitForLoadState('domcontentloaded');
    
    // Check for phone input field (the main element on auth page)
    const phoneInput = page.locator('input[placeholder*="999"]');
    await expect(phoneInput).toBeVisible({ timeout: 15000 });
});
