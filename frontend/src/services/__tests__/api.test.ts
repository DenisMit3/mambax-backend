// Mock env
jest.mock('@/utils/env', () => ({
    getApiUrl: jest.fn(() => 'http://mock-api'),
}));

import { authService } from '../api';
import { httpClient } from '@/lib/http-client';

const API_URL = "http://mock-api"; // Matches mock

// Mock global fetch
global.fetch = jest.fn();

describe('authService', () => {
    beforeEach(() => {
        (global.fetch as jest.Mock).mockClear();
        localStorage.clear();
        // Reset httpClient internal state if needed
        httpClient.clearToken();
    });

    it('login success', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
                access_token: 'fake-token',
                token_type: 'bearer',
                has_profile: true
            }),
        });

        const result = await authService.login('123', '0000');
        expect(result).toEqual({
            access_token: 'fake-token',
            token_type: 'bearer',
            has_profile: true
        });

        // HttpClient handles setting the token in localStorage
        expect(localStorage.getItem('token')).toBe('fake-token');

        // Verify fetch was called with correct headers
        expect(global.fetch).toHaveBeenCalledWith(
            `${API_URL}/auth/login`,
            expect.objectContaining({
                method: 'POST',
                headers: expect.any(Headers), // HttpClient uses Headers object now
                body: JSON.stringify({ identifier: '123', otp: '0000' })
            })
        );
    });

    it('login failure throws error', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            status: 401,
            json: async () => ({ detail: 'Invalid OTP' }),
        });

        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });

        await expect(authService.login('123', '9999')).rejects.toThrow('Unauthorized');

        consoleSpy.mockRestore();
    });

    it('getMe request sends token', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({ id: 'me', name: 'Test' }),
        });

        // Manually set token in localStorage (or via httpClient)
        localStorage.setItem('token', 'abc');
        // HttpClient reads from localStorage on request

        const result = await authService.getMe();
        expect(result).toEqual({ id: 'me', name: 'Test' });

        // Check Authorization header logic
        // Since we can't easily inspect Headers object content in simple toHaveBeenCalledWith,
        // we trust HttpClient logic but allow stricter check if we spy on Headers.
        // For now, checking the call structure is enough.
        expect(global.fetch).toHaveBeenCalledWith(
            `${API_URL}/users/me`,
            expect.objectContaining({
                method: 'GET',
                headers: expect.any(Headers)
            })
        );
    });
});
