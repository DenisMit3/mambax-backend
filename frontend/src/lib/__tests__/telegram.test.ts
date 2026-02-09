/**
 * Тесты для useTelegram hook
 * 
 * Покрытие:
 * - Инициализация Telegram WebApp
 * - Haptic feedback
 * - Проверка версии
 * - BackButton support
 */

import { renderHook, act } from '@testing-library/react';
import { useTelegram } from '../telegram';

// Mock Telegram WebApp
const createMockTelegramWebApp = (version = '6.1') => ({
    initData: 'mock_init_data',
    initDataUnsafe: {
        query_id: 'query123',
        user: {
            id: 123456,
            first_name: 'Test',
            last_name: 'User',
            username: 'testuser',
            language_code: 'ru',
            is_premium: true,
            photo_url: 'https://example.com/photo.jpg',
        },
        auth_date: Date.now(),
        hash: 'mock_hash',
        start_param: 'ref123',
    },
    version,
    ready: jest.fn(),
    expand: jest.fn(),
    close: jest.fn(),
    BackButton: {
        isVisible: false,
        show: jest.fn(),
        hide: jest.fn(),
        onClick: jest.fn(),
        offClick: jest.fn(),
    },
    MainButton: {
        text: '',
        color: '#000000',
        textColor: '#FFFFFF',
        isVisible: false,
        isActive: true,
        show: jest.fn(),
        hide: jest.fn(),
        enable: jest.fn(),
        disable: jest.fn(),
        onClick: jest.fn(),
        offClick: jest.fn(),
        showProgress: jest.fn(),
        hideProgress: jest.fn(),
        setParams: jest.fn(),
    },
    HapticFeedback: {
        impactOccurred: jest.fn(),
        notificationOccurred: jest.fn(),
        selectionChanged: jest.fn(),
    },
    themeParams: {
        bg_color: '#0A0A0B',
        text_color: '#FFFFFF',
        hint_color: '#999999',
        link_color: '#2481cc',
        button_color: '#2481cc',
        button_text_color: '#FFFFFF',
        secondary_bg_color: '#1c1c1e',
    },
    colorScheme: 'dark' as const,
    viewportHeight: 600,
    viewportStableHeight: 580,
    isExpanded: true,
    CloudStorage: {
        setItem: jest.fn(),
        getItem: jest.fn(),
        getItems: jest.fn(),
        removeItem: jest.fn(),
    },
});

describe('useTelegram', () => {
    const originalWindow = global.window;
    let mockWebApp: ReturnType<typeof createMockTelegramWebApp>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockWebApp = createMockTelegramWebApp();
        
        // Reset the initialization flag
        jest.resetModules();
        
        // Setup window.Telegram
        (global as any).window = {
            ...originalWindow,
            Telegram: {
                WebApp: mockWebApp,
            },
        };
        
        // Mock document
        document.documentElement.style.setProperty = jest.fn();
    });

    afterEach(() => {
        (global as any).window = originalWindow;
    });

    // ==========================================
    // ИНИЦИАЛИЗАЦИЯ
    // ==========================================

    describe('Инициализация', () => {
        it('возвращает webApp объект когда Telegram доступен', async () => {
            const { useTelegram: freshHook } = await import('../telegram');
            const { result } = renderHook(() => freshHook());

            expect(result.current.webApp).toBeDefined();
            expect(result.current.isReady).toBe(true);
        });

        it('вызывает ready() и expand() при инициализации', async () => {
            const { useTelegram: freshHook } = await import('../telegram');
            renderHook(() => freshHook());

            expect(mockWebApp.ready).toHaveBeenCalled();
            expect(mockWebApp.expand).toHaveBeenCalled();
        });

        it('устанавливает CSS переменные темы', async () => {
            const { useTelegram: freshHook } = await import('../telegram');
            renderHook(() => freshHook());

            expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
                '--tg-theme-bg-color',
                '#0A0A0B'
            );
            expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
                '--tg-theme-text-color',
                '#FFFFFF'
            );
        });

        it('возвращает null webApp когда Telegram недоступен', async () => {
            (global as any).window = { ...originalWindow };
            delete (global as any).window.Telegram;

            const { useTelegram: freshHook } = await import('../telegram');
            const { result } = renderHook(() => freshHook());

            expect(result.current.webApp).toBeNull();
            expect(result.current.isReady).toBe(false);
        });

        it('не вызывает ready/expand повторно при ремаунте', async () => {
            const { useTelegram: freshHook } = await import('../telegram');
            
            const { unmount } = renderHook(() => freshHook());
            unmount();
            
            // Второй рендер
            renderHook(() => freshHook());

            // ready и expand должны быть вызваны только один раз
            expect(mockWebApp.ready).toHaveBeenCalledTimes(1);
            expect(mockWebApp.expand).toHaveBeenCalledTimes(1);
        });
    });

    // ==========================================
    // ДАННЫЕ ПОЛЬЗОВАТЕЛЯ
    // ==========================================

    describe('Данные пользователя', () => {
        it('возвращает данные пользователя', async () => {
            const { useTelegram: freshHook } = await import('../telegram');
            const { result } = renderHook(() => freshHook());

            expect(result.current.user).toEqual({
                id: 123456,
                first_name: 'Test',
                last_name: 'User',
                username: 'testuser',
                language_code: 'ru',
                is_premium: true,
                photo_url: 'https://example.com/photo.jpg',
            });
        });

        it('возвращает initData', async () => {
            const { useTelegram: freshHook } = await import('../telegram');
            const { result } = renderHook(() => freshHook());

            expect(result.current.initData).toBe('mock_init_data');
        });

        it('возвращает версию WebApp', async () => {
            const { useTelegram: freshHook } = await import('../telegram');
            const { result } = renderHook(() => freshHook());

            expect(result.current.version).toBe('6.1');
        });
    });

    // ==========================================
    // HAPTIC FEEDBACK
    // ==========================================

    describe('Haptic Feedback', () => {
        it('вызывает impactOccurred с правильным стилем', async () => {
            const { useTelegram: freshHook } = await import('../telegram');
            const { result } = renderHook(() => freshHook());

            result.current.hapticFeedback.light();
            expect(mockWebApp.HapticFeedback.impactOccurred).toHaveBeenCalledWith('light');

            result.current.hapticFeedback.medium();
            expect(mockWebApp.HapticFeedback.impactOccurred).toHaveBeenCalledWith('medium');

            result.current.hapticFeedback.heavy();
            expect(mockWebApp.HapticFeedback.impactOccurred).toHaveBeenCalledWith('heavy');
        });

        it('вызывает notificationOccurred с правильным типом', async () => {
            const { useTelegram: freshHook } = await import('../telegram');
            const { result } = renderHook(() => freshHook());

            result.current.hapticFeedback.success();
            expect(mockWebApp.HapticFeedback.notificationOccurred).toHaveBeenCalledWith('success');

            result.current.hapticFeedback.error();
            expect(mockWebApp.HapticFeedback.notificationOccurred).toHaveBeenCalledWith('error');
        });

        it('вызывает selectionChanged', async () => {
            const { useTelegram: freshHook } = await import('../telegram');
            const { result } = renderHook(() => freshHook());

            result.current.hapticFeedback.selection();
            expect(mockWebApp.HapticFeedback.selectionChanged).toHaveBeenCalled();
        });

        it('не падает если webApp недоступен', async () => {
            (global as any).window = { ...originalWindow };
            delete (global as any).window.Telegram;

            const { useTelegram: freshHook } = await import('../telegram');
            const { result } = renderHook(() => freshHook());

            // Не должно выбрасывать ошибку
            expect(() => result.current.hapticFeedback.light()).not.toThrow();
            expect(() => result.current.hapticFeedback.success()).not.toThrow();
        });
    });

    // ==========================================
    // ПРОВЕРКА ВЕРСИИ
    // ==========================================

    describe('Проверка версии', () => {
        it('isVersionAtLeast возвращает true для текущей версии', async () => {
            const { useTelegram: freshHook } = await import('../telegram');
            const { result } = renderHook(() => freshHook());

            expect(result.current.isVersionAtLeast('6.1')).toBe(true);
            expect(result.current.isVersionAtLeast('6.0')).toBe(true);
            expect(result.current.isVersionAtLeast('5.0')).toBe(true);
        });

        it('isVersionAtLeast возвращает false для более новой версии', async () => {
            const { useTelegram: freshHook } = await import('../telegram');
            const { result } = renderHook(() => freshHook());

            expect(result.current.isVersionAtLeast('6.2')).toBe(false);
            expect(result.current.isVersionAtLeast('7.0')).toBe(false);
        });

        it('isVersionAtLeast возвращает false если webApp недоступен', async () => {
            (global as any).window = { ...originalWindow };
            delete (global as any).window.Telegram;

            const { useTelegram: freshHook } = await import('../telegram');
            const { result } = renderHook(() => freshHook());

            expect(result.current.isVersionAtLeast('6.0')).toBe(false);
        });

        it('supportsBackButton возвращает true для версии 6.1+', async () => {
            const { useTelegram: freshHook } = await import('../telegram');
            const { result } = renderHook(() => freshHook());

            expect(result.current.supportsBackButton).toBe(true);
        });

        it('supportsBackButton возвращает false для версии < 6.1', async () => {
            mockWebApp = createMockTelegramWebApp('6.0');
            (global as any).window.Telegram.WebApp = mockWebApp;

            const { useTelegram: freshHook } = await import('../telegram');
            const { result } = renderHook(() => freshHook());

            expect(result.current.supportsBackButton).toBe(false);
        });
    });

    // ==========================================
    // EDGE CASES
    // ==========================================

    describe('Edge cases', () => {
        it('обрабатывает отсутствие themeParams', async () => {
            mockWebApp.themeParams = {};
            (global as any).window.Telegram.WebApp = mockWebApp;

            const { useTelegram: freshHook } = await import('../telegram');
            
            // Не должно падать
            expect(() => renderHook(() => freshHook())).not.toThrow();

            // Должны использоваться дефолтные значения
            expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
                '--tg-theme-bg-color',
                '#0A0A0B' // default
            );
        });

        it('обрабатывает отсутствие user в initDataUnsafe', async () => {
            mockWebApp.initDataUnsafe = {
                auth_date: Date.now(),
                hash: 'mock_hash',
            };
            (global as any).window.Telegram.WebApp = mockWebApp;

            const { useTelegram: freshHook } = await import('../telegram');
            const { result } = renderHook(() => freshHook());

            expect(result.current.user).toBeUndefined();
        });

        it('корректно сравнивает версии с разным количеством частей', async () => {
            mockWebApp = createMockTelegramWebApp('6.1.2');
            (global as any).window.Telegram.WebApp = mockWebApp;

            const { useTelegram: freshHook } = await import('../telegram');
            const { result } = renderHook(() => freshHook());

            expect(result.current.isVersionAtLeast('6.1')).toBe(true);
            expect(result.current.isVersionAtLeast('6.1.2')).toBe(true);
            expect(result.current.isVersionAtLeast('6.1.3')).toBe(false);
        });
    });
});
