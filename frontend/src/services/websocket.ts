import { getWsUrl } from "@/utils/env";

type WebSocketMessage = {
    type: string;
    [key: string]: unknown;
};

type WebSocketHandler = (data: WebSocketMessage) => void;

// FIX (MEM): Limit pending messages to prevent unbounded growth
const MAX_PENDING_MESSAGES = 100;
// FIX (STABILITY): Exponential backoff for reconnection
const INITIAL_RECONNECT_DELAY = 3000;
const MAX_RECONNECT_DELAY = 60000;
const MAX_RECONNECT_ATTEMPTS = 5;

class WebSocketService {
    private socket: WebSocket | null = null;
    private handlers: Map<string, WebSocketHandler[]> = new Map();
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private token: string | null = null;
    private isConnecting: boolean = false;
    private url: string;
    private pendingMessages: WebSocketMessage[] = [];
    private reconnectDelay: number = INITIAL_RECONNECT_DELAY; // FIX: Track backoff delay
    private reconnectAttempts = 0;

    constructor() {
        this.url = getWsUrl();
    }

    connect(token: string) {
        if (this.socket?.readyState === WebSocket.OPEN) return;
        if (this.isConnecting) return;

        this.token = token;
        this.isConnecting = true;

        try {
            // FIX (SEC-005): Connect without token in URL, send via first message
            this.socket = new WebSocket(this.url);

            this.socket.onopen = () => {
                this.reconnectAttempts = 0;
                this.reconnectDelay = INITIAL_RECONNECT_DELAY;
                // Send auth message immediately after connection
                this.socket?.send(JSON.stringify({ type: "auth", token: this.token }));
            };
            
            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    // Handle auth success
                    if (data.type === "auth_success") {
                        this.isConnecting = false;
                        this.reconnectDelay = INITIAL_RECONNECT_DELAY;
                        if (this.reconnectTimeout) {
                            clearTimeout(this.reconnectTimeout);
                            this.reconnectTimeout = null;
                        }
                        // Flush pending messages after auth
                        this.flushPendingMessages();
                        return;
                    }
                    
                    this.trigger(data.type, data);
                    // Also trigger wildcard handler
                    this.trigger('*', data);
                } catch (e) {
                    console.error("WS Parse Error", e);
                }
            };

            this.socket.onclose = (event) => {
                this.socket = null;
                this.isConnecting = false;

                // FIX (STABILITY): Exponential backoff with jitter
                if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
                    console.warn('[WS] Max reconnect attempts reached, stopping');
                    return;
                }
                this.reconnectAttempts++;

                const jitter = Math.random() * 1000; // 0-1s random jitter
                const delay = Math.min(this.reconnectDelay + jitter, MAX_RECONNECT_DELAY);

                this.reconnectTimeout = setTimeout(() => {
                    if (this.token) this.connect(this.token);
                }, delay);

                // Increase delay for next attempt (exponential)
                this.reconnectDelay = Math.min(this.reconnectDelay * 2, MAX_RECONNECT_DELAY);
            };

            this.socket.onerror = (error) => {
                // Silently handle WS errors in dev (backend WS may be unavailable)
                // console.error("WebSocket error", error);
                this.socket?.close();
            };

        } catch (e) {
            console.error("WS Connection Failed", e);
            this.isConnecting = false;
        }
    }

    // FIX: Flush queued messages when connection is restored
    private flushPendingMessages() {
        while (this.pendingMessages.length > 0 && this.socket?.readyState === WebSocket.OPEN) {
            const msg = this.pendingMessages.shift();
            if (msg) {
                this.socket.send(JSON.stringify(msg));
            }
        }
    }

    send(data: WebSocketMessage) {
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(data));
        } else {
            // FIX (MEM): Limit queue size to prevent memory leak
            if (this.pendingMessages.length >= MAX_PENDING_MESSAGES) {
                this.pendingMessages.shift(); // Remove oldest
            }
            this.pendingMessages.push(data);
        }
    }

    on(type: string, handler: WebSocketHandler) {
        if (!this.handlers.has(type)) {
            this.handlers.set(type, []);
        }
        this.handlers.get(type)?.push(handler);
    }

    off(type: string, handler: WebSocketHandler) {
        const handlers = this.handlers.get(type);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index !== -1) {
                handlers.splice(index, 1);
            }
        }
    }

    private trigger(type: string, data: WebSocketMessage) {
        const typeHandlers = this.handlers.get(type);
        if (typeHandlers) {
            typeHandlers.forEach(h => h(data));
        }
    }

    disconnect() {
        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
        this.socket?.close();
        this.socket = null;
    }
}

export const wsService = new WebSocketService();
