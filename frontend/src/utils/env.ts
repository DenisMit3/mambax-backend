/**
 * Utility to detect the current environment and provide correct API/WS URLs.
 * Handles:
 * - Server-side rendering (SSR) -> uses internal direct URL (http://127.0.0.1:8001)
 * - Client-side (Browser) -> uses Proxy path (/api_proxy) to handle CORS and Local Network access transparantly
 */

export const isServer = typeof window === 'undefined';
export const isDev = process.env.NODE_ENV === 'development';

export const getApiUrl = (): string => {
    // SSR: Must use absolute URL to the backend
    if (isServer) {
        return process.env.BACKEND_URL || "http://127.0.0.1:8001";
    }

    // Client: Use Next.js Proxy to avoid CORS and solve Local IP issues
    // The proxy is configured in next.config.ts to forward /api_proxy/* -> backend:8001/*
    return "/api_proxy";
};

export const getWsUrl = (): string => {
    if (isServer) return ""; // WS not used on server

    // Connect to the same host as the browser (localhost or 192.168.x.x)
    // Next.js will proxy /chat/ws -> backend:8001/chat/ws
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host; // e.g. "192.168.1.136:3000"

    return `${protocol}//${host}/chat/ws`;
};
