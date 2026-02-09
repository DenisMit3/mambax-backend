/**
 * Тесты для QuestionOfTheDayCard
 * 
 * Покрытие:
 * - Загрузка вопроса дня
 * - Отправка ответа
 * - WebSocket уведомления
 * - Состояния UI (loading, submitted, bothAnswered)
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QuestionOfTheDayCard } from '../QuestionOfTheDayCard';
import { authService } from '@/services/api';

// Mock authService
jest.mock('@/services/api', () => ({
    authService: {
        getQuestionOfDay: jest.fn(),
        postQuestionOfDayAnswer: jest.fn(),
    },
}));

// Mock hooks
jest.mock('@/hooks/useHaptic', () => ({
    useHaptic: () => ({
        medium: jest.fn(),
        heavy: jest.fn(),
    }),
}));

jest.mock('@/hooks/useReducedMotion', () => ({
    useReducedMotion: () => false,
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock WebSocket
class MockWebSocket {
    url: string;
    onopen: ((event: Event) => void) | null = null;
    onmessage: ((event: MessageEvent) => void) | null = null;
    onclose: ((event: CloseEvent) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;
    readyState = 1;

    constructor(url: string) {
        this.url = url;
        setTimeout(() => {
            if (this.onopen) this.onopen(new Event('open'));
        }, 10);
    }

    send(data: string) {}
    close() {
        if (this.onclose) this.onclose(new CloseEvent('close'));
    }

    // Helper for tests
    simulateMessage(data: object) {
        if (this.onmessage) {
            this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
        }
    }
}

const originalWebSocket = global.WebSocket;

describe('QuestionOfTheDayCard', () => {
    let mockWsInstance: MockWebSocket | null = null;

    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.setItem('token', 'test-token');
        
        // Mock WebSocket
        (global as any).WebSocket = jest.fn((url: string) => {
            mockWsInstance = new MockWebSocket(url);
            return mockWsInstance;
        });

        // Default mock responses
        (authService.getQuestionOfDay as jest.Mock).mockResolvedValue({
            question: 'Какой твой любимый фильм?',
            date: '09.02.2026',
        });

        (authService.postQuestionOfDayAnswer as jest.Mock).mockResolvedValue({
            partner_answered: false,
        });
    });

    afterEach(() => {
        (global as any).WebSocket = originalWebSocket;
        localStorage.clear();
    });

    it('загружает и отображает вопрос дня', async () => {
        render(<QuestionOfTheDayCard matchId="match-123" />);

        await waitFor(() => {
            expect(screen.getByText('Какой твой любимый фильм?')).toBeInTheDocument();
        });

        expect(screen.getByText(/Вопрос дня/)).toBeInTheDocument();
        expect(authService.getQuestionOfDay).toHaveBeenCalled();
    });

    it('не отображается если вопрос не загружен', async () => {
        (authService.getQuestionOfDay as jest.Mock).mockResolvedValue({
            question: '',
            date: '',
        });

        const { container } = render(<QuestionOfTheDayCard matchId="match-123" />);

        await waitFor(() => {
            expect(authService.getQuestionOfDay).toHaveBeenCalled();
        });

        // Компонент возвращает null если нет вопроса
        expect(container.firstChild).toBeNull();
    });

    it('позволяет ввести и отправить ответ', async () => {
        render(<QuestionOfTheDayCard matchId="match-123" />);

        await waitFor(() => {
            expect(screen.getByText('Какой твой любимый фильм?')).toBeInTheDocument();
        });

        const textarea = screen.getByPlaceholderText('Ваш ответ...');
        fireEvent.change(textarea, { target: { value: 'Интерстеллар' } });

        const submitButton = screen.getByRole('button', { name: /Ответить/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(authService.postQuestionOfDayAnswer).toHaveBeenCalledWith('match-123', 'Интерстеллар');
        });
    });

    it('показывает сообщение после отправки ответа', async () => {
        render(<QuestionOfTheDayCard matchId="match-123" />);

        await waitFor(() => {
            expect(screen.getByText('Какой твой любимый фильм?')).toBeInTheDocument();
        });

        const textarea = screen.getByPlaceholderText('Ваш ответ...');
        fireEvent.change(textarea, { target: { value: 'Интерстеллар' } });

        const submitButton = screen.getByRole('button', { name: /Ответить/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(/Ответ сохранён/)).toBeInTheDocument();
        });
    });

    it('показывает уведомление когда оба ответили', async () => {
        (authService.postQuestionOfDayAnswer as jest.Mock).mockResolvedValue({
            partner_answered: true,
        });

        const onBothAnswered = jest.fn();

        render(
            <QuestionOfTheDayCard 
                matchId="match-123" 
                onBothAnswered={onBothAnswered}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Какой твой любимый фильм?')).toBeInTheDocument();
        });

        const textarea = screen.getByPlaceholderText('Ваш ответ...');
        fireEvent.change(textarea, { target: { value: 'Интерстеллар' } });

        const submitButton = screen.getByRole('button', { name: /Ответить/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(/Вы оба ответили/)).toBeInTheDocument();
        });

        expect(onBothAnswered).toHaveBeenCalled();
    });

    it('не отправляет пустой ответ', async () => {
        render(<QuestionOfTheDayCard matchId="match-123" />);

        await waitFor(() => {
            expect(screen.getByText('Какой твой любимый фильм?')).toBeInTheDocument();
        });

        const submitButton = screen.getByRole('button', { name: /Ответить/i });
        expect(submitButton).toBeDisabled();

        fireEvent.click(submitButton);

        expect(authService.postQuestionOfDayAnswer).not.toHaveBeenCalled();
    });

    it('обрабатывает WebSocket уведомление о том что оба ответили', async () => {
        const onBothAnswered = jest.fn();

        render(
            <QuestionOfTheDayCard 
                matchId="match-123" 
                onBothAnswered={onBothAnswered}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Какой твой любимый фильм?')).toBeInTheDocument();
        });

        // Сначала отправляем свой ответ
        const textarea = screen.getByPlaceholderText('Ваш ответ...');
        fireEvent.change(textarea, { target: { value: 'Интерстеллар' } });
        fireEvent.click(screen.getByRole('button', { name: /Ответить/i }));

        await waitFor(() => {
            expect(screen.getByText(/Ответ сохранён/)).toBeInTheDocument();
        });

        // Симулируем WebSocket сообщение
        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 20));
            mockWsInstance?.simulateMessage({
                type: 'qotd_both_answered',
                match_id: 'match-123',
            });
        });

        await waitFor(() => {
            expect(onBothAnswered).toHaveBeenCalled();
        });
    });

    it('игнорирует WebSocket сообщения для других матчей', async () => {
        const onBothAnswered = jest.fn();

        render(
            <QuestionOfTheDayCard 
                matchId="match-123" 
                onBothAnswered={onBothAnswered}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Какой твой любимый фильм?')).toBeInTheDocument();
        });

        // Симулируем WebSocket сообщение для другого матча
        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 20));
            mockWsInstance?.simulateMessage({
                type: 'qotd_both_answered',
                match_id: 'other-match',
            });
        });

        expect(onBothAnswered).not.toHaveBeenCalled();
    });

    it('позволяет скрыть карточку после ответа', async () => {
        render(<QuestionOfTheDayCard matchId="match-123" />);

        await waitFor(() => {
            expect(screen.getByText('Какой твой любимый фильм?')).toBeInTheDocument();
        });

        // Отправляем ответ
        const textarea = screen.getByPlaceholderText('Ваш ответ...');
        fireEvent.change(textarea, { target: { value: 'Интерстеллар' } });
        fireEvent.click(screen.getByRole('button', { name: /Ответить/i }));

        await waitFor(() => {
            expect(screen.getByText(/Ответ сохранён/)).toBeInTheDocument();
        });

        // Нажимаем "Скрыть"
        const hideButton = screen.getByText('Скрыть');
        fireEvent.click(hideButton);

        await waitFor(() => {
            expect(screen.queryByText('Какой твой любимый фильм?')).not.toBeInTheDocument();
        });
    });

    it('показывает состояние загрузки при отправке', async () => {
        // Делаем postQuestionOfDayAnswer медленным
        (authService.postQuestionOfDayAnswer as jest.Mock).mockImplementation(
            () => new Promise(resolve => setTimeout(() => resolve({ partner_answered: false }), 100))
        );

        render(<QuestionOfTheDayCard matchId="match-123" />);

        await waitFor(() => {
            expect(screen.getByText('Какой твой любимый фильм?')).toBeInTheDocument();
        });

        const textarea = screen.getByPlaceholderText('Ваш ответ...');
        fireEvent.change(textarea, { target: { value: 'Интерстеллар' } });

        const submitButton = screen.getByRole('button', { name: /Ответить/i });
        fireEvent.click(submitButton);

        // Должен показать "Отправка..."
        expect(screen.getByText('Отправка...')).toBeInTheDocument();
    });

    it('SEC-005: WebSocket URL не содержит токен', async () => {
        render(<QuestionOfTheDayCard matchId="match-123" />);

        await waitFor(() => {
            expect(screen.getByText('Какой твой любимый фильм?')).toBeInTheDocument();
        });

        // Ждем создания WebSocket
        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 20));
        });

        // Проверяем что URL не содержит токен
        expect(mockWsInstance?.url).not.toContain('test-token');
    });
});
