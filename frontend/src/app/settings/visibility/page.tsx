'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Eye, EyeOff, MapPin, Clock, Check, Ruler, CheckCheck } from 'lucide-react';
import { authService } from '@/services/api';
import { useHaptic } from '@/hooks/useHaptic';
import { useRequireAuth } from '@/hooks/useRequireAuth';

interface VisibilitySettings {
    show_online_status: boolean;
    show_last_seen: boolean;
    show_distance: boolean;
    show_age: boolean;
    read_receipts: boolean;
}

const DEFAULTS: VisibilitySettings = {
    show_online_status: true,
    show_last_seen: true,
    show_distance: true,
    show_age: true,
    read_receipts: true,
};

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => onChange(!checked)}
            className={`w-11 h-6 rounded-full relative transition-colors duration-300 shrink-0 ${
                checked ? 'bg-purple-500' : 'bg-white/10'
            }`}
        >
            <motion.div
                className="w-5 h-5 bg-white rounded-full absolute top-0.5"
                animate={{ x: checked ? 22 : 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
        </motion.button>
    );
}

export default function VisibilitySettingsPage() {
    const router = useRouter();
    const haptic = useHaptic();
    const { isAuthed, isChecking } = useRequireAuth();

    const [settings, setSettings] = useState<VisibilitySettings>(DEFAULTS);
    const [loading, setLoading] = useState(true);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (!isAuthed) return;
        authService.getVisibilitySettings()
            .then((data: any) => setSettings(prev => ({ ...prev, ...data })))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [isAuthed]);

    const update = useCallback((key: keyof VisibilitySettings, value: boolean) => {
        haptic.light();
        setSettings(prev => {
            const next = { ...prev, [key]: value };
            authService.updateVisibilitySettings(next)
                .then(() => { setSaved(true); setTimeout(() => setSaved(false), 1500); })
                .catch(() => {});
            return next;
        });
    }, [haptic]);

    const items = [
        { key: 'show_online_status' as const, icon: Eye, label: 'Онлайн статус', desc: 'Показывать зелёный индикатор когда вы онлайн', color: 'bg-green-500/20 text-green-400' },
        { key: 'show_last_seen' as const, icon: Clock, label: 'Был(а) в сети', desc: 'Показывать время последнего визита', color: 'bg-blue-500/20 text-blue-400' },
        { key: 'show_distance' as const, icon: MapPin, label: 'Расстояние', desc: 'Показывать расстояние до вас', color: 'bg-pink-500/20 text-pink-400' },
        { key: 'show_age' as const, icon: Ruler, label: 'Возраст', desc: 'Показывать ваш возраст в профиле', color: 'bg-amber-500/20 text-amber-400' },
        { key: 'read_receipts' as const, icon: CheckCheck, label: 'Прочитано', desc: 'Показывать статус прочтения сообщений', color: 'bg-purple-500/20 text-purple-400' },
    ];

    if (isChecking || loading) {
        return (
            <div className="min-h-dvh bg-black flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-dvh bg-black text-white pb-24">
            <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-xl border-b border-white/5">
                <div className="flex items-center gap-3 px-4 py-3">
                    <button onClick={() => { haptic.light(); router.back(); }} className="p-2 -ml-2 rounded-xl hover:bg-white/5 transition">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-lg font-semibold flex-1">Видимость</h1>
                    <AnimatePresence>
                        {saved && (
                            <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1 text-green-400 text-xs">
                                <Check size={14} /> Сохранено
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <div className="px-4 pt-4">
                <div className="rounded-2xl bg-slate-950 border border-white/5 overflow-hidden divide-y divide-white/5">
                    {items.map((item, i) => {
                        const Icon = item.icon;
                        const colors = item.color.split(' ');
                        return (
                            <motion.div
                                key={item.key}
                                initial={{ opacity: 0, x: -12 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="flex items-center gap-3 px-4 py-4"
                            >
                                <div className={`w-9 h-9 rounded-xl ${colors[0]} flex items-center justify-center shrink-0`}>
                                    <Icon size={16} className={colors[1]} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white">{item.label}</p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">{item.desc}</p>
                                </div>
                                <Toggle checked={settings[item.key]} onChange={v => update(item.key, v)} />
                            </motion.div>
                        );
                    })}
                </div>

                <p className="text-[10px] text-slate-600 text-center mt-4 px-4">
                    Отключение видимости может снизить количество матчей, так как другие пользователи не смогут видеть вашу активность.
                </p>
            </div>
        </div>
    );
}
