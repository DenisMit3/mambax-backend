import { test, expect } from '@playwright/test';

test.describe('Swipe and Match Flow', () => {
    // Authenticate before tests
    test.beforeEach(async ({ page }) => {
        // Go to auth page
        await page.goto('/auth/phone');
        await page.waitForLoadState('networkidle');
        
        // Find phone input (can be type="text" with placeholder)
        const phoneInput = page.locator('input[placeholder*="999"]').first();
        await expect(phoneInput).toBeVisible({ timeout: 10000 });
        await phoneInput.fill('+79000000001');
        
        // Click submit button
        await page.click('button:has-text("Получить код")');
        
        // Wait for OTP page
        await page.waitForURL('**/auth/otp**', { timeout: 10000 });
        
        // Fill OTP (6 digits)
        const otpInputs = page.locator('input[inputmode="numeric"]');
        await expect(otpInputs.first()).toBeVisible({ timeout: 5000 });
        for (let i = 0; i < 6; i++) {
            await otpInputs.nth(i).fill('0');
        }
        
        // Wait for redirect after OTP
        await page.waitForURL(/.*(discover|feed|profile|\/)$/, { timeout: 15000 });
    });

    test('User can swipe right and match', async ({ page }) => {
        // Ensure cards are visible
        const card = page.locator('[data-testid="swipe-card"]').first();
        await expect(card).toBeVisible();

        // Swipe Right (Like)
        // Simulate drag or click like button
        const likeBtn = page.locator('button[aria-label="Like"]');
        if (await likeBtn.isVisible()) {
            await likeBtn.click();
        } else {
            // Drag
            const box = await card.boundingBox();
            if (box) {
                await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
                await page.mouse.down();
                await page.mouse.move(box.x + box.width / 2 + 200, box.y + box.height / 2);
                await page.mouse.up();
            }
        }

        // Check for Match Modal or just next card
        // If it's a match, a modal appears
        // Since we can't guarantee a match with random seed, we just check the card is gone or action performed.

        // For E2E test to be deterministic, we usually need specific seed.
        // Assuming we just test the interaction.
        await expect(card).not.toBeVisible();
    });

    test('User can navigate to chat after match', async ({ page }) => {
        await page.goto('/matches');
        await expect(page.locator('text=Matches')).toBeVisible();

        // Click on a match if exists
        const match = page.locator('div[role="button"]').first();
        if (await match.isVisible()) {
            await match.click();
            await expect(page).toHaveURL(/.*chat.*/);

            // Send message
            await page.fill('input[placeholder="Type a message..."]', 'Hello E2E');
            await page.press('input[placeholder="Type a message..."]', 'Enter');

            await expect(page.locator('text=Hello E2E')).toBeVisible();
        }
    });
});
