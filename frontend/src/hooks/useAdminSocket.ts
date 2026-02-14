import { useEffect, useState, useRef } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
const WS_BASE = API_BASE.replace(/^http/, 'ws').replace(/\/$/, '');

interface AdminMetrics {
    total_users?: number;
    active_users?: number;
    revenue?: number;
    [key: string]: unknown;
}

interface AdminActivity {
    id: string;
    type: string;
    timestamp: string;
    [key: string]: unknown;
}

interface AdminAnalytics {
    daily_active?: number;
    monthly_active?: number;
    [key: string]: unknown;
}

interface AdminSocketHook {
    isConnected: boolean;
    metrics: AdminMetrics | null;
    activity: AdminActivity[] | null;
    analytics: AdminAnalytics | null;
    error: string | null;
}

export function useAdminSocket(): AdminSocketHook {
    const [isConnected, setIsConnected] = useState(false);
    const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
    const [activity, setActivity] = useState<AdminActivity[] | null>(null);
    const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
    const [error, setError] = useState<string | null>(null);
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        // Get token from local storage (simplified for this task)
        let token: string | null = null;
        try { token = localStorage.getItem('token'); } catch { /* SSR/private browsing */ }

        if (!token) {
            setError('No authentication token found');
            return;
        }

        // Use relative URL to leverage Next.js proxy and avoid CORS/Origin issues
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        let wsUrl = `${protocol}//${window.location.host}/admin/ws?token=${token}`;

        try {
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                setIsConnected(true);
                setError(null);
            };

            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);

                    if (message.type === 'metrics') {
                        setMetrics((prev: AdminMetrics | null) => ({ ...prev, ...message.data }));
                    } else if (message.type === 'activity') {
                        setActivity(message.data);
                    } else if (message.type === 'analytics') {
                        setAnalytics(message.data);
                    }
                } catch (e) {
                    console.error('Failed to parse websocket message', e);
                }
            };

            ws.onclose = (event) => {
                setIsConnected(false);
            };

            ws.onerror = (event) => {
                setError('WebSocket connection error');
                console.error('WebSocket error', event);
            };

            return () => {
                ws.close();
            };
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to connect to WebSocket');
        }
    }, []);

    return { isConnected, metrics, activity, analytics, error };
}
