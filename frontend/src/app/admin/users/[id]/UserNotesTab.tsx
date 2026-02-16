'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Send, StickyNote, Trash2 } from 'lucide-react';
import { httpClient } from '@/lib/http-client';

interface UserNotesTabProps {
    userId: string;
}

interface Note {
    id: string;
    text: string;
    type: string;
    admin_name: string;
    created_at: string;
}

const formatDate = (d: string) => {
    try {
        return new Date(d).toLocaleString('ru-RU', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    } catch { return d; }
};

const typeColors: Record<string, { bg: string; color: string; label: string }> = {
    general: { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6', label: 'Общая' },
    warning: { bg: 'rgba(249,115,22,0.15)', color: '#f97316', label: 'Предупреждение' },
    important: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', label: 'Важная' },
    positive: { bg: 'rgba(16,185,129,0.15)', color: '#10b981', label: 'Позитивная' },
};

export default function UserNotesTab({ userId }: UserNotesTabProps) {
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [text, setText] = useState('');
    const [noteType, setNoteType] = useState('general');

    const fetchNotes = useCallback(async () => {
        setLoading(true);
        try {
            const data = await httpClient.get<{ notes: Note[] }>(`/admin/users/${userId}/notes`);
            setNotes(data.notes || []);
        } catch (err) {
            console.error('Failed to load notes:', err);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchNotes();
    }, [fetchNotes]);

    const handleSubmit = async () => {
        if (!text.trim() || sending) return;
        setSending(true);
        try {
            await httpClient.post(`/admin/users/${userId}/notes`, { text: text.trim(), type: noteType });
            setText('');
            setNoteType('general');
            fetchNotes();
        } catch (err) {
            console.error('Failed to add note:', err);
        } finally {
            setSending(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Форма добавления */}
            <div style={{
                padding: 16, background: 'rgba(30,41,59,0.5)',
                borderRadius: 12, border: '1px solid rgba(148,163,184,0.15)',
            }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <select
                        value={noteType}
                        onChange={(e) => setNoteType(e.target.value)}
                        style={{
                            padding: '6px 10px', borderRadius: 8,
                            background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.2)',
                            color: '#e2e8f0', fontSize: 13, outline: 'none',
                        }}
                    >
                        <option value="general">Общая</option>
                        <option value="warning">Предупреждение</option>
                        <option value="important">Важная</option>
                        <option value="positive">Позитивная</option>
                    </select>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Добавить заметку о пользователе..."
                        onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) handleSubmit(); }}
                        style={{
                            flex: 1, padding: '10px 12px', borderRadius: 10,
                            background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.2)',
                            color: '#e2e8f0', fontSize: 13, resize: 'vertical', minHeight: 60,
                            outline: 'none', fontFamily: 'inherit',
                        }}
                    />
                    <button
                        onClick={handleSubmit}
                        disabled={!text.trim() || sending}
                        style={{
                            padding: '10px 16px', borderRadius: 10,
                            background: text.trim() ? 'rgba(59,130,246,0.8)' : 'rgba(59,130,246,0.3)',
                            border: 'none', color: '#fff', cursor: text.trim() ? 'pointer' : 'not-allowed',
                            display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600,
                            alignSelf: 'flex-end', opacity: sending ? 0.6 : 1,
                        }}
                    >
                        {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        Добавить
                    </button>
                </div>
                <div className="text-slate-500" style={{ fontSize: 11, marginTop: 6 }}>
                    Ctrl+Enter для отправки
                </div>
            </div>

            {/* Список заметок */}
            {loading ? (
                <div style={{ padding: 40, textAlign: 'center' }} className="text-slate-500">
                    <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                    Загрузка заметок...
                </div>
            ) : notes.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center' }} className="text-slate-500">
                    <StickyNote size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                    Заметок пока нет
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {notes.map((note) => {
                        const tc = typeColors[note.type] || typeColors.general;
                        return (
                            <div key={note.id} style={{
                                padding: '14px 16px', background: 'rgba(30,41,59,0.5)',
                                borderRadius: 12, border: '1px solid rgba(148,163,184,0.1)',
                                borderLeft: `3px solid ${tc.color}`,
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{
                                            padding: '2px 8px', borderRadius: 6, fontSize: 11,
                                            fontWeight: 600, background: tc.bg, color: tc.color,
                                        }}>
                                            {tc.label}
                                        </span>
                                        <span className="text-slate-400" style={{ fontSize: 12 }}>
                                            {note.admin_name}
                                        </span>
                                    </div>
                                    <span className="text-slate-500" style={{ fontSize: 11 }}>
                                        {formatDate(note.created_at)}
                                    </span>
                                </div>
                                <p className="text-slate-200" style={{ fontSize: 13, lineHeight: 1.5, margin: 0 }}>
                                    {note.text}
                                </p>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
