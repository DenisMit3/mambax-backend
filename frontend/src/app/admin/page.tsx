'use client';

import { useState, useEffect } from 'react';
import { AdminVisionTerminal } from '@/components/admin/AdminVisionTerminal';
import { AdminGatekeeper } from '@/components/admin/AdminGatekeeper';

export default function AdminPage() {
    const [unlocked, setUnlocked] = useState(false);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const session = sessionStorage.getItem('admin_session');
        if (session === 'active') {
            setUnlocked(true);
        }
        setChecking(false);
    }, []);

    const handleUnlock = () => {
        sessionStorage.setItem('admin_session', 'active');
        setUnlocked(true);
    };

    if (checking) return null;

    if (!unlocked) {
        return <AdminGatekeeper onUnlock={handleUnlock} />;
    }

    return (
        <main>
            <AdminVisionTerminal />
        </main>
    );
}
