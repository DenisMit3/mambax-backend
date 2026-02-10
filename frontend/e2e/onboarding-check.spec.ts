import { test, expect } from '@playwright/test';

test.describe('Onboarding Page Check', () => {
    test('should display name question on onboarding page', async ({ page }) => {
        // Переходим на production URL
        await page.goto('https://mambax-frontend.vercel.app/onboarding');
        
        // Ждем загрузки страницы
        await page.waitForLoadState('networkidle');
        
        // Делаем скриншот
        await page.screenshot({ path: 'test-results/onboarding-screenshot.png', fullPage: true });
        
        // Получаем содержимое страницы
        const pageContent = await page.content();
        console.log('=== PAGE TITLE ===');
        console.log(await page.title());
        
        console.log('=== PAGE URL ===');
        console.log(page.url());
        
        // Проверяем наличие текста "Как тебя зовут?"
        const nameQuestion = page.getByText('Как тебя зовут?');
        const hasNameQuestion = await nameQuestion.count() > 0;
        console.log('=== HAS NAME QUESTION ===');
        console.log(hasNameQuestion);
        
        // Получаем все видимые тексты на странице
        const bodyText = await page.locator('body').innerText();
        console.log('=== VISIBLE TEXT ON PAGE ===');
        console.log(bodyText.substring(0, 2000));
        
        // Проверяем консольные ошибки
        const consoleErrors: string[] = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });
        
        // Перезагружаем для сбора ошибок консоли
        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        
        console.log('=== CONSOLE ERRORS ===');
        console.log(consoleErrors.length > 0 ? consoleErrors.join('\n') : 'No errors');
        
        // Проверяем наличие input для имени
        const nameInput = page.locator('input[type="text"], input[name*="name"], input[placeholder*="имя"]');
        const inputCount = await nameInput.count();
        console.log('=== NAME INPUT FOUND ===');
        console.log(inputCount > 0);
    });
});
