'use client';

import { useEffect, useState } from 'react';

export default function DebugAuth() {
    const [initData, setInitData] = useState<string>('');
    const [result, setResult] = useState<string>('Loading...');

    useEffect(() => {
        const run = async () => {
            const tgData = window.Telegram?.WebApp?.initData || sessionStorage.getItem('tg_init_data') || '';
            setInitData(tgData);

            if (!tgData) {
                setResult('No initData available. Open via Telegram bot.');
                return;
            }

            try {
                const backendUrl = 'https://backend-pi-sable-56.vercel.app';
                const res = await fetch(`${backendUrl}/api/auth/telegram-debug`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ init_data: tgData }),
                });
                const data = await res.json();
                setResult(JSON.stringify(data, null, 2));
            } catch (e) {
                setResult(`Error: ${e}`);
            }
        };
        run();
    }, []);

    return (
        <div style={{ padding: 20, color: '#fff', background: '#000', minHeight: '100vh', fontFamily: 'monospace', fontSize: 12 }}>
            <h2>Debug Auth</h2>
            <p>initData length: {initData.length}</p>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', background: '#111', padding: 10, borderRadius: 8 }}>
                {initData || '(empty)'}
            </pre>
            <h3>Validation Result:</h3>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', background: '#111', padding: 10, borderRadius: 8 }}>
                {result}
            </pre>
        </div>
    );
}
