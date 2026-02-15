'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Bell, BellOff, Heart, MessageCircle, Star, Eye,
    Gift, Megaphone, Moon, Volume2, VolumeX, Send, Check, Clock
} from 'lucide-react';
import { authService } from '@/services/api';
import { useHaptic } from '@/hooks/useHaptic';
import { useRequireAuth } from '@/hooks/useRequireAuth';

interface NotifSettings {
    new_match: boolean;
    new_message: boolean;
    new_like: boolean;
    super_like: boolean;
    profile_view: boolean;
    match_reminder: boolean;
    promotion: boolean;
}

const DEFAULT_SETTINGS: NotifSettings = {
    new_match: true,
    new_message: true,
    new_like: true,
    super_like: true,
    profile_view: false,
    match_reminder: true,
    promotion: false,
};

interface ToggleRowProps {
    icon: React.ElementType;
    label: string;
    description: string;
    color: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}

function ToggleRow({ icon: Icon, label, description, color, checked, onChange }: ToggleRowProps) {
    return (
        <div className="flex items-center gap-3 py-3">
            <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center shrink-0`}>
                <Icon size={16} className="text-white/80" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{description}</p>
            </div>
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
        </div>
    );
}

export default function NotificationSettingsPage() {
    const router = useRouter();
    const haptic = useHaptic();
    const { isAuthed, isChecking } = useRequireAuth();

    const [settings, setSettings] = useState<NotifSettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [saved, setSaved] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [quietStart, setQuietStart] = useState('23:00');
    const [quietEnd, setQuietEnd] = useState('08:00');
    const [quietEnabled, setQuietEnabled] = useState(false);
    const [testSending, setTestSending] = useState(false);
    const [testSent, setTestSent] = useState(false);

    useEffect(() => {
        if (!isAuthed) return;
        authService.getNotificationSettings()
            .then((data: any) => {
                setSettings(prev => ({ ...prev, ...data }));
                if (data.quiet_hours_start) {
                    setQuietStart(data.quiet_hours_start);
                    setQuietEnd(data.quiet_hours_end || '08:00');
                    setQuietEnabled(true);
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));

        // Load sound preference from localStorage
        const sound = localStorage.getItem('notification_sound');
        if (sound !== null) setSoundEnabled(sound === 'true');
    }, [isAuthed]);

    const updateSetting = useCallback((key: keyof NotifSettings, value: boolean) => {
        haptic.light();
        setSettings(prev => {
            const next = { ...prev, [key]: value };
            authService.updateNotificationSettings(next)
                .then(() => { setSaved(true); setTimeout(() => setSaved(false), 1500); })
                .catch(() => {});
            return next;
        });
    }, [haptic]);

    const toggleSound = useCallback((v: boolean) => {
        haptic.light();
        setSoundEnabled(v);
        localStorage.setItem('notification_sound', String(v));
    }, [haptic]);

    const toggleQuiet = useCallback((v: boolean) => {
        haptic.light();
        setQuietEnabled(v);
        if (!v) {
            authService.updateNotificationSettings({ ...settings }).catch(() => {});
        }
    }, [haptic, settings]);

    const sendTestPush = useCallback(async () => {
        if (testSending) return;
        setTestSending(true);
        haptic.medium();
        try {
            await authService.testNotification();
            setTestSent(true);
            setTimeout(() => setTestSent(false), 3000);
        } catch (e) {
            console.error('Test push failed:', e);
        } finally {
            setTestSending(false);
        }
    }, [testSending, haptic]);

    if (isChecking || loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white pb-24">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-xl border-b border-white/5">
                <div className="flex items-center gap-3 px-4 py-3">
                    <button
                        onClick={() => { haptic.light(); router.back(); }}
                        className="p-2 -ml-2 rounded-xl hover:bg-white/5 transition"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-lg font-semibold flex-1">Настройки уведомлений</h1>
                    <AnimatePresence>
                        {saved && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                className="flex items-center gap-1 text-green-400 text-xs"
                            >
                                <Check size={14} />
                                Сохранено
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <div className="px-4 pt-4 space-y-6">
                {/* Push notifications section */}
                <section>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-3">Push-уведомления</p>
                    <div className="rounded-2xl bg-slate-950 border border-white/5 px-4 divide-y divide-white/5">
                        <ToggleRow
                            icon={Heart}
                            label="Новый матч"
                            description="Когда кто-то тоже лайкнул вас"
                            color="bg-pink-500/20"
                            checked={settings.new_match}
                            onChange={v => updateSetting('new_match', v)}
                        />
                        <ToggleRow
                            icon={MessageCircle}
                            label="Новое сообщение"
                            description="Входящие сообщения в чате"
                            color="bg-green-500/20"
                            checked={settings.new_message}
                            onChange={v => updateSetting('new_message', v)}
                        />
                        <ToggleRow
                            icon={Heart}
                            label="Новый лайк"
                            description="Когда кто-то лайкнул ваш профиль"
                            color="bg-red-500/20"
                            checked={settings.new_like}
                            onChange={v => updateSetting('new_like', v)}
                        />
                        <ToggleRow
                            icon={Star}
                            label="Суперлайк"
                            description="Когда вам поставили суперлайк"
                            color="bg-blue-500/20"
                            checked={settings.super_like}
                            onChange={v => updateSetting('super_like', v)}
                        />
                        <ToggleRow
                            icon={Eye}
                            label="Просмотр профиля"
                            description="Когда кто-то посмотрел ваш профиль"
                            color="bg-cyan-500/20"
                            checked={settings.profile_view}
                            onChange={v => updateSetting('profile_view', v)}
                        />
                        <ToggleRow
                            icon={Gift}
                            label="Напоминание о матчах"
                            description="Напоминание написать непрочитанным матчам"
                            color="bg-purple-500/20"
                            checked={settings.match_reminder}
                            onChange={v => updateSetting('match_reminder', v)}
                        />
                        <ToggleRow
                            icon={Megaphone}
                            label="Акции и новости"
                            description="Специальные предложения и обновления"
                            color="bg-amber-500/20"
                            checked={settings.promotion}
                            onChange={v => updateSetting('promotion', v)}
                        />
                    </div>
                </section>

                {/* Sound & Quiet Hours */}
                <section>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-3">Звук и режим</p>
                    <div className="rounded-2xl bg-slate-950 border border-white/5 px-4 divide-y divide-white/5">
                        <ToggleRow
                            icon={soundEnabled ? Volume2 : VolumeX}
                            label="Звук уведомлений"
                            description="Воспроизводить звук при получении"
                            color="bg-indigo-500/20"
                            checked={soundEnabled}
                            onChange={toggleSound}
                        />
                        <ToggleRow
                            icon={Moon}
                            label="Тихие часы"
                            description="Не беспокоить в указанное время"
                            color="bg-slate-500/20"
                            checked={quietEnabled}
                            onChange={toggleQuiet}
                        />
                    </div>

                    {/* Quiet hours time pickers */}
                    <AnimatePresence>
                        {quietEnabled && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="mt-2 p-4 rounded-2xl bg-slate-950 border border-white/5">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Clock size={14} className="text-slate-400" />
                                        <span className="text-xs text-slate-400">Не беспокоить с</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="time"
                                            value={quietStart}
                                            onChange={e => setQuietStart(e.target.value)}
                                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50"
                                        />
                                        <span className="text-slate-500 text-sm">до</span>
                                        <input
                                            type="time"
                                            value={quietEnd}
                                            onChange={e => setQuietEnd(e.target.value)}
                                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50"
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </section>

                {/* Test push */}
                <section>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-3">Тестирование</p>
                    <button
                        onClick={sendTestPush}
                        disabled={testSending}
                        className="w-full p-4 rounded-2xl bg-slate-950 border border-white/5 flex items-center gap-3 hover:bg-white/[0.03] transition disabled:opacity-50"
                    >
                        <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center">
                            <Send size={16} className="text-purple-400" />
                        </div>
                        <div className="flex-1 text-left">
                            <p className="text-sm font-medium text-white">Отправить тестовое уведомление</p>
                            <p className="text-[10px] text-slate-500">Проверить работу push-уведомлений</p>
                        </div>
                        {testSent && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="text-green-400"
                            >
                                <Check size={18} />
                            </motion.div>
                        )}
                    </button>
                </section>
            </div>
        </div>
    );
}
