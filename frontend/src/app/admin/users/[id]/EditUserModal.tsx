'use client';

import { useState } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { httpClient } from '@/lib/http-client';
import { UserDetail } from './types';

interface EditUserModalProps {
    user: UserDetail;
    onClose: () => void;
    onSaved: () => void;
}

export default function EditUserModal({ user, onClose, onSaved }: EditUserModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        age: user.age || 18,
        bio: user.bio || '',
        city: user.city || '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!form.name.trim()) {
            setError('Имя обязательно');
            return;
        }

        setLoading(true);
        try {
            const payload: Record<string, unknown> = {};
            if (form.name !== (user.name || '')) payload.name = form.name.trim();
            if (form.email !== (user.email || '')) payload.email = form.email.trim() || null;
            if (form.phone !== (user.phone || '')) payload.phone = form.phone.trim() || null;
            if (form.age !== (user.age || 18)) payload.age = form.age;
            if (form.bio !== (user.bio || '')) payload.bio = form.bio.trim() || null;
            if (form.city !== (user.city || '')) payload.city = form.city.trim() || null;

            if (Object.keys(payload).length === 0) {
                onClose();
                return;
            }

            await httpClient.put(`/admin/users/${user.id}/edit`, payload);
            onSaved();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Ошибка сохранения');
        } finally {
            setLoading(false);
        }
    };

    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '8px 12px', borderRadius: 8,
        background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.2)',
        color: '#e2e8f0', fontSize: 13, outline: 'none', fontFamily: 'inherit',
    };
    const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
            <div
                style={{
                    position: 'relative', width: '100%', maxWidth: 480,
                    background: 'rgba(26,26,46,0.95)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 16, maxHeight: '90vh', overflowY: 'auto',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>Редактировать профиль</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 4 }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {error && (
                        <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: 13 }}>
                            {error}
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label style={labelStyle}>Имя *</label>
                            <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                        </div>
                        <div>
                            <label style={labelStyle}>Возраст</label>
                            <input type="number" style={inputStyle} min={18} max={120} value={form.age} onChange={(e) => setForm({ ...form, age: parseInt(e.target.value) || 18 })} />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label style={labelStyle}>Email</label>
                            <input type="email" style={inputStyle} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
                        </div>
                        <div>
                            <label style={labelStyle}>Телефон</label>
                            <input style={inputStyle} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+7..." />
                        </div>
                    </div>

                    <div>
                        <label style={labelStyle}>Город</label>
                        <input style={inputStyle} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Москва" />
                    </div>

                    <div>
                        <label style={labelStyle}>О себе</label>
                        <textarea
                            style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }}
                            value={form.bio}
                            onChange={(e) => setForm({ ...form, bio: e.target.value })}
                            placeholder="Описание..."
                        />
                    </div>

                    <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                flex: 1, padding: '10px 16px', borderRadius: 10,
                                border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
                                color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer',
                            }}
                        >
                            Отмена
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                flex: 1, padding: '10px 16px', borderRadius: 10,
                                border: 'none', background: 'rgba(59,130,246,0.8)',
                                color: '#fff', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                opacity: loading ? 0.6 : 1,
                            }}
                        >
                            {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            {loading ? 'Сохранение...' : 'Сохранить'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
