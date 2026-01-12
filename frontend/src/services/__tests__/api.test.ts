// Mock env
jest.mock('@/utils/env', () => ({
    getApiUrl: jest.fn(() => 'http://mock-api'),
}));

import { authService } from '../api';

const API_URL = "http://mock-api"; // Matches mock

// Mock global fetch
global.fetch = jest.fn();

describe('authService', () => {
    beforeEach(() => {
        (global.fetch as jest.Mock).mockClear();
        localStorage.clear();
    });

    it('login success', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ access_token: 'fake-token' }),
        });

        const result = await authService.login('123', '0000');
        expect(result).toEqual({ access_token: 'fake-token' });
        expect(localStorage.getItem('token')).toBe('fake-token');
        expect(global.fetch).toHaveBeenCalledWith(`${API_URL}/auth/login`, expect.any(Object));
    });

    it('login mocks on failure with 0000', async () => {
        (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });
        const result = await authService.login('123', '0000');

        expect(result).toEqual({ access_token: 'mock_token' });
        consoleSpy.mockRestore();
    });

    it('getMe request', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ id: 'me', name: 'Test' }),
        });
        localStorage.setItem('token', 'abc');

        const result = await authService.getMe();
        expect(result).toEqual({ id: 'me', name: 'Test' });
        expect(global.fetch).toHaveBeenCalledWith(`${API_URL}/users/me`, expect.objectContaining({
            headers: expect.objectContaining({ Authorization: 'Bearer abc' })
        }));
    });
});
