export const isServer = typeof window === 'undefined';

export const getApiUrl = (): string => {
    if (isServer) {
        return process.env.BACKEND_URL || "http://127.0.0.1:8001";
    }
    // Using the proxy configured in next.config
    return "/api_proxy";
};

export const getWsUrl = (): string => {
    if (isServer) return "";
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/chat/ws`;
};
