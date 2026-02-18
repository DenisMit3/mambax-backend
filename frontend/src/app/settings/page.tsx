'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    ArrowLeft, Bell, Eye, Shield, Lock, Smartphone, Globe,
    Trash2, Download, ChevronRight, Moon, UserX, Crown,
    HelpCircle, MessageSquare, LogOut, Palette
} from 'lucide-react';
import { authService } from '@/services/api';
import { useHaptic } from '@/hooks/useHaptic';
import { useRequireAuth } from '@/hooks/useRequireAuth';

interface SettingsGroup {
    title: string;
    items: SettingsItem[];
}

interface SettingsItem {
    icon: React.ElementType;
    label: string;
    description?: string;
    href?: string;
    color: string;
    badge?: string;
    action?: () => void;
    danger?: boolean;
}

export default function SettingsPage() {
    const router = useRouter();
    const haptic = useHaptic();
    const { isAuthed, isChecking } = useRequireAuth();
    const [exporting, setExporting] = useState(false);

    const handleExport = async () => {
        setExporting(true);
        haptic.medium();
        try {
            const data = await authService.exportData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'mambax-data-export.json';
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('Export failed:', e);
        } finally {
            setExporting(false);
        }
    };

    const handleLogout = () => {
        haptic.medium();
        localStorage.removeItem('accessToken');
        localStorage.removeItem('token');
        window.dispatchEvent(new Event('auth-logout'));
        router.push('/auth');
    };

    const groups: SettingsGroup[] = [
        {
            title: 'Аккаунт',
            items: [
                { icon: Bell, label: 'Уведомления', description: 'Push, звук, тихие часы', href: '/settings/notifications', color: 'bg-purple-500/20 text-purple-400' },
                { icon: Eye, label: 'Видимость', description: 'Онлайн статус, расстояние', href: '/settings/visibility', color: 'bg-cyan-500/20 text-cyan-400' },
                { icon: Moon, label: 'Инкогнито', description: 'Скрыть профиль от поиска', href: '/settings/incognito', color: 'bg-indigo-500/20 text-indigo-400', badge: 'VIP' },
                { icon: Shield, label: 'Безопасность', description: '2FA, устройства', href: '/settings/security', color: 'bg-green-500/20 text-green-400' },
            ],
        },
        {
            title: 'Поиск',
            items: [
                { icon: Globe, label: 'Настройки поиска', description: 'Возраст, расстояние, пол', href: '/preferences', color: 'bg-pink-500/20 text-pink-400' },
            ],
        },
        {
            title: 'Подписка',
            items: [
                { icon: Crown, label: 'Премиум', description: 'Управление подпиской', href: '/profile/premium', color: 'bg-amber-500/20 text-amber-400' },
            ],
        },
        {
            title: 'Поддержка',
            items: [
                { icon: HelpCircle, label: 'Помощь', description: 'FAQ и поддержка', href: '/help', color: 'bg-blue-500/20 text-blue-400' },
                { icon: MessageSquare, label: 'Обратная связь', description: 'Отзыв о приложении', href: '/feedback', color: 'bg-teal-500/20 text-teal-400' },
            ],
        },
        {
            title: 'Данные',
            items: [
                { icon: Download, label: 'Экспорт данных', description: 'Скачать все ваши данные', color: 'bg-slate-500/20 text-slate-400', action: handleExport },
                { icon: UserX, label: 'Заблокированные', description: 'Управление блокировками', href: '/settings/blocked', color: 'bg-orange-500/20 text-orange-400' },
                { icon: Trash2, label: 'Удалить аккаунт', description: 'Безвозвратное удаление', href: '/settings/delete-account', color: 'bg-red-500/20 text-red-400', danger: true },
            ],
        },
    ];

    if (isChecking) {
        return (
            <div className="min-h-dvh bg-black flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-dvh bg-black text-white pb-24">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-xl border-b border-white/5">
                <div className="flex items-center gap-3 px-4 py-3">
                    <button
                        onClick={() => { haptic.light(); router.back(); }}
                        className="p-2 -ml-2 rounded-xl hover:bg-white/5 transition"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-lg font-semibold">Настройки</h1>
                </div>
            </div>

            <div className="px-4 pt-4 space-y-6">
                {groups.map((group, gi) => (
                    <motion.section
                        key={group.title}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: gi * 0.05 }}
                    >
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-1 mb-2">
                            {group.title}
                        </p>
                        <div className="rounded-2xl bg-slate-950 border border-white/5 overflow-hidden divide-y divide-white/5">
                            {group.items.map(item => {
                                const Icon = item.icon;
                                return (
                                    <button
                                        key={item.label}
                                        onClick={() => {
                                            haptic.light();
                                            if (item.action) item.action();
                                            else if (item.href) router.push(item.href);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.02] transition text-left"
                                    >
                                        <div className={`w-9 h-9 rounded-xl ${item.color.split(' ')[0]} flex items-center justify-center shrink-0`}>
                                            <Icon size={16} className={item.color.split(' ')[1]} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-medium ${item.danger ? 'text-red-400' : 'text-white'}`}>
                                                {item.label}
                                            </p>
                                            {item.description && (
                                                <p className="text-[10px] text-slate-500 mt-0.5">{item.description}</p>
                                            )}
                                        </div>
                                        {item.badge && (
                                            <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-400 text-[10px] font-bold">
                                                {item.badge}
                                            </span>
                                        )}
                                        <ChevronRight size={16} className="text-slate-600 shrink-0" />
                                    </button>
                                );
                            })}
                        </div>
                    </motion.section>
                ))}

                {/* Logout */}
                <motion.button
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 font-medium text-sm hover:bg-red-500/15 transition"
                >
                    <LogOut size={16} />
                    Выйти из аккаунта
                </motion.button>

                {/* Version */}
                <p className="text-center text-[10px] text-slate-700 pb-4">
                    MambaX v2.0.0
                </p>
            </div>
        </div>
    );
}
