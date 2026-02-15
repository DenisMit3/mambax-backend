'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    ArrowLeft, Shield, Smartphone, Lock, Unlock, ChevronRight,
    Check, AlertTriangle, RefreshCw
} from 'lucide-react';
import { authService } from '@/services/api';
import { useHaptic } from '@/hooks/useHaptic';
import { useRequireAuth } from '@/hooks/useRequireAuth';

interface Device {
    id: string;
    user_agent: string;
    platform?: string;
    last_active: string;
}

export default function SecuritySettingsPage() {
    const router = useRouter();
    const haptic = useHaptic();
    const { isAuthed, isChecking } = useRequireAuth();

    const [twoFAEnabled, setTwoFAEnabled] = useState(false);
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);
    const [toggling2FA, setToggling2FA] = useState(false);

    useEffect(() => {
        if (!isAuthed) return;
        Promise.all([
            authService.get2FAStatus().catch(() => ({ enabled: false })),
            authService.getDevices().catch(() => ({ devices: [] })),
        ]).then(([tfa, dev]) => {
            setTwoFAEnabled(tfa.enabled);
            setDevices(dev.devices || []);
        }).finally(() => setLoading(false));
    }, [isAuthed]);

    const toggle2FA = useCallback(async () => {
        if (toggling2FA) return;
        setToggling2FA(true);
        haptic.medium();
        try {
            if (twoFAEnabled) {
                await authService.disable2FA();
                setTwoFAEnabled(false);
            } else {
                await authService.enable2FA('telegram');
                setTwoFAEnabled(true);
            }
        } catch (e) {
            console.error('2FA toggle failed:', e);
        } finally {
            setToggling2FA(false);
        }
    }, [twoFAEnabled, toggling2FA, haptic]);

    function parsePlatform(ua: string): string {
        if (ua.includes('Android')) return '📱 Android';
        if (ua.includes('iPhone') || ua.includes('iPad')) return '📱 iOS';
        if (ua.includes('Windows')) return '💻 Windows';
        if (ua.includes('Mac')) return '💻 macOS';
        if (ua.includes('Linux')) return '💻 Linux';
        return '🌐 Браузер';
    }

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
                    <h1 className="text-lg font-semibold">Безопасность</h1>
                </div>
            </div>

            <div className="px-4 pt-4 space-y-6">
                {/* 2FA Section */}
                <section>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-1 mb-2">Двухфакторная аутентификация</p>
                    <div className="rounded-2xl bg-slate-950 border border-white/5 p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${twoFAEnabled ? 'bg-green-500/15' : 'bg-slate-700/30'}`}>
                                {twoFAEnabled ? <Lock size={20} className="text-green-400" /> : <Unlock size={20} className="text-slate-400" />}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-white">
                                    2FA {twoFAEnabled ? 'включена' : 'выключена'}
                                </p>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                    {twoFAEnabled ? 'Код через Telegram при входе' : 'Дополнительная защита аккаунта'}
                                </p>
                            </div>
                            <div className={`w-3 h-3 rounded-full ${twoFAEnabled ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]' : 'bg-slate-600'}`} />
                        </div>

                        <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={toggle2FA}
                            disabled={toggling2FA}
                            className={`w-full py-2.5 rounded-xl font-medium text-sm transition disabled:opacity-50 ${
                                twoFAEnabled
                                    ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                                    : 'bg-green-500/10 border border-green-500/20 text-green-400'
                            }`}
                        >
                            {toggling2FA ? (
                                <span className="flex items-center justify-center gap-2">
                                    <RefreshCw size={14} className="animate-spin" />
                                    Обработка...
                                </span>
                            ) : twoFAEnabled ? 'Отключить 2FA' : 'Включить 2FA'}
                        </motion.button>
                    </div>
                </section>

                {/* Devices */}
                <section>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-1 mb-2">
                        Устройства ({devices.length})
                    </p>
                    <div className="rounded-2xl bg-slate-950 border border-white/5 overflow-hidden divide-y divide-white/5">
                        {devices.length === 0 ? (
                            <div className="p-6 text-center">
                                <Smartphone size={24} className="text-slate-600 mx-auto mb-2" />
                                <p className="text-xs text-slate-500">Нет зарегистрированных устройств</p>
                            </div>
                        ) : (
                            devices.map((device, i) => (
                                <motion.div
                                    key={device.id}
                                    initial={{ opacity: 0, x: -12 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="flex items-center gap-3 px-4 py-3.5"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-slate-800/50 flex items-center justify-center shrink-0">
                                        <Smartphone size={16} className="text-slate-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-white truncate">
                                            {device.platform || parsePlatform(device.user_agent)}
                                        </p>
                                        <p className="text-[10px] text-slate-500 mt-0.5">
                                            {new Date(device.last_active).toLocaleDateString('ru-RU', {
                                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                    {i === 0 && (
                                        <span className="px-2 py-0.5 rounded-md bg-green-500/15 text-green-400 text-[10px] font-bold">
                                            Текущее
                                        </span>
                                    )}
                                </motion.div>
                            ))
                        )}
                    </div>
                </section>

                {/* Security tips */}
                <section>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-1 mb-2">Советы</p>
                    <div className="rounded-2xl bg-amber-500/5 border border-amber-500/10 p-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-xs text-slate-300 leading-relaxed">
                                    Никогда не сообщайте свой пароль или код 2FA другим людям. Мы никогда не запрашиваем эти данные.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
