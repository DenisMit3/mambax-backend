/**
 * Тесты для сервисов авторизации и HTTP клиента
 * 
 * Покрытие:
 * - authService: telegramLogin, requestOtp, login, adminLogin
 * - httpClient: request, get, post, setToken, clearToken, logout
 * - Edge cases: 401, ошибки сети, FormData, silent режим
 */

// Мокаем env ДО импорта модулей
jest.mock('@/utils/env', () => ({
    getApiUrl: jest.fn(() => 'http://test-api'),
    isServer: false,
    isDev: true,
}));

// Мокаем Sentry
jest.mock('@sentry/nextjs', () => ({
    captureException: jest.fn(),
}));

import { authService } from '../api';
import { httpClient } from '@/lib/http-client';
import * as Sentry from '@sentry/nextjs';

const API_URL = 'http://test-api';

// Сохраняем оригинальный fetch
const originalFetch = global.fetch;

describe('HttpClient', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
        httpClient.clearToken();
        
        // Мокаем fetch
        global.fetch = jest.fn();
        
        // Мокаем console методы
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(console, 'debug').mockImplementation(() => {});
    });

    afterEach(() => {
        global.fetch = originalFetch;
        jest.restoreAllMocks();
    });

    // ==========================================
    // БАЗОВЫЕ HTTP МЕТОДЫ
    // ==========================================

    describe('Базовые HTTP методы', () => {
        it('GET запрос должен отправляться корректно', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ data: 'test' }),
            });

            const result = await httpClient.get('/test');

            expect(result).toEqual({ data: 'test' });
            expect(global.fetch).toHaveBeenCalledWith(
                `${API_URL}/test`,
                expect.objectContaining({
                    method: 'GET',
                    headers: expect.any(Headers),
                })
            );
        });

        it('POST запрос должен отправлять JSON body', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ success: true }),
            });

            const result = await httpClient.post('/test', { name: 'John' });

            expect(result).toEqual({ success: true });
            expect(global.fetch).toHaveBeenCalledWith(
                `${API_URL}/test`,
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ name: 'John' }),
                })
            );
        });

        it('PUT запрос должен работать корректно', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ updated: true }),
            });

            const result = await httpClient.put('/users/1', { name: 'Jane' });

            expect(result).toEqual({ updated: true });
            expect(global.fetch).toHaveBeenCalledWith(
                `${API_URL}/users/1`,
                expect.objectContaining({
                    method: 'PUT',
                    body: JSON.stringify({ name: 'Jane' }),
                })
            );
        });

        it('PATCH запрос должен работать корректно', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ patched: true }),
            });

            const result = await httpClient.patch('/users/1', { bio: 'Updated' });

            expect(result).toEqual({ patched: true });
            expect(global.fetch).toHaveBeenCalledWith(
                `${API_URL}/users/1`,
                expect.objectContaining({
                    method: 'PATCH',
                })
            );
        });

        it('DELETE запрос должен работать корректно', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ deleted: true }),
            });

            const result = await httpClient.delete('/users/1');

            expect(result).toEqual({ deleted: true });
            expect(global.fetch).toHaveBeenCalledWith(
                `${API_URL}/users/1`,
                expect.objectContaining({
                    method: 'DELETE',
                })
            );
        });

        it('должен обрабатывать 204 No Content', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                status: 204,
            });

            const result = await httpClient.delete('/users/1');

            expect(result).toEqual({});
        });
    });

    // ==========================================
    // АВТОРИЗАЦИЯ И ТОКЕНЫ
    // ==========================================

    describe('Авторизация и токены', () => {
        it('должен добавлять Authorization header при наличии токена', async () => {
            httpClient.setToken('test-token-123');

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ data: 'protected' }),
            });

            await httpClient.get('/protected');

            // Проверяем что fetch был вызван с Headers содержащим Authorization
            const callArgs = (global.fetch as jest.Mock).mock.calls[0];
            const headers = callArgs[1].headers as Headers;
            expect(headers.get('Authorization')).toBe('Bearer test-token-123');
        });

        it('должен пропускать Authorization при skipAuth: true', async () => {
            httpClient.setToken('test-token-123');

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ data: 'public' }),
            });

            await httpClient.get('/public', { skipAuth: true });

            const callArgs = (global.fetch as jest.Mock).mock.calls[0];
            const headers = callArgs[1].headers as Headers;
            expect(headers.get('Authorization')).toBeNull();
        });

        it('setToken должен сохранять токен в localStorage', () => {
            httpClient.setToken('my-token');

            expect(localStorage.getItem('accessToken')).toBe('my-token');
            // Legacy ключ должен быть удален
            expect(localStorage.getItem('token')).toBeNull();
        });

        it('clearToken должен удалять токен из localStorage', () => {
            localStorage.setItem('accessToken', 'old-token');
            localStorage.setItem('token', 'legacy-token');

            httpClient.clearToken();

            expect(localStorage.getItem('accessToken')).toBeNull();
            expect(localStorage.getItem('token')).toBeNull();
        });

        it('isAuthenticated должен возвращать true при наличии токена', () => {
            expect(httpClient.isAuthenticated()).toBe(false);

            httpClient.setToken('token');
            expect(httpClient.isAuthenticated()).toBe(true);

            httpClient.clearToken();
            expect(httpClient.isAuthenticated()).toBe(false);
        });

        it('должен читать токен из localStorage (accessToken приоритет)', () => {
            localStorage.setItem('accessToken', 'new-token');
            localStorage.setItem('token', 'old-token');

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({}),
            });

            httpClient.get('/test');

            const callArgs = (global.fetch as jest.Mock).mock.calls[0];
            const headers = callArgs[1].headers as Headers;
            expect(headers.get('Authorization')).toBe('Bearer new-token');
        });

        it('должен использовать legacy token если accessToken отсутствует', () => {
            localStorage.setItem('token', 'legacy-token');

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({}),
            });

            httpClient.get('/test');

            const callArgs = (global.fetch as jest.Mock).mock.calls[0];
            const headers = callArgs[1].headers as Headers;
            expect(headers.get('Authorization')).toBe('Bearer legacy-token');
        });
    });

    // ==========================================
    // ОБРАБОТКА ОШИБОК
    // ==========================================

    describe('Обработка ошибок', () => {
        it('должен выбрасывать ошибку при 401 и очищать токен', async () => {
            localStorage.setItem('accessToken', 'expired-token');

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 401,
                json: async () => ({ detail: 'Token expired' }),
            });

            // В jsdom нельзя переопределить window.location, поэтому проверяем только:
            // 1. Ошибка выбрасывается
            // 2. Токен очищается
            // 3. console.warn вызывается с сообщением о редиректе
            await expect(httpClient.get('/protected')).rejects.toThrow('Unauthorized');

            expect(localStorage.getItem('accessToken')).toBeNull();
            expect(localStorage.getItem('token')).toBeNull();
            expect(console.warn).toHaveBeenCalledWith(
                'Unauthorized access detected. Clearing token and redirecting.'
            );
        });

        it('должен выбрасывать ошибку с detail из ответа', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 400,
                json: async () => ({ detail: 'Invalid phone number' }),
            });

            await expect(httpClient.post('/auth/request-otp', {})).rejects.toThrow('Invalid phone number');
        });

        it('должен выбрасывать ошибку с message из ответа', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 422,
                json: async () => ({ message: 'Validation failed' }),
            });

            await expect(httpClient.post('/test', {})).rejects.toThrow('Validation failed');
        });

        it('должен выбрасывать дефолтную ошибку если нет detail/message', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 500,
                json: async () => ({}),
            });

            await expect(httpClient.get('/test')).rejects.toThrow('Request failed');
        });

        it('должен обрабатывать ошибку парсинга JSON в ответе', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 500,
                json: async () => { throw new Error('Invalid JSON'); },
            });

            await expect(httpClient.get('/test')).rejects.toThrow('Request failed');
        });

        it('silent режим должен подавлять логирование ошибок', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 404,
                json: async () => ({ detail: 'Not found' }),
            });

            await expect(httpClient.get('/test', { silent: true })).rejects.toThrow('Not found');

            // В silent режиме не должно быть warn/error логов
            expect(console.warn).not.toHaveBeenCalled();
            expect(console.error).not.toHaveBeenCalled();
        });

        it('должен добавлять status и data к объекту ошибки', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 422,
                json: async () => ({ detail: 'Validation error', errors: ['field1'] }),
            });

            try {
                await httpClient.post('/test', {});
                fail('Should have thrown');
            } catch (error: any) {
                expect(error.status).toBe(422);
                expect(error.data).toEqual({ detail: 'Validation error', errors: ['field1'] });
            }
        });
    });

    // ==========================================
    // FORMDATA
    // ==========================================

    describe('FormData', () => {
        it('не должен устанавливать Content-Type для FormData', async () => {
            const formData = new FormData();
            formData.append('file', new Blob(['test']), 'test.txt');

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ uploaded: true }),
            });

            await httpClient.post('/upload', formData);

            const callArgs = (global.fetch as jest.Mock).mock.calls[0];
            const headers = callArgs[1].headers as Headers;
            
            // Content-Type НЕ должен быть установлен (браузер сам добавит с boundary)
            expect(headers.get('Content-Type')).toBeNull();
            
            // Body должен быть FormData, а не JSON
            expect(callArgs[1].body).toBe(formData);
        });
    });

    // ==========================================
    // LOGOUT
    // ==========================================

    describe('Logout', () => {
        it('logout должен очищать токен', () => {
            httpClient.setToken('token');
            
            expect(localStorage.getItem('accessToken')).toBe('token');
            expect(httpClient.isAuthenticated()).toBe(true);

            httpClient.logout();

            expect(localStorage.getItem('accessToken')).toBeNull();
            expect(localStorage.getItem('token')).toBeNull();
            expect(httpClient.isAuthenticated()).toBe(false);
            // Примечание: редирект на /auth/phone происходит через window.location.href,
            // что нельзя протестировать в jsdom без сложных workarounds
        });
    });
});

// ==========================================
// AUTH SERVICE TESTS
// ==========================================

describe('authService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
        httpClient.clearToken();
        global.fetch = jest.fn();
        
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        global.fetch = originalFetch;
        jest.restoreAllMocks();
    });

    // ==========================================
    // TELEGRAM LOGIN
    // ==========================================

    describe('telegramLogin', () => {
        it('должен отправлять init_data и сохранять токен', async () => {
            const mockResponse = {
                access_token: 'tg-token-123',
                token_type: 'bearer',
                has_profile: true,
                is_new_user: false,
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => mockResponse,
            });

            const result = await authService.telegramLogin('valid_init_data_string');

            expect(result).toEqual(mockResponse);
            expect(localStorage.getItem('accessToken')).toBe('tg-token-123');

            // Проверяем что запрос был с skipAuth
            expect(global.fetch).toHaveBeenCalledWith(
                `${API_URL}/auth/telegram`,
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ init_data: 'valid_init_data_string' }),
                })
            );
        });

        it('должен возвращать has_profile: false для нового пользователя', async () => {
            const mockResponse = {
                access_token: 'new-user-token',
                token_type: 'bearer',
                has_profile: false,
                is_new_user: true,
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => mockResponse,
            });

            const result = await authService.telegramLogin('new_user_init_data');

            expect(result.has_profile).toBe(false);
            expect(result.is_new_user).toBe(true);
        });

        it('должен выбрасывать ошибку при невалидном init_data', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 401,
                json: async () => ({ detail: 'Invalid Telegram data' }),
            });

            // Мокаем window.location для handleUnauthorized
            const originalLocation = window.location;
            delete (window as any).location;
            window.location = { href: '' } as any;

            await expect(authService.telegramLogin('invalid_data')).rejects.toThrow();

            window.location = originalLocation;
        });
    });

    // ==========================================
    // REQUEST OTP
    // ==========================================

    describe('requestOtp', () => {
        it('должен отправлять номер телефона', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ status: 'ok' }),
            });

            const result = await authService.requestOtp('+79991234567');

            expect(result).toEqual({ status: 'ok' });
            expect(global.fetch).toHaveBeenCalledWith(
                `${API_URL}/auth/request-otp`,
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ identifier: '+79991234567' }),
                })
            );
        });

        it('не должен возвращать debug_otp в ответе (SEC-001)', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ success: true, message: 'OTP generated (Demo mode - check server logs).' }),
            });

            const result = await authService.requestOtp('+79991234567');

            // SEC-001: OTP should NOT be in response
            expect(result).not.toHaveProperty('debug_otp');
            expect(result).toEqual({ success: true, message: 'OTP generated (Demo mode - check server logs).' });
        });

        it('должен обрабатывать rate limiting', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 429,
                json: async () => ({ detail: 'Too many requests. Try again later.' }),
            });

            await expect(authService.requestOtp('+79991234567')).rejects.toThrow('Too many requests');
        });

        it('должен обрабатывать невалидный номер', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 400,
                json: async () => ({ detail: 'Invalid phone number format' }),
            });

            await expect(authService.requestOtp('invalid')).rejects.toThrow('Invalid phone number format');
        });
    });

    // ==========================================
    // LOGIN (OTP)
    // ==========================================

    describe('login', () => {
        it('должен отправлять phone и otp, сохранять токен', async () => {
            const mockResponse = {
                access_token: 'otp-token-456',
                token_type: 'bearer',
                has_profile: true,
                is_new_user: false,
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => mockResponse,
            });

            const result = await authService.login('+79991234567', '123456');

            expect(result).toEqual(mockResponse);
            expect(localStorage.getItem('accessToken')).toBe('otp-token-456');

            expect(global.fetch).toHaveBeenCalledWith(
                `${API_URL}/auth/login`,
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ identifier: '+79991234567', otp: '123456' }),
                })
            );
        });

        it('должен выбрасывать ошибку при неверном OTP', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 401,
                json: async () => ({ detail: 'Invalid OTP' }),
            });

            const originalLocation = window.location;
            delete (window as any).location;
            window.location = { href: '' } as any;

            await expect(authService.login('+79991234567', '000000')).rejects.toThrow();

            window.location = originalLocation;
        });

        it('должен выбрасывать ошибку при истекшем OTP', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 400,
                json: async () => ({ detail: 'OTP expired' }),
            });

            await expect(authService.login('+79991234567', '1234')).rejects.toThrow('OTP expired');
        });
    });

    // ==========================================
    // ADMIN LOGIN
    // ==========================================

    describe('adminLogin', () => {
        it('должен отправлять email и password', async () => {
            const mockResponse = {
                access_token: 'admin-token',
                token_type: 'bearer',
                has_profile: true,
                is_new_user: false,
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => mockResponse,
            });

            const result = await authService.adminLogin('admin@example.com', 'password123');

            expect(result).toEqual(mockResponse);
            expect(localStorage.getItem('accessToken')).toBe('admin-token');

            expect(global.fetch).toHaveBeenCalledWith(
                `${API_URL}/auth/login/email`,
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ email: 'admin@example.com', password: 'password123' }),
                })
            );
        });

        it('должен выбрасывать ошибку при неверных credentials', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 401,
                json: async () => ({ detail: 'Invalid credentials' }),
            });

            const originalLocation = window.location;
            delete (window as any).location;
            window.location = { href: '' } as any;

            await expect(authService.adminLogin('admin@example.com', 'wrong')).rejects.toThrow();

            window.location = originalLocation;
        });
    });

    // ==========================================
    // EDGE CASES
    // ==========================================

    describe('Edge Cases', () => {
        it('должен корректно работать с пустым телом ответа', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                status: 204,
            });

            const result = await httpClient.post('/test', {});
            expect(result).toEqual({});
        });

        it('должен передавать кастомные headers', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({}),
            });

            await httpClient.get('/test', {
                headers: { 'X-Custom-Header': 'custom-value' },
            });

            const callArgs = (global.fetch as jest.Mock).mock.calls[0];
            const headers = callArgs[1].headers as Headers;
            expect(headers.get('X-Custom-Header')).toBe('custom-value');
        });

        it('должен обрабатывать сетевую ошибку', async () => {
            (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

            await expect(httpClient.get('/test')).rejects.toThrow('Network error');
        });

        it('должен работать с различными форматами номера телефона', async () => {
            const phoneFormats = [
                '+79991234567',
                '89991234567',
                '+7 999 123 45 67',
                '+7(999)123-45-67',
            ];

            for (const phone of phoneFormats) {
                (global.fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    json: async () => ({ status: 'ok' }),
                });

                await authService.requestOtp(phone);

                expect(global.fetch).toHaveBeenLastCalledWith(
                    `${API_URL}/auth/request-otp`,
                    expect.objectContaining({
                        body: JSON.stringify({ identifier: phone }),
                    })
                );
            }
        });
    });
});
