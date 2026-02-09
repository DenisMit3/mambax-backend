import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
    test('User can login via phone and OTP', async ({ page, context }) => {
        // Collect console logs and network errors
        const consoleLogs: string[] = [];
        const networkErrors: string[] = [];
        
        page.on('console', msg => {
            consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
        });
        
        page.on('requestfailed', request => {
            networkErrors.push(`FAILED: ${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
        });
        
        page.on('response', response => {
            if (response.status() >= 400) {
                consoleLogs.push(`HTTP ${response.status()}: ${response.url()}`);
            }
        });

        // Clear any existing auth state
        await context.clearCookies();
        await page.goto('/auth/phone');
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
        
        // Reload to ensure clean state - use domcontentloaded to avoid HMR hanging
        await page.reload();
        await page.waitForLoadState('domcontentloaded');

        // Type phone number (input is type="text", not "tel")
        const phoneInput = page.locator('input[placeholder*="999"]');
        await expect(phoneInput).toBeVisible({ timeout: 15000 });
        await phoneInput.fill('+79991234567');

        // Intercept API response
        const responsePromise = page.waitForResponse(
            response => response.url().includes('/auth/request-otp'),
            { timeout: 15000 }
        ).catch(() => null);

        // Click "Получить код" button
        await page.click('button:has-text("Получить код")');
        
        // Wait for API response
        const apiResponse = await responsePromise;
        
        if (apiResponse) {
            console.log(`API Response: ${apiResponse.status()} ${apiResponse.url()}`);
            try {
                const body = await apiResponse.json();
                console.log('API Body:', JSON.stringify(body));
            } catch {
                console.log('API Body: (not JSON)');
            }
        } else {
            console.log('No API response captured for /auth/request-otp');
        }

        // Wait for navigation to OTP page with longer timeout
        try {
            await page.waitForURL('**/auth/otp**', { timeout: 15000 });
        } catch {
            console.log('Did not navigate to OTP page');
            console.log('Current URL:', page.url());
            console.log('Console logs:', consoleLogs.slice(-10).join('\n'));
            console.log('Network errors:', networkErrors.join('\n'));
            // Take screenshot for debugging
            await page.screenshot({ path: 'test-results/auth-debug.png' });
            throw new Error('Failed to navigate to OTP page');
        }

        // 2. OTP Screen - text is "Код доступа" in Russian
        await expect(page.locator('text=Код доступа')).toBeVisible({ timeout: 15000 });

        // Fill OTP (000000 for test users - 6 digits)
        // There are 6 individual inputs
        const otpInputs = page.locator('input[inputmode="numeric"]');
        await expect(otpInputs.first()).toBeVisible();
        
        // Type each digit
        for (let i = 0; i < 6; i++) {
            await otpInputs.nth(i).fill('0');
        }

        // Wait for redirect after OTP
        await page.waitForURL(/.*(discover|feed|profile|onboarding|\/)$/, { timeout: 20000 });
        
        // Verify we're logged in (not on auth pages)
        expect(page.url()).not.toContain('/auth');
    });
});
