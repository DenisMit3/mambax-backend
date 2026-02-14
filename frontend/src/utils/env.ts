/**
 * Environment utilities for API/WS URLs.
 * Vercel-only deployment — no localhost fallbacks.
 */

export const isServer = typeof window === 'undefined';
export const isDev = process.env.NODE_ENV === 'development';

export const getApiUrl = (): string => {
    // SSR: Use absolute backend URL
    if (isServer) {
        return process.env.BACKEND_URL || "";
    }

    // Client: Use Next.js rewrite proxy to avoid CORS
    return "/api_proxy";
};

export const getWsUrl = (): string => {
    if (isServer) return "";

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;

    return `${protocol}//${host}/chat/ws`;
};
