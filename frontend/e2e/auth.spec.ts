import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
    test('User can login via phone and OTP', async ({ page }) => {
        // 1. Navigate to home/login
        await page.goto('/');

        // Check if redirect to login or show login
        // Assuming start page has login button or input
        // If user is not logged in, they might be redirected to /auth or see a login modal.

        // This depends on the actual UI implementation. 
        // Based on previous context, there is a phone input.

        // Type phone number
        const phoneInput = page.locator('input[type="tel"]');
        await expect(phoneInput).toBeVisible();
        await phoneInput.fill('+79000000001');

        // Click Continue
        await page.click('button:has-text("Continue")');

        // 2. OTP Screen
        await expect(page.locator('text=Enter OTP')).toBeVisible();

        // Fill OTP (000000 for test users - 6 digits after SEC-002)
        // Assuming 6 digits inputs or single input
        const otpInput = page.locator('input[autocomplete="one-time-code"]');
        if (await otpInput.count() > 0) {
            await otpInput.fill('000000');
        } else {
            // Maybe multiple inputs
            await page.keyboard.type('000000');
        }

        // 3. Profile Setup (if new) or Home (if existing)
        // Test user +79000000001 usually exists if seeded.
        // Expect redirection to /feed or /profile

        await expect(page).toHaveURL(/.*(feed|profile|onboarding).*/);
    });
});
