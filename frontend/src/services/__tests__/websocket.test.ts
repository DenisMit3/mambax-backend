/**
 * Tests for WebSocket service (SEC-005: Token via message, not URL)
 */

// Mock WebSocket
class MockWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;

    url: string;
    readyState: number = MockWebSocket.CONNECTING;
    onopen: ((event: Event) => void) | null = null;
    onclose: ((event: CloseEvent) => void) | null = null;
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;
    sentMessages: string[] = [];

    constructor(url: string) {
        this.url = url;
        // Simulate async connection
        setTimeout(() => {
            this.readyState = MockWebSocket.OPEN;
            if (this.onopen) {
                this.onopen(new Event('open'));
            }
        }, 10);
    }

    send(data: string) {
        this.sentMessages.push(data);
    }

    close(code?: number, reason?: string) {
        this.readyState = MockWebSocket.CLOSED;
        if (this.onclose) {
            this.onclose(new CloseEvent('close', { code, reason }));
        }
    }

    // Helper to simulate receiving a message
    simulateMessage(data: object) {
        if (this.onmessage) {
            this.onmessage(new MessageEvent('message', {
                data: JSON.stringify(data)
            }));
        }
    }
}

// Store original WebSocket
const OriginalWebSocket = global.WebSocket;

describe('WebSocket Service', () => {
    let mockWsInstance: MockWebSocket | null = null;

    beforeEach(() => {
        jest.resetModules();
        mockWsInstance = null;
        
        // Mock WebSocket constructor
        (global as any).WebSocket = jest.fn((url: string) => {
            mockWsInstance = new MockWebSocket(url);
            return mockWsInstance;
        });
        (global as any).WebSocket.OPEN = MockWebSocket.OPEN;
        (global as any).WebSocket.CLOSED = MockWebSocket.CLOSED;
        (global as any).WebSocket.CONNECTING = MockWebSocket.CONNECTING;
    });

    afterEach(() => {
        (global as any).WebSocket = OriginalWebSocket;
    });

    it('SEC-005: connects without token in URL', async () => {
        // Import fresh instance
        const { wsService } = await import('../websocket');
        
        wsService.connect('test-token-123');
        
        await new Promise(resolve => setTimeout(resolve, 20));
        
        // URL should NOT contain token
        expect(mockWsInstance?.url).not.toContain('test-token-123');
    });

    it('SEC-005: sends auth message with token after connection', async () => {
        const { wsService } = await import('../websocket');
        
        wsService.connect('test-token-123');
        
        await new Promise(resolve => setTimeout(resolve, 20));
        
        // Should have sent auth message
        expect(mockWsInstance?.sentMessages.length).toBeGreaterThan(0);
        
        const authMessage = JSON.parse(mockWsInstance!.sentMessages[0]);
        expect(authMessage.type).toBe('auth');
        expect(authMessage.token).toBe('test-token-123');
    });

    it('handles auth_success response', async () => {
        const { wsService } = await import('../websocket');
        
        const authSuccessHandler = jest.fn();
        wsService.on('auth_success', authSuccessHandler);
        
        wsService.connect('test-token-123');
        
        await new Promise(resolve => setTimeout(resolve, 20));
        
        // Simulate auth success response
        mockWsInstance?.simulateMessage({
            type: 'auth_success',
            user_id: 'user-123'
        });
        
        // Note: auth_success is handled internally, not passed to handlers
        // The service should be ready to send messages now
    });

    it('queues messages until authenticated', async () => {
        const { wsService } = await import('../websocket');
        
        wsService.connect('test-token-123');
        
        // Try to send message immediately (before auth)
        wsService.send({ type: 'message', content: 'Hello' });
        
        await new Promise(resolve => setTimeout(resolve, 20));
        
        // First message should be auth
        const firstMessage = JSON.parse(mockWsInstance!.sentMessages[0]);
        expect(firstMessage.type).toBe('auth');
    });

    it('flushes pending messages after auth_success', async () => {
        const { wsService } = await import('../websocket');
        
        wsService.connect('test-token-123');
        
        // Queue a message
        wsService.send({ type: 'message', content: 'Hello' });
        
        await new Promise(resolve => setTimeout(resolve, 20));
        
        // Simulate auth success
        mockWsInstance?.simulateMessage({
            type: 'auth_success',
            user_id: 'user-123'
        });
        
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Should have sent queued message after auth
        const messages = mockWsInstance!.sentMessages.map(m => JSON.parse(m));
        const hasQueuedMessage = messages.some(m => m.type === 'message' && m.content === 'Hello');
        expect(hasQueuedMessage).toBe(true);
    });

    it('registers and triggers event handlers', async () => {
        const { wsService } = await import('../websocket');
        
        const messageHandler = jest.fn();
        wsService.on('new_message', messageHandler);
        
        wsService.connect('test-token-123');
        
        await new Promise(resolve => setTimeout(resolve, 20));
        
        // Simulate incoming message
        mockWsInstance?.simulateMessage({
            type: 'new_message',
            content: 'Test message',
            sender_id: 'user-456'
        });
        
        expect(messageHandler).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'new_message',
                content: 'Test message'
            })
        );
    });

    it('removes event handlers with off()', async () => {
        const { wsService } = await import('../websocket');
        
        const messageHandler = jest.fn();
        wsService.on('new_message', messageHandler);
        wsService.off('new_message', messageHandler);
        
        wsService.connect('test-token-123');
        
        await new Promise(resolve => setTimeout(resolve, 20));
        
        mockWsInstance?.simulateMessage({
            type: 'new_message',
            content: 'Test message'
        });
        
        expect(messageHandler).not.toHaveBeenCalled();
    });

    it('reconnects with exponential backoff on close', async () => {
        jest.useFakeTimers();
        
        const { wsService } = await import('../websocket');
        
        wsService.connect('test-token-123');
        
        jest.advanceTimersByTime(20);
        
        // Close connection
        mockWsInstance?.close(1000, 'Normal closure');
        
        // Should schedule reconnect
        jest.advanceTimersByTime(3000); // Initial delay
        
        // WebSocket constructor should be called again
        expect((global as any).WebSocket).toHaveBeenCalledTimes(2);
        
        jest.useRealTimers();
    });
});
