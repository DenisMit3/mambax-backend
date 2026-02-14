'use client';

import { useState, useEffect } from 'react';
import { DollarSign } from 'lucide-react';
import { httpClient } from '@/lib/http-client';
import { PaymentRecord } from './types';

interface PaymentHistoryProps {
    userId: string;
}

// Цвет статуса платежа
const statusColor = (status: string) => {
    switch (status) {
        case 'completed': return '#10b981';
        case 'pending': return '#f59e0b';
        case 'failed': return '#ef4444';
        case 'refunded': return '#8b5cf6';
        default: return '#64748b';
    }
};

// Форматирование даты
const formatDate = (d: string) => {
    try {
        return new Date(d).toLocaleString('ru-RU', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    } catch { return d; }
};

export default function PaymentHistory({ userId }: PaymentHistoryProps) {
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const fetchPayments = async () => {
        setLoading(true);
        setError(false);
        try {
            const data = await httpClient.get<{ payments: PaymentRecord[] }>(`/admin/users/${userId}/payments`);
            setPayments(data.payments || []);
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let cancelled = false;
        fetchPayments().then(() => { if (cancelled) return; });
        return () => { cancelled = true; };
    }, [userId]);

    if (loading) return (
        <div className="loading-state text-slate-500" style={{ padding: 40, textAlign: 'center' }}>
            Загрузка платежей...
        </div>
    );

    if (error) return (
        <div className="no-data text-red-500" style={{ padding: 40, textAlign: 'center' }}>
            Не удалось загрузить платежи.{' '}
            <button
                onClick={fetchPayments}
                className="text-blue-500"
                style={{ background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
                Повторить
            </button>
        </div>
    );

    if (payments.length === 0) return (
        <div className="no-data text-slate-500" style={{ padding: 40, textAlign: 'center' }}>
            Нет истории платежей.
        </div>
    );

    return (
        <div className="payments-list" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {payments.map((p) => (
                <div key={p.id} style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    padding: '16px 20px', background: 'rgba(30,41,59,0.5)',
                    borderRadius: 12, border: '1px solid rgba(148,163,184,0.15)'
                }}>
                    <div style={{
                        width: 40, height: 40, borderRadius: 10,
                        background: 'rgba(59,130,246,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <DollarSign size={20} className="text-blue-500" />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }} className="text-slate-100">
                            {p.description || p.type}
                        </div>
                        <div className="text-slate-500" style={{ fontSize: 12 }}>
                            {formatDate(p.created_at)}
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div className="text-slate-100" style={{ fontWeight: 700, fontSize: 16 }}>
                            {p.amount} {p.currency}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: statusColor(p.status), textTransform: 'uppercase' }}>
                            {p.status}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
