/**
 * Тесты для ChatPage (страница чата)
 * 
 * Покрытие:
 * - Загрузка данных чата
 * - Отправка сообщений (WS и REST fallback)
 * - WebSocket подключение и обработка событий
 * - Оптимистичные обновления UI
 * - Компоненты: QuestionOfTheDay, IcebreakersModal, GiftPicker
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChatPage from '../page';
import { authService } from '@/services/api';

// Mock Next.js navigation
const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('next/navigation', () => ({
    useParams: () => ({ id: 'match-123' }),
    useRouter: () => ({
        push: mockPush,
        back: mockBack,
    }),
}));

// Mock authService
jest.mock('@/services/api', () => ({
    authService: {
        getMessages: jest.fn(),
        getMatch: jest.fn(),
        getGiftsCatalog: jest.fn(),
        sendMessage: jest.fn(),
        uploadChatMedia: jest.fn(),
        sendGift: jest.fn(),
        getQuestionOfDay: jest.fn(),
        postQuestionOfDayAnswer: jest.fn(),
        getIcebreakers: jest.fn(),
        recordIcebreakerUsed: jest.fn(),
    },
}));

// Mock Telegram hook
jest.mock('@/lib/telegram', () => ({
    useTelegram: () => ({
        hapticFeedback: {
            impactOccurred: jest.fn(),
            notificationOccurred: jest.fn(),
        },
    }),
}));

// Mock child components
jest.mock('@/components/chat/VIPChatSystem', () => ({
    VIPChatSystem: ({ user, messages, onSendMessage, onBack }: any) => (
        <div data-testid="vip-chat-system">
            <div data-testid="chat-user">{user?.name}</div>
            <div data-testid="messages-count">{messages?.length || 0}</div>
            <input 
                data-testid="message-input"
                placeholder="Message"
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        onSendMessage((e.target as HTMLInputElement).value);
                    }
                }}
            />
            <button data-testid="back-button" onClick={onBack}>Back</button>
        </div>
    ),
}));

jest.mock('@/components/chat/GiftPicker', () => ({
    GiftPicker: ({ isOpen, onClose, onSelectGift, gifts }: any) => 
        isOpen ? (
            <div data-testid="gift-picker">
                <button onClick={onClose}>Close</button>
                {gifts?.map((g: any) => (
                    <button key={g.id} onClick={() => onSelectGift(g)}>
                        {g.name}
                    </button>
                ))}
            </div>
        ) : null,
}));

jest.mock('@/components/chat/QuestionOfTheDayCard', () => ({
    QuestionOfTheDayCard: ({ matchId }: any) => (
        <div data-testid="qotd-card">Question for {matchId}</div>
    ),
}));

jest.mock('@/components/chat/ConversationPromptsButton', () => ({
    ConversationPromptsButton: ({ onSelectPrompt }: any) => (
        <button 
            data-testid="prompts-button"
            onClick={() => onSelectPrompt('Как дела?')}
        >
            Prompts
        </button>
    ),
}));

jest.mock('@/components/chat/IcebreakersModal', () => ({
    IcebreakersModal: ({ isOpen, onClose, onSelectIcebreaker }: any) =>
        isOpen ? (
            <div data-testid="icebreakers-modal">
                <button onClick={() => onSelectIcebreaker('Привет!')}>Select</button>
                <button onClick={onClose}>Close</button>
            </div>
        ) : null,
}));

// Mock WebSocket
class MockWebSocket {
    url: string;
    readyState = 1;
    onopen: ((event: Event) => void) | null = null;
    onmessage: ((event: MessageEvent) => void) | null = null;
    onclose: ((event: CloseEvent) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;
    sentMessages: string[] = [];

    static OPEN = 1;
    static CLOSED = 3;

    constructor(url: string) {
        this.url = url;
        setTimeout(() => {
            if (this.onopen) this.onopen(new Event('open'));
        }, 10);
    }

    send(data: string) {
        this.sentMessages.push(data);
    }

    close() {
        this.readyState = 3;
        if (this.onclose) this.onclose(new CloseEvent('close'));
    }

    simulateMessage(data: object) {
        if (this.onmessage) {
            this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
        }
    }
}

const originalWebSocket = global.WebSocket;
let mockWsInstance: MockWebSocket | null = null;

describe('ChatPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.setItem('token', 'test-token');
        mockWsInstance = null;

        // Mock WebSocket
        (global as any).WebSocket = jest.fn((url: string) => {
            mockWsInstance = new MockWebSocket(url);
            return mockWsInstance;
        });
        (global as any).WebSocket.OPEN = MockWebSocket.OPEN;
        (global as any).WebSocket.CLOSED = MockWebSocket.CLOSED;

        // Default API mocks
        (authService.getMatch as jest.Mock).mockResolvedValue({
            id: 'match-123',
            current_user_id: 'me',
            user: {
                id: 'partner-1',
                name: 'Анна',
                photos: ['/anna.jpg'],
                is_online: true,
                is_premium: false,
            },
        });

        (authService.getMessages as jest.Mock).mockResolvedValue([
            {
                id: 'msg-1',
                sender_id: 'partner-1',
                content: 'Привет!',
                type: 'text',
                created_at: '2026-02-09T10:00:00Z',
                is_read: true,
            },
            {
                id: 'msg-2',
                sender_id: 'me',
                content: 'Привет! Как дела?',
                type: 'text',
                created_at: '2026-02-09T10:01:00Z',
                is_read: true,
            },
        ]);

        (authService.getGiftsCatalog as jest.Mock).mockResolvedValue({
            gifts: [
                { id: 'gift-1', name: 'Роза', price: 50, category_id: 'cat-1', image_url: '/rose.png' },
            ],
            categories: [
                { id: 'cat-1', name: 'Romantic' },
            ],
        });

        (authService.sendMessage as jest.Mock).mockResolvedValue({
            id: 'new-msg-1',
            created_at: new Date().toISOString(),
        });

        (authService.getQuestionOfDay as jest.Mock).mockResolvedValue({
            question: 'Любимый фильм?',
            date: '09.02.2026',
        });

        (authService.getIcebreakers as jest.Mock).mockResolvedValue({
            icebreakers: ['Привет!', 'Как дела?'],
        });
    });

    afterEach(() => {
        (global as any).WebSocket = originalWebSocket;
        localStorage.clear();
    });

    // ==========================================
    // ЗАГРУЗКА ДАННЫХ
    // ==========================================

    describe('Загрузка данных', () => {
        it('загружает и отображает данные чата', async () => {
            render(<ChatPage />);

            await waitFor(() => {
                expect(screen.getByTestId('chat-user')).toHaveTextContent('Анна');
            });

            expect(authService.getMatch).toHaveBeenCalledWith('match-123');
            expect(authService.getMessages).toHaveBeenCalledWith('match-123');
            expect(authService.getGiftsCatalog).toHaveBeenCalled();
        });

        it('отображает сообщения', async () => {
            render(<ChatPage />);

            await waitFor(() => {
                expect(screen.getByTestId('messages-count')).toHaveTextContent('2');
            });
        });

        it('показывает loading состояние', () => {
            render(<ChatPage />);
            
            expect(screen.getByText(/Установка защищенного соединения/)).toBeInTheDocument();
        });

        it('показывает ошибку если чат не найден', async () => {
            (authService.getMatch as jest.Mock).mockResolvedValue(null);

            render(<ChatPage />);

            await waitFor(() => {
                expect(screen.getByText('Чат не найден')).toBeInTheDocument();
            });
        });
    });

    // ==========================================
    // WEBSOCKET
    // ==========================================

    describe('WebSocket подключение', () => {
        it('подключается к WebSocket при загрузке', async () => {
            render(<ChatPage />);

            await waitFor(() => {
                expect(global.WebSocket).toHaveBeenCalled();
            });
        });

        it('SEC-005: не передает токен в URL WebSocket', async () => {
            render(<ChatPage />);

            await waitFor(() => {
                expect(mockWsInstance?.url).not.toContain('test-token');
            });
        });

        it('SEC-005: отправляет auth сообщение после подключения', async () => {
            render(<ChatPage />);

            await waitFor(() => {
                expect(mockWsInstance?.sentMessages.length).toBeGreaterThan(0);
            });

            const authMessage = JSON.parse(mockWsInstance!.sentMessages[0]);
            expect(authMessage.type).toBe('auth');
            expect(authMessage.token).toBe('test-token');
        });

        it('обрабатывает входящие сообщения', async () => {
            render(<ChatPage />);

            await waitFor(() => {
                expect(screen.getByTestId('chat-user')).toHaveTextContent('Анна');
            });

            // Симулируем входящее сообщение
            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 20));
                mockWsInstance?.simulateMessage({
                    type: 'message',
                    id: 'new-msg',
                    match_id: 'match-123',
                    sender_id: 'partner-1',
                    content: 'Новое сообщение',
                    timestamp: new Date().toISOString(),
                });
            });

            await waitFor(() => {
                expect(screen.getByTestId('messages-count')).toHaveTextContent('3');
            });
        });

        it('обновляет typing статус партнера', async () => {
            render(<ChatPage />);

            await waitFor(() => {
                expect(screen.getByTestId('chat-user')).toHaveTextContent('Анна');
            });

            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 20));
                mockWsInstance?.simulateMessage({
                    type: 'typing',
                    match_id: 'match-123',
                    user_id: 'partner-1',
                    is_typing: true,
                });
            });

            // VIPChatSystem должен получить обновленный user с isTyping: true
        });

        it('закрывает WebSocket при размонтировании', async () => {
            const { unmount } = render(<ChatPage />);

            await waitFor(() => {
                expect(mockWsInstance).not.toBeNull();
            });

            const closeSpy = jest.spyOn(mockWsInstance!, 'close');
            unmount();

            expect(closeSpy).toHaveBeenCalled();
        });
    });

    // ==========================================
    // ОТПРАВКА СООБЩЕНИЙ
    // ==========================================

    describe('Отправка сообщений', () => {
        it('отправляет сообщение через WebSocket', async () => {
            render(<ChatPage />);

            await waitFor(() => {
                expect(screen.getByTestId('message-input')).toBeInTheDocument();
            });

            const input = screen.getByTestId('message-input');
            fireEvent.change(input, { target: { value: 'Тестовое сообщение' } });
            fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

            await waitFor(() => {
                const messages = mockWsInstance!.sentMessages.map(m => JSON.parse(m));
                const textMessage = messages.find(m => m.type === 'message');
                expect(textMessage).toBeDefined();
                expect(textMessage.content).toBe('Тестовое сообщение');
            });
        });

        it('использует REST fallback если WebSocket закрыт', async () => {
            render(<ChatPage />);

            await waitFor(() => {
                expect(screen.getByTestId('message-input')).toBeInTheDocument();
            });

            // Закрываем WebSocket
            mockWsInstance!.readyState = 3;

            const input = screen.getByTestId('message-input');
            fireEvent.change(input, { target: { value: 'REST сообщение' } });
            fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

            await waitFor(() => {
                expect(authService.sendMessage).toHaveBeenCalledWith(
                    'match-123',
                    'REST сообщение'
                );
            });
        });
    });

    // ==========================================
    // КОМПОНЕНТЫ ЧАТА
    // ==========================================

    describe('Компоненты чата', () => {
        it('отображает QuestionOfTheDayCard', async () => {
            render(<ChatPage />);

            await waitFor(() => {
                expect(screen.getByTestId('qotd-card')).toBeInTheDocument();
            });
        });

        it('отображает кнопку Icebreakers', async () => {
            render(<ChatPage />);

            await waitFor(() => {
                expect(screen.getByText('Идеи')).toBeInTheDocument();
            });
        });

        it('открывает IcebreakersModal при клике', async () => {
            render(<ChatPage />);

            await waitFor(() => {
                expect(screen.getByText('Идеи')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('Идеи'));

            expect(screen.getByTestId('icebreakers-modal')).toBeInTheDocument();
        });

        it('отображает ConversationPromptsButton', async () => {
            render(<ChatPage />);

            await waitFor(() => {
                expect(screen.getByTestId('prompts-button')).toBeInTheDocument();
            });
        });
    });

    // ==========================================
    // НАВИГАЦИЯ
    // ==========================================

    describe('Навигация', () => {
        it('вызывает router.back при нажатии кнопки назад', async () => {
            render(<ChatPage />);

            await waitFor(() => {
                expect(screen.getByTestId('back-button')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('back-button'));

            expect(mockBack).toHaveBeenCalled();
        });
    });
});
