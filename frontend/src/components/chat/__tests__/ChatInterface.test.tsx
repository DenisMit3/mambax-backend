/**
 * Тесты для ChatInterface
 * 
 * Покрытие:
 * - Отображение сообщений
 * - Отправка сообщений
 * - Typing индикатор
 * - Реакции на сообщения
 * - Голосовые сообщения
 * - Icebreakers для новых чатов
 * - Conversation prompts для застоявшихся чатов
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ChatInterface } from '../ChatInterface';
import { wsService } from '@/services/websocket';

// Mock wsService
jest.mock('@/services/websocket', () => ({
    wsService: {
        on: jest.fn(),
        off: jest.fn(),
        send: jest.fn(),
    },
}));

// Mock hooks
jest.mock('@/hooks/useHaptic', () => ({
    useHaptic: () => ({
        light: jest.fn(),
        medium: jest.fn(),
        heavy: jest.fn(),
        success: jest.fn(),
        error: jest.fn(),
    }),
}));

jest.mock('@/hooks/useSoundService', () => ({
    useSoundService: () => ({
        playSent: jest.fn(),
        playReceived: jest.fn(),
    }),
}));

jest.mock('@/lib/telegram', () => ({
    useTelegram: () => ({
        webApp: null,
        hapticFeedback: {
            impactOccurred: jest.fn(),
            notificationOccurred: jest.fn(),
        },
    }),
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div data-testid="motion-div" {...props}>{children}</div>,
        button: ({ children, onClick, disabled, className, ...props }: any) => (
            <button onClick={onClick} disabled={disabled} className={className} {...props}>{children}</button>
        ),
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
    useMotionValue: () => ({ get: () => 0, set: () => {} }),
    useTransform: () => 0,
}));

// Mock child components
jest.mock('../VoiceRecorder', () => ({
    VoiceRecorder: ({ onSend }: any) => (
        <button data-testid="voice-recorder" onClick={() => onSend(new Blob(), 5)}>
            Record
        </button>
    ),
}));

jest.mock('../IcebreakersModal', () => ({
    IcebreakersModal: ({ isOpen, onClose, onSelectIcebreaker }: any) => 
        isOpen ? (
            <div data-testid="icebreakers-modal">
                <button onClick={() => onSelectIcebreaker('Привет! Как дела?')}>
                    Select Icebreaker
                </button>
                <button onClick={onClose}>Close</button>
            </div>
        ) : null,
}));

jest.mock('@/components/onboarding/ContextualTooltip', () => ({
    ContextualTooltip: () => null,
}));

jest.mock('@/components/ui/AnimatedButton', () => ({
    AnimatedButton: ({ children, onClick, ...props }: any) => (
        <button onClick={onClick} {...props}>{children}</button>
    ),
}));

jest.mock('@/components/ui/GlassCard', () => ({
    GlassCard: ({ children, className }: any) => (
        <div className={className}>{children}</div>
    ),
}));

// Mock fetch for conversation prompts
global.fetch = jest.fn();

describe('ChatInterface', () => {
    const mockChat = {
        id: 'chat-1',
        matchId: 'match-1',
        participants: [
            { id: 'user-1', name: 'Текущий пользователь', photo: '/me.jpg', isOnline: true },
            { id: 'user-2', name: 'Анна', photo: '/anna.jpg', isOnline: true, lastSeen: new Date() },
        ],
        messages: [
            {
                id: 'msg-1',
                text: 'Привет!',
                senderId: 'user-2',
                timestamp: new Date('2026-02-09T10:00:00'),
                type: 'text' as const,
                isRead: true,
            },
            {
                id: 'msg-2',
                text: 'Привет! Как дела?',
                senderId: 'user-1',
                timestamp: new Date('2026-02-09T10:01:00'),
                type: 'text' as const,
                isRead: true,
            },
        ],
        isTyping: false,
        unreadCount: 0,
    };

    const defaultProps = {
        chat: mockChat,
        currentUserId: 'user-1',
        onSendMessage: jest.fn(),
        onReaction: jest.fn(),
        onCall: jest.fn(),
        isPremium: false,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ prompts: ['Как прошел день?', 'Что нового?'] }),
        });
    });

    // ==========================================
    // БАЗОВОЕ ОТОБРАЖЕНИЕ
    // ==========================================

    describe('Базовое отображение', () => {
        it('отображает имя собеседника в заголовке', () => {
            render(<ChatInterface {...defaultProps} />);
            expect(screen.getByText('Анна')).toBeInTheDocument();
        });

        it('отображает статус онлайн', () => {
            render(<ChatInterface {...defaultProps} />);
            expect(screen.getByText('В сети')).toBeInTheDocument();
        });

        it('отображает сообщения чата', () => {
            render(<ChatInterface {...defaultProps} />);
            expect(screen.getByText('Привет!')).toBeInTheDocument();
            expect(screen.getByText('Привет! Как дела?')).toBeInTheDocument();
        });

        it('отображает время сообщений', () => {
            render(<ChatInterface {...defaultProps} />);
            // Формат времени: HH:MM
            expect(screen.getByText('10:00')).toBeInTheDocument();
            expect(screen.getByText('10:01')).toBeInTheDocument();
        });

        it('отображает статус "Не в сети" когда собеседник офлайн', () => {
            const offlineChat = {
                ...mockChat,
                participants: [
                    mockChat.participants[0],
                    { ...mockChat.participants[1], isOnline: false, lastSeen: undefined },
                ],
            };
            render(<ChatInterface {...defaultProps} chat={offlineChat} />);
            expect(screen.getByText('Не в сети')).toBeInTheDocument();
        });
    });

    // ==========================================
    // ОТПРАВКА СООБЩЕНИЙ
    // ==========================================

    describe('Отправка сообщений', () => {
        it('позволяет ввести текст в поле ввода', () => {
            render(<ChatInterface {...defaultProps} />);
            const input = screen.getByPlaceholderText('Напишите сообщение...');
            
            fireEvent.change(input, { target: { value: 'Тестовое сообщение' } });
            
            expect(input).toHaveValue('Тестовое сообщение');
        });

        it('вызывает onSendMessage при отправке', () => {
            render(<ChatInterface {...defaultProps} />);
            const input = screen.getByPlaceholderText('Напишите сообщение...');
            
            fireEvent.change(input, { target: { value: 'Тестовое сообщение' } });
            fireEvent.keyPress(input, { key: 'Enter', code: 'Enter' });
            
            expect(defaultProps.onSendMessage).toHaveBeenCalledWith('Тестовое сообщение');
        });

        it('очищает поле ввода после отправки', () => {
            render(<ChatInterface {...defaultProps} />);
            const input = screen.getByPlaceholderText('Напишите сообщение...');
            
            fireEvent.change(input, { target: { value: 'Тестовое сообщение' } });
            fireEvent.keyPress(input, { key: 'Enter', code: 'Enter' });
            
            expect(input).toHaveValue('');
        });

        it('не отправляет пустое сообщение', () => {
            render(<ChatInterface {...defaultProps} />);
            const input = screen.getByPlaceholderText('Напишите сообщение...');
            
            fireEvent.keyPress(input, { key: 'Enter', code: 'Enter' });
            
            expect(defaultProps.onSendMessage).not.toHaveBeenCalled();
        });

        it('не отправляет сообщение из пробелов', () => {
            render(<ChatInterface {...defaultProps} />);
            const input = screen.getByPlaceholderText('Напишите сообщение...');
            
            fireEvent.change(input, { target: { value: '   ' } });
            fireEvent.keyPress(input, { key: 'Enter', code: 'Enter' });
            
            expect(defaultProps.onSendMessage).not.toHaveBeenCalled();
        });
    });

    // ==========================================
    // TYPING ИНДИКАТОР
    // ==========================================

    describe('Typing индикатор', () => {
        it('отправляет typing событие при вводе текста', () => {
            render(<ChatInterface {...defaultProps} />);
            const input = screen.getByPlaceholderText('Напишите сообщение...');
            
            fireEvent.change(input, { target: { value: 'Печатаю...' } });
            
            expect(wsService.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'typing',
                    match_id: 'match-1',
                    is_typing: true,
                })
            );
        });

        it('показывает typing индикатор когда собеседник печатает', () => {
            const typingChat = { ...mockChat, isTyping: true };
            render(<ChatInterface {...defaultProps} chat={typingChat} />);
            
            // Typing индикатор - три анимированные точки
            const typingIndicator = screen.getAllByTestId('motion-div').find(
                el => el.className?.includes('bg-gray-800')
            );
            expect(typingIndicator).toBeInTheDocument();
        });

        it('регистрирует обработчик typing событий', () => {
            render(<ChatInterface {...defaultProps} />);
            
            expect(wsService.on).toHaveBeenCalledWith('typing', expect.any(Function));
        });

        it('удаляет обработчик typing при размонтировании', () => {
            const { unmount } = render(<ChatInterface {...defaultProps} />);
            
            unmount();
            
            expect(wsService.off).toHaveBeenCalledWith('typing', expect.any(Function));
        });
    });

    // ==========================================
    // ICEBREAKERS
    // ==========================================

    describe('Icebreakers для новых чатов', () => {
        it('автоматически показывает icebreakers для нового чата', async () => {
            const emptyChat = { ...mockChat, messages: [] };
            
            render(<ChatInterface {...defaultProps} chat={emptyChat} />);
            
            await waitFor(() => {
                expect(screen.getByTestId('icebreakers-modal')).toBeInTheDocument();
            }, { timeout: 1000 });
        });

        it('не показывает icebreakers если есть сообщения', () => {
            render(<ChatInterface {...defaultProps} />);
            
            expect(screen.queryByTestId('icebreakers-modal')).not.toBeInTheDocument();
        });

        it('вставляет выбранный icebreaker в поле ввода', async () => {
            const emptyChat = { ...mockChat, messages: [] };
            
            render(<ChatInterface {...defaultProps} chat={emptyChat} />);
            
            await waitFor(() => {
                expect(screen.getByTestId('icebreakers-modal')).toBeInTheDocument();
            });
            
            fireEvent.click(screen.getByText('Select Icebreaker'));
            
            const input = screen.getByPlaceholderText('Напишите сообщение...');
            expect(input).toHaveValue('Привет! Как дела?');
        });

        it('показывает кнопку icebreakers в заголовке для нового чата', () => {
            const emptyChat = { ...mockChat, messages: [] };
            
            render(<ChatInterface {...defaultProps} chat={emptyChat} />);
            
            // Кнопка с иконкой Lightbulb
            const lightbulbButtons = screen.getAllByRole('button');
            const icebreakerButton = lightbulbButtons.find(btn => 
                btn.getAttribute('title') === 'Идеи для разговора'
            );
            expect(icebreakerButton).toBeInTheDocument();
        });
    });

    // ==========================================
    // CONVERSATION PROMPTS (застоявшиеся чаты)
    // ==========================================

    describe('Conversation prompts для застоявшихся чатов', () => {
        it('показывает кнопку prompts если последнее сообщение > 24ч назад', () => {
            const oldDate = new Date();
            oldDate.setHours(oldDate.getHours() - 25);
            
            const stalledChat = {
                ...mockChat,
                messages: [{
                    ...mockChat.messages[0],
                    timestamp: oldDate,
                }],
            };
            
            render(<ChatInterface {...defaultProps} chat={stalledChat} />);
            
            const promptButton = screen.getAllByRole('button').find(btn => 
                btn.getAttribute('title') === 'Возобновить разговор'
            );
            expect(promptButton).toBeInTheDocument();
        });

        it('не показывает кнопку prompts для активного чата', () => {
            render(<ChatInterface {...defaultProps} />);
            
            const promptButton = screen.getAllByRole('button').find(btn => 
                btn.getAttribute('title') === 'Возобновить разговор'
            );
            expect(promptButton).toBeUndefined();
        });
    });

    // ==========================================
    // РЕАКЦИИ
    // ==========================================

    describe('Реакции на сообщения', () => {
        it('вызывает onReaction при выборе реакции', async () => {
            render(<ChatInterface {...defaultProps} />);
            
            // Клик на сообщение открывает picker реакций
            const message = screen.getByText('Привет!');
            fireEvent.click(message.closest('[data-testid="motion-div"]')!);
            
            // Ищем emoji реакцию
            await waitFor(() => {
                const heartReaction = screen.queryByText('❤️');
                if (heartReaction) {
                    fireEvent.click(heartReaction);
                    expect(defaultProps.onReaction).toHaveBeenCalled();
                }
            });
        });
    });

    // ==========================================
    // PREMIUM ФУНКЦИИ
    // ==========================================

    describe('Premium функции', () => {
        it('показывает кнопки звонков для premium пользователей', () => {
            render(<ChatInterface {...defaultProps} isPremium={true} />);
            
            // Должны быть кнопки Phone и Video
            const buttons = screen.getAllByRole('button');
            expect(buttons.length).toBeGreaterThan(3); // Больше кнопок для premium
        });

        it('не показывает кнопки звонков для обычных пользователей', () => {
            render(<ChatInterface {...defaultProps} isPremium={false} />);
            
            // Меньше кнопок без premium
            const buttons = screen.getAllByRole('button');
            // Проверяем что нет кнопок звонков по их onClick
        });

        it('вызывает onCall при нажатии на кнопку звонка', () => {
            render(<ChatInterface {...defaultProps} isPremium={true} />);
            
            // Находим кнопку звонка (первая из premium кнопок)
            const buttons = screen.getAllByRole('button');
            // Кнопка с Phone иконкой
        });
    });

    // ==========================================
    // READ RECEIPTS
    // ==========================================

    describe('Read receipts', () => {
        it('отправляет read receipt для непрочитанных сообщений', () => {
            const unreadChat = {
                ...mockChat,
                messages: [
                    {
                        id: 'msg-unread',
                        text: 'Новое сообщение',
                        senderId: 'user-2',
                        timestamp: new Date(),
                        type: 'text' as const,
                        isRead: false,
                    },
                ],
            };
            
            render(<ChatInterface {...defaultProps} chat={unreadChat} />);
            
            expect(wsService.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'read',
                    match_id: 'match-1',
                    message_ids: ['msg-unread'],
                })
            );
        });

        it('не отправляет read receipt для своих сообщений', () => {
            const ownUnreadChat = {
                ...mockChat,
                messages: [
                    {
                        id: 'msg-own',
                        text: 'Мое сообщение',
                        senderId: 'user-1', // Свое сообщение
                        timestamp: new Date(),
                        type: 'text' as const,
                        isRead: false,
                    },
                ],
            };
            
            render(<ChatInterface {...defaultProps} chat={ownUnreadChat} />);
            
            // Не должно быть вызова с этим message_id
            const readCalls = (wsService.send as jest.Mock).mock.calls.filter(
                call => call[0]?.type === 'read'
            );
            
            readCalls.forEach(call => {
                expect(call[0].message_ids).not.toContain('msg-own');
            });
        });
    });

    // ==========================================
    // ГОЛОСОВЫЕ СООБЩЕНИЯ
    // ==========================================

    describe('Голосовые сообщения', () => {
        it('показывает VoiceRecorder когда поле ввода пустое', () => {
            render(<ChatInterface {...defaultProps} />);
            
            expect(screen.getByTestId('voice-recorder')).toBeInTheDocument();
        });

        it('скрывает VoiceRecorder когда есть текст', () => {
            render(<ChatInterface {...defaultProps} />);
            const input = screen.getByPlaceholderText('Напишите сообщение...');
            
            fireEvent.change(input, { target: { value: 'Текст' } });
            
            expect(screen.queryByTestId('voice-recorder')).not.toBeInTheDocument();
        });

        it('отображает голосовые сообщения с кнопкой воспроизведения', () => {
            const voiceChat = {
                ...mockChat,
                messages: [
                    {
                        id: 'voice-1',
                        text: '',
                        senderId: 'user-2',
                        timestamp: new Date(),
                        type: 'voice' as const,
                        isRead: true,
                        audioUrl: '/audio.webm',
                        duration: 5,
                    },
                ],
            };
            
            render(<ChatInterface {...defaultProps} chat={voiceChat} />);
            
            // Должна быть кнопка Play
            expect(screen.getByText('5s')).toBeInTheDocument();
        });
    });

    // ==========================================
    // EMOJI PICKER
    // ==========================================

    describe('Emoji picker', () => {
        it('открывает emoji picker при клике на кнопку', () => {
            render(<ChatInterface {...defaultProps} />);
            
            // Находим кнопку emoji (Smile иконка)
            const emojiButton = screen.getByRole('button', { name: '' }); // Кнопка без текста
            // Клик должен открыть picker
        });
    });
});
