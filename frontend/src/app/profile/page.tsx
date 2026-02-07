'use client';

import { useState, useEffect } from "react";
import { Star, Plus, Settings, Edit3, Shield, Zap, ChevronRight, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

import { authService } from "@/services/api";
import { httpClient } from "@/lib/http-client";
import { ProfileMasterEditor } from "@/components/profile/ProfileMasterEditor";
import { BadgesSection } from "@/components/profile/BadgesSection";
// PERF-007: BottomNav import removed - already in ClientLayout
import { GlassCard } from "@/components/ui/GlassCard";
import { TopUpModal } from "@/components/ui/TopUpModal";

export default function ProfilePage() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showTopUp, setShowTopUp] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const data = await authService.getMe();
            setProfile(data);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error('Failed to load profile:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full bg-transparent">
                <div className="w-8 h-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin"></div>
            </div>
        );
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
        <div className="h-full overflow-y-auto scrollbar-hide bg-transparent pb-24 relative">
            {/* Ambient Background */}
            <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-blue-900/20 via-slate-900/50 to-slate-950 pointer-events-none" />

            {/* Header */}
            <div className="relative px-6 pt-8 pb-6 flex justify-between items-center z-10">
                <h1 className="text-2xl font-black text-white tracking-wide">ПРОФИЛЬ</h1>
                <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/70 hover:bg-white/10 transition">
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
                    <p className="text-sm text-slate-500 font-medium">Новичок • Moscow</p>
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
                    <button className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition text-left group">
                        <Shield className="w-6 h-6 text-cyan-400 mb-3 group-hover:scale-110 transition" />
                        <div className="text-white font-bold text-sm">Безопасность</div>
                        <div className="text-slate-500 text-xs">Верификация</div>
                    </button>

                    <button className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-900/10 border border-purple-500/20 hover:border-purple-500/40 transition text-left group">
                        <Zap className="w-6 h-6 text-purple-400 mb-3 group-hover:scale-110 transition shadow-purple-500" />
                        <div className="text-white font-bold text-sm">Mamba Turbo</div>
                        <div className="text-purple-300/70 text-xs">Буст профиля</div>
                    </button>
                </div>

                {/* List Items */}
                <div className="space-y-2">
                    <button className="w-full p-4 rounded-2xl bg-white/5 flex items-center justify-between hover:bg-white/10 transition">
                        <span className="text-slate-300 font-medium text-sm">Настройки уведомлений</span>
                        <ChevronRight size={18} className="text-slate-600" />
                    </button>
                    <button className="w-full p-4 rounded-2xl bg-white/5 flex items-center justify-between hover:bg-white/10 transition">
                        <span className="text-slate-300 font-medium text-sm">Помощь и поддержка</span>
                        <ChevronRight size={18} className="text-slate-600" />
                    </button>
                    <button
                        onClick={async () => {
                            await authService.resetOnboarding();
                            window.location.href = '/discover';
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
                            httpClient.logout();
                            window.location.reload(); // Force reload to clear state/redirect
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
        </div>
    );
}
