'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    Heart, Eye, Star, Zap, Gift, Calendar, Users, MessageCircle,
    CreditCard, Share2, Settings, Shield, BarChart3, Bookmark,
    Crown, Sparkles
} from 'lucide-react';
import { useHaptic } from '@/hooks/useHaptic';

interface QuickAction {
    icon: React.ElementType;
    label: string;
    href: string;
    color: string;
    bg: string;
    badge?: string;
}

interface QuickActionsGridProps {
    isVip?: boolean;
    starsBalance?: number;
}

export function QuickActionsGrid({ isVip, starsBalance }: QuickActionsGridProps) {
    const router = useRouter();
    const haptic = useHaptic();

    const actions: QuickAction[] = [
        { icon: Heart, label: 'Симпатии', href: '/likes', color: 'text-pink-400', bg: 'bg-pink-500/10' },
        { icon: Eye, label: 'Кто смотрел', href: '/views', color: 'text-cyan-400', bg: 'bg-cyan-500/10', badge: isVip ? undefined : 'VIP' },
        { icon: Star, label: 'Суперлайк', href: '/superlike', color: 'text-blue-400', bg: 'bg-blue-500/10' },
        { icon: Zap, label: 'Буст', href: '/radar', color: 'text-amber-400', bg: 'bg-amber-500/10' },
        { icon: Gift, label: 'Подарки', href: '/gifts', color: 'text-purple-400', bg: 'bg-purple-500/10' },
        { icon: Calendar, label: 'События', href: '/events', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        { icon: Sparkles, label: 'Истории', href: '/stories', color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10' },
        { icon: BarChart3, label: 'Аналитика', href: '/profile/analytics', color: 'text-teal-400', bg: 'bg-teal-500/10' },
        { icon: Users, label: 'Рефералы', href: '/referral', color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
        { icon: CreditCard, label: 'Платежи', href: '/payments', color: 'text-slate-400', bg: 'bg-slate-500/10' },
        { icon: Crown, label: 'Премиум', href: '/profile/premium', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
        { icon: Settings, label: 'Настройки', href: '/settings', color: 'text-slate-400', bg: 'bg-slate-500/10' },
    ];

    return (
        <div className="mb-6">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-1 mb-3">Быстрые действия</p>
            <div className="grid grid-cols-4 gap-2">
                {actions.map((action, i) => {
                    const Icon = action.icon;
                    return (
                        <motion.button
                            key={action.label}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.02 }}
                            whileTap={{ scale: 0.92 }}
                            onClick={() => { haptic.light(); router.push(action.href); }}
                            className="relative flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors"
                        >
                            <div className={`w-9 h-9 rounded-xl ${action.bg} flex items-center justify-center`}>
                                <Icon size={18} className={action.color} />
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium leading-tight text-center">
                                {action.label}
                            </span>
                            {action.badge && (
                                <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-400 text-[8px] font-bold">
                                    {action.badge}
                                </span>
                            )}
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
}
