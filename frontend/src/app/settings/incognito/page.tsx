'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, EyeOff, Eye, Crown, Shield, UserX, Search } from 'lucide-react';
import { authService } from '@/services/api';
import { useHaptic } from '@/hooks/useHaptic';
import { useRequireAuth } from '@/hooks/useRequireAuth';

export default function IncognitoSettingsPage() {
    const router = useRouter();
    const haptic = useHaptic();
    const { isAuthed, isChecking } = useRequireAuth();

    const [isIncognito, setIsIncognito] = useState(false);
    const [isVip, setIsVip] = useState(false);
    const [loading, setLoading] = useState(true);
    const [toggling, setToggling] = useState(false);

    useEffect(() => {
        if (!isAuthed) return;
        Promise.all([
            authService.getIncognitoStatus().catch(() => ({ enabled: false })),
            authService.getMe().catch(() => ({ subscription_tier: 'free' })),
        ]).then(([inc, me]: any[]) => {
            setIsIncognito(inc.enabled);
            setIsVip(me.subscription_tier !== 'free');
        }).finally(() => setLoading(false));
    }, [isAuthed]);

    const toggle = useCallback(async () => {
        if (toggling) return;
        setToggling(true);
        haptic.medium();
        try {
            if (isIncognito) {
                await authService.disableIncognito();
                setIsIncognito(false);
            } else {
                await authService.enableIncognito();
                setIsIncognito(true);
            }
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : '';
            if (msg.includes('VIP') || msg.includes('403')) {
                // Not VIP
            }
            console.error('Incognito toggle failed:', e);
        } finally {
            setToggling(false);
        }
    }, [isIncognito, toggling, haptic]);

    const features = [
        { icon: Search, label: 'Скрыт от поиска', desc: 'Ваш профиль не появляется в ленте' },
        { icon: Eye, label: 'Анонимные лайки', desc: 'Ваши лайки не показывают ваш профиль' },
        { icon: UserX, label: 'Виден только избранным', desc: 'Только те, кого вы лайкнули, видят вас' },
        { icon: Shield, label: 'Полная приватность', desc: 'Никто не узнает о вашем присутствии' },
    ];

    if (isChecking || loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white pb-24">
            <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-xl border-b border-white/5">
                <div className="flex items-center gap-3 px-4 py-3">
                    <button onClick={() => { haptic.light(); router.back(); }} className="p-2 -ml-2 rounded-xl hover:bg-white/5 transition">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-lg font-semibold">Режим Инкогнито</h1>
                    {isIncognito && (
                        <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 text-[10px] font-bold">ON</span>
                    )}
                </div>
            </div>

            <div className="px-4 pt-6 space-y-6">
                {/* Hero */}
                <div className="flex flex-col items-center text-center">
                    <motion.div
                        animate={{ scale: isIncognito ? [1, 1.1, 1] : 1 }}
                        transition={{ duration: 2, repeat: isIncognito ? Infinity : 0 }}
                        className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-4 ${
                            isIncognito ? 'bg-indigo-500/15' : 'bg-slate-800/50'
                        }`}
                    >
                        <EyeOff size={36} className={isIncognito ? 'text-indigo-400' : 'text-slate-500'} />
                    </motion.div>
                    <h2 className="text-xl font-bold mb-1">
                        {isIncognito ? 'Вы невидимы' : 'Станьте невидимым'}
                    </h2>
                    <p className="text-sm text-slate-400 max-w-xs">
                        {isIncognito
                            ? 'Ваш профиль скрыт от поиска. Только те, кого вы лайкнули, могут вас видеть.'
                            : 'Включите режим Инкогнито, чтобы просматривать профили анонимно.'}
                    </p>
                </div>

                {/* Features */}
                <div className="space-y-2">
                    {features.map((f, i) => {
                        const Icon = f.icon;
                        return (
                            <motion.div
                                key={f.label}
                                initial={{ opacity: 0, x: -12 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.08 }}
                                className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-950 border border-white/5"
                            >
                                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                                    <Icon size={16} className="text-indigo-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">{f.label}</p>
                                    <p className="text-[10px] text-slate-500">{f.desc}</p>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Toggle button */}
                {isVip ? (
                    <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={toggle}
                        disabled={toggling}
                        className={`w-full py-3.5 rounded-2xl font-bold text-sm transition disabled:opacity-50 ${
                            isIncognito
                                ? 'bg-white/5 border border-white/10 text-slate-300'
                                : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
                        }`}
                    >
                        {toggling ? 'Обработка...' : isIncognito ? 'Выключить Инкогнито' : 'Включить Инкогнито'}
                    </motion.button>
                ) : (
                    <div className="space-y-3">
                        <div className="rounded-2xl bg-amber-500/5 border border-amber-500/15 p-4 flex items-center gap-3">
                            <Crown size={20} className="text-amber-400 shrink-0" />
                            <p className="text-xs text-slate-300">
                                Режим Инкогнито доступен только для VIP пользователей
                            </p>
                        </div>
                        <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={() => router.push('/profile/premium')}
                            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm"
                        >
                            <span className="flex items-center justify-center gap-2">
                                <Crown size={16} />
                                Получить VIP
                            </span>
                        </motion.button>
                    </div>
                )}
            </div>
        </div>
    );
}
