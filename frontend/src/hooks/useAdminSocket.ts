import { useEffect, useState, useRef } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const WS_BASE = API_BASE.replace(/^http/, 'ws').replace(/\/$/, '');

interface AdminSocketHook {
    isConnected: boolean;
    metrics: any | null;
    activity: any[] | null;
    analytics: any | null;
    error: string | null;
}

export function useAdminSocket(): AdminSocketHook {
    const [isConnected, setIsConnected] = useState(false);
    const [metrics, setMetrics] = useState<any | null>(null);
    const [activity, setActivity] = useState<any[] | null>(null);
    const [analytics, setAnalytics] = useState<any | null>(null);
    const [error, setError] = useState<string | null>(null);
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        // Get token from local storage (simplified for this task)
        const token = localStorage.getItem('token');
        if (!token) {
            setError('No authentication token found');
            return;
        }

        const wsUrl = `${WS_BASE}/admin/ws?token=${token}`;

        try {
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                setIsConnected(true);
                setError(null);
                console.log('Admin WebSocket Connected');
            };

            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);

                    if (message.type === 'metrics') {
                        setMetrics((prev: any) => ({ ...prev, ...message.data }));
                    } else if (message.type === 'activity') {
                        setActivity(message.data);
                    } else if (message.type === 'analytics') {
                        setAnalytics(message.data);
                    }
                } catch (e) {
                    console.error('Failed to parse websocket message', e);
                }
            };

            ws.onclose = () => {
                setIsConnected(false);
                console.log('Admin WebSocket Disconnected');
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
