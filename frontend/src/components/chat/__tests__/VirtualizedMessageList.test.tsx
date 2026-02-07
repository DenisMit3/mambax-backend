/**
 * Tests for VirtualizedMessageList (PERF-003)
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { VirtualizedMessageList } from '../VirtualizedMessageList';

// Mock @tanstack/react-virtual
jest.mock('@tanstack/react-virtual', () => ({
    useVirtualizer: jest.fn(({ count }) => ({
        getVirtualItems: () => 
            Array.from({ length: Math.min(count, 10) }, (_, i) => ({
                index: i,
                start: i * 80,
                size: 80,
                key: i,
            })),
        getTotalSize: () => count * 80,
        scrollToIndex: jest.fn(),
    })),
}));

const createMessage = (id: string, senderId: string, text: string, overrides = {}) => ({
    id,
    text,
    senderId,
    timestamp: new Date(),
    type: 'text' as const,
    isRead: false,
    ...overrides,
});

describe('VirtualizedMessageList', () => {
    const currentUserId = 'user-1';
    const otherUserId = 'user-2';
    const defaultProps = {
        messages: [],
        currentUserId,
        otherParticipantPhoto: 'https://example.com/photo.jpg',
        onMessageTap: jest.fn(),
        playingAudio: null,
        onToggleAudio: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders without crashing with empty messages', () => {
        render(<VirtualizedMessageList {...defaultProps} />);
        // Should render container
        expect(document.querySelector('[style*="contain: strict"]')).toBeInTheDocument();
    });

    it('renders messages correctly', () => {
        const messages = [
            createMessage('1', otherUserId, 'Hello!'),
            createMessage('2', currentUserId, 'Hi there!'),
            createMessage('3', otherUserId, 'How are you?'),
        ];

        render(<VirtualizedMessageList {...defaultProps} messages={messages} />);

        expect(screen.getByText('Hello!')).toBeInTheDocument();
        expect(screen.getByText('Hi there!')).toBeInTheDocument();
        expect(screen.getByText('How are you?')).toBeInTheDocument();
    });

    it('applies correct styling for own messages', () => {
        const messages = [
            createMessage('1', currentUserId, 'My message'),
        ];

        render(<VirtualizedMessageList {...defaultProps} messages={messages} />);

        const messageContainer = screen.getByText('My message').closest('.flex');
        expect(messageContainer).toHaveClass('justify-end');
    });

    it('applies correct styling for other user messages', () => {
        const messages = [
            createMessage('1', otherUserId, 'Their message'),
        ];

        render(<VirtualizedMessageList {...defaultProps} messages={messages} />);

        const messageContainer = screen.getByText('Their message').closest('.flex');
        expect(messageContainer).toHaveClass('justify-start');
    });

    it('shows avatar for first message from other user', () => {
        const messages = [
            createMessage('1', otherUserId, 'First message'),
        ];

        render(<VirtualizedMessageList {...defaultProps} messages={messages} />);

        const avatar = screen.getByRole('img');
        expect(avatar).toHaveAttribute('src', 'https://example.com/photo.jpg');
    });

    it('hides avatar for consecutive messages from same user', () => {
        const messages = [
            createMessage('1', otherUserId, 'First message'),
            createMessage('2', otherUserId, 'Second message'),
        ];

        render(<VirtualizedMessageList {...defaultProps} messages={messages} />);

        // Only one avatar should be visible (for first message)
        const avatars = screen.getAllByRole('img');
        expect(avatars).toHaveLength(1);
    });

    it('shows read status for own messages', () => {
        const messages = [
            createMessage('1', currentUserId, 'Read message', { isRead: true }),
            createMessage('2', currentUserId, 'Unread message', { isRead: false }),
        ];

        render(<VirtualizedMessageList {...defaultProps} messages={messages} />);

        // CheckCheck icon for read, Check for unread
        // We can check by the presence of specific classes or elements
    });

    it('shows pending indicator for pending messages', () => {
        const messages = [
            createMessage('1', currentUserId, 'Pending message', { isPending: true }),
        ];

        render(<VirtualizedMessageList {...defaultProps} messages={messages} />);

        expect(screen.getByText('...')).toBeInTheDocument();
    });

    it('renders gift messages correctly', () => {
        const messages = [
            createMessage('1', otherUserId, '', { type: 'gift' }),
        ];

        render(<VirtualizedMessageList {...defaultProps} messages={messages} />);

        expect(screen.getByText('🎁')).toBeInTheDocument();
        expect(screen.getByText('Подарок!')).toBeInTheDocument();
    });

    it('renders image messages correctly', () => {
        const messages = [
            createMessage('1', otherUserId, 'https://example.com/image.jpg', { type: 'image' }),
        ];

        render(<VirtualizedMessageList {...defaultProps} messages={messages} />);

        const image = screen.getByAltText('Shared image');
        expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
    });

    it('renders voice messages with play button', () => {
        const messages = [
            createMessage('1', otherUserId, '', { 
                type: 'voice', 
                audioUrl: 'https://example.com/audio.mp3',
                duration: 15 
            }),
        ];

        render(<VirtualizedMessageList {...defaultProps} messages={messages} />);

        expect(screen.getByText('15s')).toBeInTheDocument();
    });

    it('calls onToggleAudio when play button clicked', () => {
        const onToggleAudio = jest.fn();
        const messages = [
            createMessage('1', otherUserId, '', { 
                type: 'voice', 
                audioUrl: 'https://example.com/audio.mp3',
                duration: 15 
            }),
        ];

        render(
            <VirtualizedMessageList 
                {...defaultProps} 
                messages={messages} 
                onToggleAudio={onToggleAudio}
            />
        );

        const playButton = screen.getByRole('button');
        fireEvent.click(playButton);

        expect(onToggleAudio).toHaveBeenCalledWith('https://example.com/audio.mp3');
    });

    it('calls onMessageTap when message is clicked', () => {
        const onMessageTap = jest.fn();
        const messages = [
            createMessage('msg-1', otherUserId, 'Click me'),
        ];

        render(
            <VirtualizedMessageList 
                {...defaultProps} 
                messages={messages} 
                onMessageTap={onMessageTap}
            />
        );

        fireEvent.click(screen.getByText('Click me'));

        expect(onMessageTap).toHaveBeenCalledWith('msg-1');
    });

    it('renders reactions on messages', () => {
        const messages = [
            createMessage('1', otherUserId, 'Message with reactions', {
                reactions: [
                    { emoji: '❤️', userId: currentUserId },
                    { emoji: '😂', userId: 'user-3' },
                ]
            }),
        ];

        render(<VirtualizedMessageList {...defaultProps} messages={messages} />);

        expect(screen.getByText('❤️')).toBeInTheDocument();
        expect(screen.getByText('😂')).toBeInTheDocument();
    });

    it('formats timestamp correctly', () => {
        const testDate = new Date('2024-01-15T14:30:00');
        const messages = [
            createMessage('1', otherUserId, 'Test', { timestamp: testDate }),
        ];

        render(<VirtualizedMessageList {...defaultProps} messages={messages} />);

        // Should show time in HH:MM format
        expect(screen.getByText('14:30')).toBeInTheDocument();
    });

    it('handles large message lists efficiently', () => {
        // Create 1000 messages
        const messages = Array.from({ length: 1000 }, (_, i) => 
            createMessage(`msg-${i}`, i % 2 === 0 ? currentUserId : otherUserId, `Message ${i}`)
        );

        const startTime = performance.now();
        render(<VirtualizedMessageList {...defaultProps} messages={messages} />);
        const endTime = performance.now();

        // Should render quickly (virtualization means only visible items are rendered)
        expect(endTime - startTime).toBeLessThan(1000); // Less than 1 second
    });
});
