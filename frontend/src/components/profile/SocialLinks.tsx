'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link2, Plus, X, Check, Instagram, Music } from 'lucide-react';
import { authService } from '@/services/api';
import { useHaptic } from '@/hooks/useHaptic';

interface SocialLinksProps {
    links: Record<string, string>;
    editable?: boolean;
    onUpdate?: (links: Record<string, string>) => void;
}

const PLATFORMS = [
    { key: 'instagram', label: 'Instagram', icon: Instagram, placeholder: '@username', color: 'text-pink-400' },
    { key: 'telegram', label: 'Telegram', icon: Link2, placeholder: '@username', color: 'text-blue-400' },
    { key: 'tiktok', label: 'TikTok', icon: Music, placeholder: '@username', color: 'text-slate-300' },
    { key: 'spotify', label: 'Spotify', icon: Music, placeholder: 'Ссылка на профиль', color: 'text-green-400' },
];

export function SocialLinks({ links, editable = false, onUpdate }: SocialLinksProps) {
    const haptic = useHaptic();
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState<Record<string, string>>(links || {});
    const [saving, setSaving] = useState(false);

    const save = useCallback(async () => {
        setSaving(true);
        haptic.medium();
        try {
            // Filter out empty values
            const cleaned = Object.fromEntries(
                Object.entries(draft).filter(([, v]) => v.trim())
            );
            await authService.updateProfile({ social_links: cleaned });
            onUpdate?.(cleaned);
            setEditing(false);
            haptic.success();
        } catch (e) {
            console.error('Save social links failed:', e);
            haptic.error();
        } finally {
            setSaving(false);
        }
    }, [draft, haptic, onUpdate]);

    const filledLinks = PLATFORMS.filter(p => links[p.key]);

    if (!editable && filledLinks.length === 0) return null;

    return (
        <div className="mb-6">
            <div className="flex items-center justify-between px-1 mb-3">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Соцсети</p>
                {editable && !editing && (
                    <button
                        onClick={() => { haptic.light(); setEditing(true); setDraft(links || {}); }}
                        className="text-[10px] text-purple-400 font-medium"
                    >
                        Изменить
                    </button>
                )}
            </div>

            {editing ? (
                <div className="space-y-2">
                    {PLATFORMS.map(platform => {
                        const Icon = platform.icon;
                        return (
                            <div key={platform.key} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-white/5">
                                <Icon size={16} className={platform.color} />
                                <input
                                    type="text"
                                    value={draft[platform.key] || ''}
                                    onChange={e => setDraft(prev => ({ ...prev, [platform.key]: e.target.value }))}
                                    placeholder={platform.placeholder}
                                    className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 focus:outline-none"
                                />
                                {draft[platform.key] && (
                                    <button onClick={() => setDraft(prev => ({ ...prev, [platform.key]: '' }))}>
                                        <X size={14} className="text-slate-500" />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                    <div className="flex gap-2 mt-2">
                        <button
                            onClick={() => setEditing(false)}
                            className="flex-1 py-2 rounded-xl bg-white/5 text-xs text-slate-400 font-medium"
                        >
                            Отмена
                        </button>
                        <button
                            onClick={save}
                            disabled={saving}
                            className="flex-1 py-2 rounded-xl bg-purple-600 text-xs text-white font-medium disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                            <Check size={12} />
                            {saving ? 'Сохранение...' : 'Сохранить'}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-wrap gap-2">
                    {filledLinks.map(platform => {
                        const Icon = platform.icon;
                        return (
                            <motion.div
                                key={platform.key}
                                whileTap={{ scale: 0.95 }}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/5"
                            >
                                <Icon size={14} className={platform.color} />
                                <span className="text-xs text-slate-300">{links[platform.key]}</span>
                            </motion.div>
                        );
                    })}
                    {editable && filledLinks.length < PLATFORMS.length && (
                        <button
                            onClick={() => { haptic.light(); setEditing(true); setDraft(links || {}); }}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-dashed border-white/10 text-xs text-slate-500"
                        >
                            <Plus size={12} />
                            Добавить
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
