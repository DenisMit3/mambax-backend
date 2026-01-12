
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChatRoomPage from '../page';
import { authService } from '@/services/api';
import { wsService } from '@/services/websocket';

// Mock dependnecies
jest.mock('@/services/api', () => ({
    authService: {
        getMe: jest.fn(),
        getMatches: jest.fn(),
        getMessages: jest.fn(),
        blockUser: jest.fn(),
        reportUser: jest.fn(),
        uploadChatMedia: jest.fn(),
    }
}));

jest.mock('@/services/websocket', () => ({
    wsService: {
        connect: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
        send: jest.fn(),
    }
}));

// Mock Next.js Link and Image
jest.mock('next/link', () => {
    return ({ children, href }: any) => <a href={href}>{children}</a>;
});

jest.mock('next/image', () => {
    return ({ src, alt }: any) => <img src={src} alt={alt} />;
});

// Polyfill scrollTo
Element.prototype.scrollIntoView = jest.fn();

describe('ChatRoomPage', () => {
    const mockParams = { id: 'match1' };

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock API responses
        (authService.getMe as jest.Mock).mockResolvedValue({ id: 'me', name: 'Myself', stars_balance: 100 });
        (authService.getMatches as jest.Mock).mockResolvedValue([
            { id: 'match1', user: { id: 'u2', name: 'Partner', photos: ['p.jpg'] } }
        ]);
        (authService.getMessages as jest.Mock).mockResolvedValue([
            { id: 'm1', sender_id: 'u2', text: 'Hi', type: 'text' }
        ]);
    });

    it('renders chat and loads messages', async () => {
        render(<ChatRoomPage params={mockParams as any} />);

        await waitFor(() => expect(screen.getByText('Partner')).toBeInTheDocument());
        await waitFor(() => expect(screen.getByText('Hi')).toBeInTheDocument());
    });

    it('sends a message', async () => {
        render(<ChatRoomPage params={mockParams as any} />);

        const input = screen.getByPlaceholderText('Message');
        fireEvent.change(input, { target: { value: 'Hello' } });

        const sendBtn = await screen.findByRole('button', { name: 'Send message' });
        // Wait, logic says: if inputText.trim() ? show send : show mic.

        // Now send button should appear (icon Send)
        // We can find by icon or just query button again? 
        // The buttons don't have text, but we can look for the svg? 
        // Or simpler, just press Enter
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

        expect(wsService.send).toHaveBeenCalledWith(expect.objectContaining({
            type: 'message',
            content: 'Hello'
        }));
    });

    it('opens gift modal', async () => {
        render(<ChatRoomPage params={mockParams as any} />);
        await waitFor(() => expect(screen.getByText('Gift')).toBeInTheDocument());

        fireEvent.click(screen.getByText('Gift'));
        // Modal should open
        expect(screen.getByText('Send a Gift')).toBeInTheDocument();
    });
});
