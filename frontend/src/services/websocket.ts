import { getWsUrl } from "@/utils/env";

type WebSocketMessage = {
    type: string;
    [key: string]: any;
};

type WebSocketHandler = (data: WebSocketMessage) => void;

class WebSocketService {
    private socket: WebSocket | null = null;
    private handlers: Map<string, WebSocketHandler[]> = new Map();
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private token: string | null = null;
    private isConnecting: boolean = false;
    private url: string;

    constructor() {
        this.url = getWsUrl();
    }

    connect(token: string) {
        if (this.socket?.readyState === WebSocket.OPEN) return;
        if (this.isConnecting) return;

        this.token = token;
        this.isConnecting = true;

        try {
            this.socket = new WebSocket(`${this.url}/${token}`);

            this.socket.onopen = () => {
                console.log("WebSocket connected");
                this.isConnecting = false;
                if (this.reconnectTimeout) {
                    clearTimeout(this.reconnectTimeout);
                    this.reconnectTimeout = null;
                }
            };

            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.trigger(data.type, data);
                    // Also trigger wildcard handler
                    this.trigger('*', data);
                } catch (e) {
                    console.error("WS Parse Error", e);
                }
            };

            this.socket.onclose = (event) => {
                console.log("WebSocket closed", event.code, event.reason);
                this.socket = null;
                this.isConnecting = false;
                // Auto reconnect after 3s
                this.reconnectTimeout = setTimeout(() => {
                    if (this.token) this.connect(this.token);
                }, 3000);
            };

            this.socket.onerror = (error) => {
                console.error("WebSocket error", error);
                this.socket?.close();
            };

        } catch (e) {
            console.error("WS Connection Failed", e);
            this.isConnecting = false;
        }
    }

    send(data: WebSocketMessage) {
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(data));
        } else {
            console.warn("WebSocket not ready, queuing not implemented");
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
