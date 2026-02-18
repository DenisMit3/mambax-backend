'use client';

import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Star, Plus, Settings, Edit3, Shield, Zap, ChevronRight, LogOut, Rocket, Eye, Gift as GiftIcon, Hash, MessageCircle, Users, Bell, HelpCircle, CheckCircle2, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { authService } from "@/services/api";
import { verificationApi, type VerificationStatus } from "@/services/api/verification";
import { httpClient } from "@/lib/http-client";
import { wsService } from "@/services/websocket";
import { ProfileMasterEditor } from "@/components/profile/ProfileMasterEditor";
import { BadgesSection } from "@/components/profile/BadgesSection";
// PERF-007: BottomNav import removed - already in ClientLayout
import { GlassCard } from "@/components/ui/GlassCard";
import { TopUpModal } from "@/components/ui/TopUpModal";
import { BoostModal } from "@/components/ui/BoostModal";
import { DailyRewards } from "@/components/rewards/DailyRewards";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { ErrorState } from "@/components/ui/ErrorState";

export default function ProfilePage() {
    interface UserProfile {
        name: string;
        age: number;
        photos?: string[];
        stars_balance?: number;
        subscription_tier?: string;
        achievements?: unknown[];
        [key: string]: unknown;
    }

    const [showTopUp, setShowTopUp] = useState(false);
    const [showBoost, setShowBoost] = useState(false);
    const [showDailyRewards, setShowDailyRewards] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
    const router = useRouter();
    const { isAuthed, isChecking } = useRequireAuth();
    const queryClient = useQueryClient();

    const { data: profile = null, isLoading: loading, error: profileError, refetch: refetchProfile } = useQuery<UserProfile | null>({
        queryKey: ['user', 'me'],
        queryFn: async () => {
            const data = await authService.getMe();
            return data as UserProfile;
        },
        staleTime: 5 * 60 * 1000,
        enabled: isAuthed,
    });
    const error = !!profileError;
    const loadProfile = useCallback(() => { refetchProfile(); }, [refetchProfile]);

    useEffect(() => {
        if (isAuthed) {
            verificationApi.getStatus().then(setVerificationStatus).catch(() => {});
        }
    }, [isAuthed]);

    if (isChecking || loading) {
        return (
            <div className="flex items-center justify-center h-full bg-transparent">
                <div className="w-8 h-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin"></div>
            </div>
        );
    }

    if (error) {
        return <ErrorState onRetry={loadProfile} />;
    }

    // Editing Mode
    if (isEditing) {
        return (
            <div className="h-full overflow-y-auto scrollbar-hide bg-transparent px-4 pt-6 pb-20">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">Редактор</h2>
                    <button
                        onClick={() => setIsEditing(false)}
                        className="text-sm font-medium text-slate-400 hover:text-white transition"
                    >
                        Закрыть
                    </button>
                </div>
                <ProfileMasterEditor
                    initialData={profile}
                    onSave={() => {
                        loadProfile();
                        setIsEditing(false);
                    }}
                />
            </div>
        );
    }

    // Dashboard Mode
    return (
        <div className="h-full bg-transparent pb-24 relative overflow-y-auto scrollbar-hide">
            {/* Ambient Background */}
            <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-blue-900/20 via-slate-900/50 to-slate-950 pointer-events-none" />

            {/* Header */}
            <div className="relative px-6 pt-8 pb-6 flex justify-between items-center z-10">
                <h1 className="text-2xl font-black text-white tracking-wide">ПРОФИЛЬ</h1>
                <button
                    onClick={() => router.push('/settings')}
                    className="w-11 h-11 rounded-full bg-white/5 flex items-center justify-center text-white/70 hover:bg-white/10 transition"
                >
                    <Settings size={20} />
                </button>
            </div>

            <div className="px-6 relative z-10">
                {/* Avatar Section */}
                <div className="flex flex-col items-center mb-8">
                    <div className="relative mb-4 group">
                        <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 opacity-60 blur-lg group-hover:opacity-80 transition duration-500"></div>
                        <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-white/10 bg-black">
                            {profile?.photos?.[0] ? (
                                <Image
                                    src={profile.photos[0]}
                                    alt="Avatar"
                                    fill
                                    sizes="128px"
                                    className="object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-500">
                                    Нет фото
                                </div>
                            )}
                        </div>
                        {/* Edit Badge */}
                        <button
                            onClick={() => setIsEditing(true)}
                            className="absolute bottom-1 right-1 bg-black border border-white/20 p-2 rounded-full text-white shadow-lg hover:scale-110 transition active:scale-95"
                        >
                            <Edit3 size={14} />
                        </button>
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-1">
                        {profile?.name}, <span className="text-slate-400 font-normal">{profile?.age}</span>
                    </h2>
                    <p className="text-sm text-slate-500 font-medium">
                        {profile?.subscription_tier === 'free' ? 'Новичок' : (profile?.subscription_tier || 'Новичок')}
                        {' • '}
                        {(profile?.city as string) || 'Не указан'}
                    </p>
                </div>

                {/* Stars Wallet Card */}
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="mb-8 p-1 rounded-3xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-transparent"
                >
                    <div className="bg-slate-900/90 backdrop-blur-xl rounded-[20px] p-5 border border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 ring-1 ring-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                                <Star size={24} fill="currentColor" />
                            </div>
                            <div>
                                <div className="text-[10px] text-amber-500/80 font-bold uppercase tracking-wider mb-0.5">Баланс</div>
                                <div className="text-2xl font-black text-white flex items-baseline gap-1">
                                    {profile?.stars_balance || 0}
                                    <span className="text-sm font-bold text-slate-500">STARS</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowTopUp(true)}
                            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-orange-500/25 transition active:scale-95 flex items-center gap-2"
                        >
                            <Plus size={16} strokeWidth={3} />
                            Пополнить
                        </button>
                    </div>
                </motion.div>

                <BadgesSection achievements={profile?.achievements} />

                {/* Menu Grid */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                    {verificationStatus?.status === 'approved' ? (
                        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-left">
                            <CheckCircle2 className="w-6 h-6 text-emerald-400 mb-3" />
                            <div className="text-emerald-300 font-bold text-sm">Верифицирован</div>
                            <div className="text-emerald-400/60 text-xs">Профиль подтверждён</div>
                        </div>
                    ) : verificationStatus?.status === 'pending' ? (
                        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-left">
                            <Clock className="w-6 h-6 text-amber-400 mb-3" />
                            <div className="text-amber-300 font-bold text-sm">На проверке</div>
                            <div className="text-amber-400/60 text-xs">Ожидайте результат</div>
                        </div>
                    ) : (
                        <button
                            onClick={() => router.push('/verification')}
                            className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition text-left group"
                        >
                            <Shield className="w-6 h-6 text-cyan-400 mb-3 group-hover:scale-110 transition" />
                            <div className="text-white font-bold text-sm">Верификация</div>
                            <div className="text-slate-500 text-xs">Подтвердить профиль</div>
                        </button>
                    )}

                    <button
                        onClick={() => setShowBoost(true)}
                        className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-900/10 border border-purple-500/20 hover:border-purple-500/40 transition text-left group"
                    >
                        <Rocket className="w-6 h-6 text-purple-400 mb-3 group-hover:scale-110 transition shadow-purple-500" />
                        <div className="text-white font-bold text-sm">Буст</div>
                        <div className="text-purple-300/70 text-xs">Поднять профиль</div>
                    </button>

                    <button
                        onClick={() => setShowDailyRewards(true)}
                        className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-900/10 border border-amber-500/20 hover:border-amber-500/40 transition text-left group"
                    >
                        <GiftIcon className="w-6 h-6 text-amber-400 mb-3 group-hover:scale-110 transition" />
                        <div className="text-white font-bold text-sm">Награды</div>
                        <div className="text-amber-300/70 text-xs">Ежедневный бонус</div>
                    </button>

                    <button
                        onClick={() => router.push('/profile/premium')}
                        className="p-4 rounded-2xl bg-gradient-to-br from-pink-500/20 to-rose-900/10 border border-pink-500/20 hover:border-pink-500/40 transition text-left group"
                    >
                        <Zap className="w-6 h-6 text-pink-400 mb-3 group-hover:scale-110 transition" />
                        <div className="text-white font-bold text-sm">VIP</div>
                        <div className="text-pink-300/70 text-xs">Премиум функции</div>
                    </button>
                </div>

                {/* List Items */}
                <div className="space-y-2">
                    <button
                        onClick={() => router.push('/views')}
                        className="w-full p-4 rounded-2xl bg-white/5 flex items-center justify-between hover:bg-white/10 transition"
                    >
                        <div className="flex items-center gap-3">
                            <Eye size={18} className="text-slate-400" />
                            <span className="text-slate-300 font-medium text-sm">Кто смотрел профиль</span>
                        </div>
                        <ChevronRight size={18} className="text-slate-600" />
                    </button>
                    <button
                        onClick={() => router.push('/profile/prompts')}
                        className="w-full p-4 rounded-2xl bg-white/5 flex items-center justify-between hover:bg-white/10 transition"
                    >
                        <div className="flex items-center gap-3">
                            <MessageCircle size={18} className="text-slate-400" />
                            <span className="text-slate-300 font-medium text-sm">Мои ответы (Q&A)</span>
                        </div>
                        <ChevronRight size={18} className="text-slate-600" />
                    </button>
                    <button
                        onClick={() => router.push('/profile/interests')}
                        className="w-full p-4 rounded-2xl bg-white/5 flex items-center justify-between hover:bg-white/10 transition"
                    >
                        <div className="flex items-center gap-3">
                            <Hash size={18} className="text-slate-400" />
                            <span className="text-slate-300 font-medium text-sm">Мои интересы</span>
                        </div>
                        <ChevronRight size={18} className="text-slate-600" />
                    </button>
                    <button
                        onClick={() => router.push('/referral')}
                        className="w-full p-4 rounded-2xl bg-white/5 flex items-center justify-between hover:bg-white/10 transition"
                    >
                        <div className="flex items-center gap-3">
                            <Users size={18} className="text-slate-400" />
                            <span className="text-slate-300 font-medium text-sm">Пригласить друзей</span>
                        </div>
                        <ChevronRight size={18} className="text-slate-600" />
                    </button>
                    <button
                        onClick={() => router.push('/settings')}
                        className="w-full p-4 rounded-2xl bg-white/5 flex items-center justify-between hover:bg-white/10 transition"
                    >
                        <span className="text-slate-300 font-medium text-sm">Настройки</span>
                        <ChevronRight size={18} className="text-slate-600" />
                    </button>
                    <button
                        onClick={() => router.push('/profile/analytics')}
                        className="w-full p-4 rounded-2xl bg-white/5 flex items-center justify-between hover:bg-white/10 transition"
                    >
                        <span className="text-slate-300 font-medium text-sm">Аналитика профиля</span>
                        <ChevronRight size={18} className="text-slate-600" />
                    </button>
                    <button
                        onClick={() => router.push('/notifications')}
                        className="w-full p-4 rounded-2xl bg-white/5 flex items-center justify-between hover:bg-white/10 transition"
                    >
                        <div className="flex items-center gap-3">
                            <Bell size={18} className="text-blue-400" />
                            <span className="text-slate-300 font-medium text-sm">Уведомления</span>
                        </div>
                        <ChevronRight size={18} className="text-slate-600" />
                    </button>
                    <button
                        onClick={() => router.push('/help')}
                        className="w-full p-4 rounded-2xl bg-white/5 flex items-center justify-between hover:bg-white/10 transition"
                    >
                        <div className="flex items-center gap-3">
                            <HelpCircle size={18} className="text-green-400" />
                            <span className="text-slate-300 font-medium text-sm">Помощь</span>
                        </div>
                        <ChevronRight size={18} className="text-slate-600" />
                    </button>
                    <button
                        onClick={async () => {
                            await authService.resetOnboarding();
                            router.push('/discover');
                        }}
                        className="w-full p-4 rounded-2xl bg-white/5 flex items-center justify-between hover:bg-white/10 transition"
                    >
                        <div>
                            <p className="text-white font-medium">Повторить обучение</p>
                            <p className="text-gray-400 text-sm">Пройти интерактивный гайд заново</p>
                        </div>
                        <ChevronRight size={18} className="text-slate-600" />
                    </button>
                    <button
                        onClick={() => {
                            wsService.disconnect();
                            httpClient.logout();
                            router.push('/auth/phone');
                        }}
                        className="w-full p-4 rounded-2xl flex items-center gap-3 text-red-500 hover:bg-red-500/10 transition mt-6"
                    >
                        <LogOut size={18} />
                        <span className="font-bold text-sm">Выйти</span>
                    </button>
                </div>
            </div>

            {/* PERF-007: BottomNav удален - уже есть в ClientLayout */}

            <TopUpModal
                isOpen={showTopUp}
                onClose={() => {
                    setShowTopUp(false);
                    loadProfile();
                }}
                currentBalance={profile?.stars_balance || 0}
            />

            <BoostModal
                isOpen={showBoost}
                onClose={() => setShowBoost(false)}
            />

            <DailyRewards
                isOpen={showDailyRewards}
                onClose={() => setShowDailyRewards(false)}
            />
        </div>
    );
}
