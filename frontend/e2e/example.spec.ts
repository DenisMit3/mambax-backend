
import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
    await page.goto('http://localhost:3000');
    // Check if title contains typical app name or similar
    // Adjust based on actual app title
    await expect(page).toHaveTitle(/MambaX/);
});

test('check navigation', async ({ page }) => {
    // This assumes app is running. In CI, we need to start it.
    // For now, this is a placeholder e2e test file.
    await page.goto('http://localhost:3000/login');
    await expect(page.getByRole('heading', { name: /Login|Sign In/i })).toBeVisible(); // flexible matcher
});
