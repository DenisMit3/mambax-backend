/**
 * Тесты для компонента авторизации AuthGatePage
 * 
 * Покрытие:
 * - Рендеринг UI элементов
 * - Вход через Telegram (Mini App и внешний браузер)
 * - Вход по номеру телефона (OTP)
 * - Edge cases и обработка ошибок
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Мокаем зависимости ДО импорта компонента
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
}));

jest.mock('@/services/api', () => ({
    authService: {
        telegramLogin: jest.fn(),
        requestOtp: jest.fn(),
    },
}));

jest.mock('@/lib/telegram', () => ({
    useTelegram: jest.fn(),
}));

// Импортируем после моков
import AuthGatePage from '../page';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/api';
import { useTelegram } from '@/lib/telegram';

// Типизация моков
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseTelegram = useTelegram as jest.MockedFunction<typeof useTelegram>;
const mockAuthService = authService as jest.Mocked<typeof authService>;

describe('AuthGatePage', () => {
    // Общие моки для всех тестов
    const mockPush = jest.fn();
    const mockReplace = jest.fn();

    beforeEach(() => {
        // Сброс всех моков перед каждым тестом
        jest.clearAllMocks();
        localStorage.clear();

        // Дефолтная настройка роутера
        mockUseRouter.mockReturnValue({
            push: mockPush,
            replace: mockReplace,
            back: jest.fn(),
            forward: jest.fn(),
            refresh: jest.fn(),
            prefetch: jest.fn(),
        });

        // Дефолтная настройка Telegram (не в Mini App)
        mockUseTelegram.mockReturnValue({
            webApp: null,
            hapticFeedback: {
                light: jest.fn(),
                medium: jest.fn(),
                heavy: jest.fn(),
                success: jest.fn(),
                error: jest.fn(),
                selection: jest.fn(),
                impactOccurred: jest.fn(),
                notificationOccurred: jest.fn(),
            },
            user: undefined,
            initData: undefined,
            isReady: false,
        });

        // Мок window.open для внешних ссылок
        window.open = jest.fn();

        // Мок alert
        window.alert = jest.fn();
    });

    // ==========================================
    // ТЕСТЫ РЕНДЕРИНГА UI
    // ==========================================

    describe('Рендеринг UI', () => {
        it('должен отображать логотип и название приложения', () => {
            render(<AuthGatePage />);

            expect(screen.getByText('YouMe')).toBeInTheDocument();
            expect(screen.getByText('Знакомства нового поколения')).toBeInTheDocument();
        });

        it('должен отображать кнопку входа через Telegram', () => {
            render(<AuthGatePage />);

            const telegramButton = screen.getByRole('button', { name: /войти через telegram/i });
            expect(telegramButton).toBeInTheDocument();
            expect(telegramButton).not.toBeDisabled();
        });

        it('должен отображать форму входа по номеру телефона', () => {
            render(<AuthGatePage />);

            expect(screen.getByText('Вход по номеру')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('+7 999 000-00-00')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /получить код/i })).toBeInTheDocument();
        });

        it('должен отображать разделитель "ИЛИ"', () => {
            render(<AuthGatePage />);

            expect(screen.getByText('ИЛИ')).toBeInTheDocument();
        });

        it('кнопка "Получить код" должна быть отключена при пустом поле', () => {
            render(<AuthGatePage />);

            const submitButton = screen.getByRole('button', { name: /получить код/i });
            expect(submitButton).toBeDisabled();
        });
    });

    // ==========================================
    // ТЕСТЫ ВХОДА ЧЕРЕЗ TELEGRAM
    // ==========================================

    describe('Вход через Telegram', () => {
        it('должен открывать бота в новой вкладке, если не в Mini App', async () => {
            render(<AuthGatePage />);

            const telegramButton = screen.getByRole('button', { name: /войти через telegram/i });
            await userEvent.click(telegramButton);

            expect(window.open).toHaveBeenCalledWith(
                'https://t.me/YouMeMeet_bot',
                '_blank'
            );
        });

        it('должен выполнять автоматический вход при наличии initData', async () => {
            const mockInitData = 'query_id=AAHdF6IQAAAAAN0XohDhrOrc&user=%7B%22id%22%3A123456789%7D';

            mockUseTelegram.mockReturnValue({
                webApp: null,
                hapticFeedback: {} as any,
                user: { id: 123456789, first_name: 'Test' } as any,
                initData: mockInitData,
                isReady: true,
            });

            mockAuthService.telegramLogin.mockResolvedValueOnce({
                access_token: 'test-token',
                token_type: 'bearer',
                has_profile: true,
                is_new_user: false,
            });

            render(<AuthGatePage />);

            await waitFor(() => {
                expect(mockAuthService.telegramLogin).toHaveBeenCalledWith(mockInitData);
            });

            await waitFor(() => {
                expect(mockReplace).toHaveBeenCalledWith('/');
            });
        });

        it('должен перенаправлять на onboarding для нового пользователя', async () => {
            const mockInitData = 'valid_init_data_string';

            mockUseTelegram.mockReturnValue({
                webApp: null,
                hapticFeedback: {} as any,
                user: { id: 123456789, first_name: 'Test' } as any,
                initData: mockInitData,
                isReady: true,
            });

            mockAuthService.telegramLogin.mockResolvedValueOnce({
                access_token: 'test-token',
                token_type: 'bearer',
                has_profile: false, // Новый пользователь без профиля
                is_new_user: true,
            });

            render(<AuthGatePage />);

            await waitFor(() => {
                expect(mockReplace).toHaveBeenCalledWith('/onboarding');
            });
        });

        it('должен пропускать автовход если токен уже существует', async () => {
            localStorage.setItem('accessToken', 'existing-token');

            mockUseTelegram.mockReturnValue({
                webApp: null,
                hapticFeedback: {} as any,
                user: { id: 123456789, first_name: 'Test' } as any,
                initData: 'some_init_data',
                isReady: true,
            });

            render(<AuthGatePage />);

            await waitFor(() => {
                expect(mockReplace).toHaveBeenCalledWith('/');
            });

            // telegramLogin НЕ должен вызываться
            expect(mockAuthService.telegramLogin).not.toHaveBeenCalled();
        });

        it('должен обрабатывать ошибку Telegram логина', async () => {
            const mockInitData = 'invalid_init_data';
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            // Важно: мок должен быть настроен ДО рендера
            mockAuthService.telegramLogin.mockRejectedValue(new Error('Invalid init data'));

            mockUseTelegram.mockReturnValue({
                webApp: null,
                hapticFeedback: {} as any,
                user: undefined,
                initData: mockInitData,
                isReady: true,
            });

            render(<AuthGatePage />);

            await waitFor(() => {
                expect(mockAuthService.telegramLogin).toHaveBeenCalled();
            });

            // Кнопка должна снова стать активной после ошибки
            await waitFor(() => {
                const telegramButton = screen.getByRole('button', { name: /войти через telegram/i });
                expect(telegramButton).not.toBeDisabled();
            });

            consoleSpy.mockRestore();
        });

        it('должен выполнять вход по клику на кнопку Telegram внутри Mini App', async () => {
            const mockInitData = 'valid_init_data_from_button';

            // Симулируем наличие Telegram WebApp в window
            (window as any).Telegram = {
                WebApp: {
                    initData: mockInitData,
                },
            };

            mockUseTelegram.mockReturnValue({
                webApp: null,
                hapticFeedback: {} as any,
                user: undefined,
                initData: undefined, // Hook еще не инициализирован
                isReady: false,
            });

            mockAuthService.telegramLogin.mockResolvedValueOnce({
                access_token: 'test-token',
                token_type: 'bearer',
                has_profile: true,
                is_new_user: false,
            });

            render(<AuthGatePage />);

            const telegramButton = screen.getByRole('button', { name: /войти через telegram/i });
            await userEvent.click(telegramButton);

            await waitFor(() => {
                expect(mockAuthService.telegramLogin).toHaveBeenCalledWith(mockInitData);
            });

            // Очистка
            delete (window as any).Telegram;
        });
    });

    // ==========================================
    // ТЕСТЫ ВХОДА ПО НОМЕРУ ТЕЛЕФОНА
    // ==========================================

    describe('Вход по номеру телефона', () => {
        it('должен активировать кнопку при вводе номера (минимум 3 символа)', async () => {
            render(<AuthGatePage />);

            const input = screen.getByPlaceholderText('+7 999 000-00-00');
            const submitButton = screen.getByRole('button', { name: /получить код/i });

            // Изначально отключена
            expect(submitButton).toBeDisabled();

            // Вводим 2 символа - все еще отключена
            await userEvent.type(input, '+7');
            expect(submitButton).toBeDisabled();

            // Вводим 3+ символа - активна
            await userEvent.type(input, '9');
            expect(submitButton).not.toBeDisabled();
        });

        it('должен отправлять запрос OTP и перенаправлять на страницу ввода кода', async () => {
            mockAuthService.requestOtp.mockResolvedValueOnce({ status: 'ok' });

            render(<AuthGatePage />);

            const input = screen.getByPlaceholderText('+7 999 000-00-00');
            const submitButton = screen.getByRole('button', { name: /получить код/i });

            await userEvent.type(input, '+79991234567');
            await userEvent.click(submitButton);

            await waitFor(() => {
                expect(mockAuthService.requestOtp).toHaveBeenCalledWith('+79991234567');
            });

            await waitFor(() => {
                expect(mockPush).toHaveBeenCalledWith('/auth/otp?phone=%2B79991234567');
            });
        });

        it('не должен показывать OTP в alert (SEC-001 fix)', async () => {
            // SEC-001: OTP no longer returned in response
            mockAuthService.requestOtp.mockResolvedValueOnce({
                success: true,
                message: 'OTP generated (Demo mode - check server logs).',
            });

            render(<AuthGatePage />);

            const input = screen.getByPlaceholderText('+7 999 000-00-00');
            await userEvent.type(input, '+79991234567');

            const form = input.closest('form')!;
            fireEvent.submit(form);

            await waitFor(() => {
                // Should NOT show OTP in alert anymore
                expect(window.alert).not.toHaveBeenCalled();
            });
        });

        it('должен показывать ошибку при неудачном запросе OTP', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            mockAuthService.requestOtp.mockRejectedValueOnce(new Error('Слишком много запросов'));

            render(<AuthGatePage />);

            const input = screen.getByPlaceholderText('+7 999 000-00-00');
            await userEvent.type(input, '+79991234567');

            const form = input.closest('form')!;
            fireEvent.submit(form);

            await waitFor(() => {
                expect(window.alert).toHaveBeenCalledWith('Слишком много запросов');
            });

            consoleSpy.mockRestore();
        });

        it('должен показывать спиннер во время загрузки', async () => {
            // Создаем промис, который не резолвится сразу
            let resolveOtp: (value: any) => void;
            const otpPromise = new Promise((resolve) => {
                resolveOtp = resolve;
            });
            mockAuthService.requestOtp.mockReturnValueOnce(otpPromise as any);

            render(<AuthGatePage />);

            const input = screen.getByPlaceholderText('+7 999 000-00-00');
            await userEvent.type(input, '+79991234567');

            const form = input.closest('form')!;
            fireEvent.submit(form);

            // Проверяем что кнопка показывает спиннер (текст "Получить код" исчезает)
            await waitFor(() => {
                const submitButton = screen.getByRole('button', { name: '' });
                expect(submitButton).toBeDisabled();
            });

            // Резолвим промис
            await act(async () => {
                resolveOtp!({ status: 'ok' });
            });
        });

        it('не должен отправлять форму при коротком номере', async () => {
            render(<AuthGatePage />);

            const input = screen.getByPlaceholderText('+7 999 000-00-00');
            await userEvent.type(input, '+7');

            const form = input.closest('form')!;
            fireEvent.submit(form);

            expect(mockAuthService.requestOtp).not.toHaveBeenCalled();
        });
    });

    // ==========================================
    // EDGE CASES
    // ==========================================

    describe('Edge Cases', () => {
        it('должен предотвращать двойной клик на кнопку Telegram', async () => {
            const mockInitData = 'valid_init_data';

            (window as any).Telegram = {
                WebApp: { initData: mockInitData },
            };

            // Создаем промис который не резолвится сразу
            let resolveLogin: (value: any) => void;
            const loginPromise = new Promise((resolve) => {
                resolveLogin = resolve;
            });
            mockAuthService.telegramLogin.mockReturnValueOnce(loginPromise as any);

            render(<AuthGatePage />);

            const telegramButton = screen.getByRole('button', { name: /войти через telegram/i });

            // Первый клик
            await userEvent.click(telegramButton);

            // Второй клик (должен быть проигнорирован)
            await userEvent.click(telegramButton);

            // Должен быть только один вызов
            expect(mockAuthService.telegramLogin).toHaveBeenCalledTimes(1);

            // Очистка
            await act(async () => {
                resolveLogin!({ access_token: 'token', has_profile: true, token_type: 'bearer', is_new_user: false });
            });

            delete (window as any).Telegram;
        });

        it('должен корректно обрабатывать пустой initData', async () => {
            mockUseTelegram.mockReturnValue({
                webApp: null,
                hapticFeedback: {} as any,
                user: undefined,
                initData: '', // Пустая строка
                isReady: true,
            });

            render(<AuthGatePage />);

            // Не должен пытаться логиниться с пустым initData
            expect(mockAuthService.telegramLogin).not.toHaveBeenCalled();
        });

        it('должен показывать подсказку для Mini App', () => {
            mockUseTelegram.mockReturnValue({
                webApp: null,
                hapticFeedback: {} as any,
                user: undefined,
                initData: 'some_init_data',
                isReady: false,
            });

            render(<AuthGatePage />);

            expect(screen.getByText(/после входа откроется анкета или главная/i)).toBeInTheDocument();
        });

        it('должен показывать подсказку для внешнего браузера', () => {
            mockUseTelegram.mockReturnValue({
                webApp: null,
                hapticFeedback: {} as any,
                user: undefined,
                initData: undefined,
                isReady: false,
            });

            render(<AuthGatePage />);

            expect(screen.getByText(/нажмите кнопку, чтобы открыть бота/i)).toBeInTheDocument();
        });

        it('должен обрабатывать ошибку без message', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            mockAuthService.requestOtp.mockRejectedValueOnce({}); // Ошибка без message

            render(<AuthGatePage />);

            const input = screen.getByPlaceholderText('+7 999 000-00-00');
            await userEvent.type(input, '+79991234567');

            const form = input.closest('form')!;
            fireEvent.submit(form);

            await waitFor(() => {
                expect(window.alert).toHaveBeenCalledWith('Ошибка входа');
            });

            consoleSpy.mockRestore();
        });
    });

    // ==========================================
    // ACCESSIBILITY
    // ==========================================

    describe('Accessibility', () => {
        it('форма должна быть доступна для отправки по Enter', async () => {
            mockAuthService.requestOtp.mockResolvedValueOnce({ status: 'ok' });

            render(<AuthGatePage />);

            const input = screen.getByPlaceholderText('+7 999 000-00-00');
            await userEvent.type(input, '+79991234567{enter}');

            await waitFor(() => {
                expect(mockAuthService.requestOtp).toHaveBeenCalled();
            });
        });

        it('все интерактивные элементы должны быть фокусируемыми', () => {
            render(<AuthGatePage />);

            const telegramButton = screen.getByRole('button', { name: /войти через telegram/i });
            const phoneInput = screen.getByPlaceholderText('+7 999 000-00-00');
            const submitButton = screen.getByRole('button', { name: /получить код/i });

            expect(telegramButton).not.toHaveAttribute('tabindex', '-1');
            expect(phoneInput).not.toHaveAttribute('tabindex', '-1');
            expect(submitButton).not.toHaveAttribute('tabindex', '-1');
        });
    });
});
