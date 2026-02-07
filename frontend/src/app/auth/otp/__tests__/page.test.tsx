/**
 * Tests for OTP page (SEC-002: 6-digit OTP)
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter, useSearchParams } from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
    useSearchParams: jest.fn(),
}));

// Mock auth service
jest.mock('@/services/api', () => ({
    authService: {
        login: jest.fn(),
    },
}));

import OtpPage from '../page';
import { authService } from '@/services/api';

describe('OTP Page', () => {
    const mockPush = jest.fn();
    const mockBack = jest.fn();
    const mockGet = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue({
            push: mockPush,
            back: mockBack,
        });
        (useSearchParams as jest.Mock).mockReturnValue({
            get: mockGet,
        });
        mockGet.mockReturnValue('+79991234567');
    });

    it('renders 6 OTP input fields', () => {
        render(<OtpPage />);
        
        const inputs = screen.getAllByRole('textbox');
        expect(inputs).toHaveLength(6);
    });

    it('auto-focuses first input on mount', async () => {
        render(<OtpPage />);
        
        const inputs = screen.getAllByRole('textbox');
        await waitFor(() => {
            expect(inputs[0]).toHaveFocus();
        });
    });

    it('moves focus to next input on digit entry', async () => {
        const user = userEvent.setup();
        render(<OtpPage />);
        
        const inputs = screen.getAllByRole('textbox');
        
        await user.type(inputs[0], '1');
        expect(inputs[1]).toHaveFocus();
        
        await user.type(inputs[1], '2');
        expect(inputs[2]).toHaveFocus();
    });

    it('only accepts numeric input', async () => {
        const user = userEvent.setup();
        render(<OtpPage />);
        
        const inputs = screen.getAllByRole('textbox');
        
        await user.type(inputs[0], 'a');
        expect(inputs[0]).toHaveValue('');
        
        await user.type(inputs[0], '5');
        expect(inputs[0]).toHaveValue('5');
    });

    it('handles paste of 6-digit code', async () => {
        render(<OtpPage />);
        
        const inputs = screen.getAllByRole('textbox');
        
        // Simulate paste
        fireEvent.paste(inputs[0], {
            clipboardData: {
                getData: () => '123456',
            },
        });
        
        await waitFor(() => {
            expect(inputs[0]).toHaveValue('1');
            expect(inputs[1]).toHaveValue('2');
            expect(inputs[2]).toHaveValue('3');
            expect(inputs[3]).toHaveValue('4');
            expect(inputs[4]).toHaveValue('5');
            expect(inputs[5]).toHaveValue('6');
        });
    });

    it('ignores paste of non-6-digit code', async () => {
        render(<OtpPage />);
        
        const inputs = screen.getAllByRole('textbox');
        
        // Paste 4 digits (old format) - should be ignored
        fireEvent.paste(inputs[0], {
            clipboardData: {
                getData: () => '1234',
            },
        });
        
        // Inputs should remain empty
        expect(inputs[0]).toHaveValue('');
    });

    it('submits on 6th digit entry', async () => {
        const user = userEvent.setup();
        (authService.login as jest.Mock).mockResolvedValue({
            access_token: 'test-token',
            has_profile: true,
        });
        
        render(<OtpPage />);
        
        const inputs = screen.getAllByRole('textbox');
        
        // Enter 6 digits
        await user.type(inputs[0], '1');
        await user.type(inputs[1], '2');
        await user.type(inputs[2], '3');
        await user.type(inputs[3], '4');
        await user.type(inputs[4], '5');
        await user.type(inputs[5], '6');
        
        await waitFor(() => {
            expect(authService.login).toHaveBeenCalledWith('+79991234567', '123456');
        });
    });

    it('redirects to home on successful login with profile', async () => {
        const user = userEvent.setup();
        (authService.login as jest.Mock).mockResolvedValue({
            access_token: 'test-token',
            has_profile: true,
        });
        
        render(<OtpPage />);
        
        const inputs = screen.getAllByRole('textbox');
        
        await user.type(inputs[0], '0');
        await user.type(inputs[1], '0');
        await user.type(inputs[2], '0');
        await user.type(inputs[3], '0');
        await user.type(inputs[4], '0');
        await user.type(inputs[5], '0');
        
        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith('/');
        });
    });

    it('redirects to onboarding on successful login without profile', async () => {
        const user = userEvent.setup();
        (authService.login as jest.Mock).mockResolvedValue({
            access_token: 'test-token',
            has_profile: false,
        });
        
        render(<OtpPage />);
        
        const inputs = screen.getAllByRole('textbox');
        
        await user.type(inputs[0], '0');
        await user.type(inputs[1], '0');
        await user.type(inputs[2], '0');
        await user.type(inputs[3], '0');
        await user.type(inputs[4], '0');
        await user.type(inputs[5], '0');
        
        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith('/onboarding');
        });
    });

    it('clears inputs and shows error on invalid OTP', async () => {
        const user = userEvent.setup();
        (authService.login as jest.Mock).mockRejectedValue(new Error('Invalid OTP'));
        
        // Mock alert
        const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});
        
        render(<OtpPage />);
        
        const inputs = screen.getAllByRole('textbox');
        
        await user.type(inputs[0], '9');
        await user.type(inputs[1], '9');
        await user.type(inputs[2], '9');
        await user.type(inputs[3], '9');
        await user.type(inputs[4], '9');
        await user.type(inputs[5], '9');
        
        await waitFor(() => {
            expect(alertMock).toHaveBeenCalled();
        });
        
        // Inputs should be cleared
        await waitFor(() => {
            inputs.forEach(input => {
                expect(input).toHaveValue('');
            });
        });
        
        alertMock.mockRestore();
    });

    it('handles backspace to move to previous input', async () => {
        const user = userEvent.setup();
        render(<OtpPage />);
        
        const inputs = screen.getAllByRole('textbox');
        
        // Type first digit
        await user.type(inputs[0], '1');
        expect(inputs[1]).toHaveFocus();
        
        // Press backspace on empty second input
        await user.keyboard('{Backspace}');
        expect(inputs[0]).toHaveFocus();
    });
});
