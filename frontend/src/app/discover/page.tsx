"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { SwipeCard } from "@/components/ui/SwipeCard";
import { X, Heart, Star, MessageCircle } from "lucide-react";
import { authService } from "@/services/api";
import { motion, AnimatePresence } from "framer-motion";
import { useProfiles, useSwipeStatus, useLikeMutation, Profile } from "@/hooks/useDiscovery";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { DailyPicks } from "@/components/discovery/DailyPicks";
import { SmartFilters } from "@/components/discovery/SmartFilters";
import { FALLBACK_AVATAR } from "@/lib/constants";
import { Spotlight } from "@/components/discovery/Spotlight";
import { Suggestions } from "@/components/discovery/Suggestions";
import { useRequireAuth } from "@/hooks/useRequireAuth";

// PERF: Dynamic imports for modals (code splitting)
const SendGiftModal = dynamic(() => import("@/components/gifts").then(m => ({ default: m.SendGiftModal })), {
    ssr: false,
    loading: () => null
});

const BuySwipesModal = dynamic(() => import("@/components/ui/BuySwipesModal").then(m => ({ default: m.BuySwipesModal })), {
    ssr: false,
    loading: () => null
});

const TopUpModal = dynamic(() => import("@/components/ui/TopUpModal").then(m => ({ default: m.TopUpModal })), {
    ssr: false,
    loading: () => null
});

export default function DiscoverPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { isChecking } = useRequireAuth();

    // Data Hooks
    const { data: profiles = [], isLoading: isLoadingProfiles } = useProfiles();
    const { data: swipeStatus, refetch: refetchSwipeStatus } = useSwipeStatus();
    const likeMutation = useLikeMutation();

    // Local State
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showGiftModal, setShowGiftModal] = useState(false);
    const [selectedGiftProfile, setSelectedGiftProfile] = useState<Profile | null>(null);
    const [showBuySwipesModal, setShowBuySwipesModal] = useState(false);
    const [showTopUpModal, setShowTopUpModal] = useState(false);

    const handleSwipe = async (direction: "left" | "right") => {
        const profile = profiles[currentIndex];
        if (!profile) return;

        // Check limits before swiping right
        if (direction === "right" && swipeStatus) {
            if (swipeStatus.remaining <= 0) {
                if (swipeStatus.can_buy_swipes) {
                    setShowBuySwipesModal(true);
                } else {
                    setShowTopUpModal(true);
                }
                return;
            }
        }

        // Optimistic Update: Move to next card immediately
        setCurrentIndex((prev) => prev + 1);

        if (direction === "right") {
            likeMutation.mutate({ userId: profile.id });
        } else {
            // Отправляем dislike на бэкенд, чтобы профиль не появлялся повторно
            authService.swipe(profile.id, 'dislike').catch(() => {});
        }
    };

    // Проверка авторизации — первым делом
    if (isChecking) {
        return (
            <div className="min-h-dvh bg-black flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    // Loading State with Skeleton
    if (isLoadingProfiles) {
        return (
            <div className="relative h-full bg-slate-950 flex flex-col items-center justify-center p-4">
                {/* Header Skeleton */}
                <div className="absolute top-6 left-0 right-0 flex justify-center gap-3 px-6 z-50">
                    <Skeleton className="h-10 w-20 rounded-2xl bg-slate-800" />
                    <Skeleton className="h-10 w-20 rounded-2xl bg-slate-800" />
                </div>

                {/* Card Skeleton */}
                <div className="w-full max-w-md aspect-[3/4] rounded-3xl overflow-hidden relative">
                    <Skeleton className="w-full h-full bg-slate-900" />
                    <div className="absolute bottom-0 left-0 right-0 p-6 space-y-3">
                        <Skeleton className="h-8 w-3/4 bg-slate-800" />
                        <Skeleton className="h-4 w-1/2 bg-slate-800" />
                    </div>
                </div>

                {/* Controls Skeleton */}
                <div className="absolute bottom-24 flex gap-6">
                    <Skeleton className="w-16 h-16 rounded-full bg-slate-900" />
                    <Skeleton className="w-16 h-16 rounded-full bg-slate-900" />
                </div>
            </div>
        );
    }

    // No More Profiles
    if (!profiles || currentIndex >= profiles.length) {
        return (
            <div className="relative h-full flex flex-col items-center justify-center bg-slate-950 p-6 text-center">
                <div className="w-24 h-24 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-6">
                    <Star size={40} className="text-slate-700" />
                </div>
                <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Профили закончились</h2>
                <p className="text-slate-500 mb-8 max-w-xs">Вы просмотрели всех в вашем районе. Загляните позже!</p>
                <button
                    className="px-8 py-4 rounded-2xl bg-slate-900 border border-slate-700 text-white font-black uppercase tracking-widest hover:bg-slate-800 transition-colors"
                    onClick={() => {
                        setCurrentIndex(0);
                        queryClient.invalidateQueries({ queryKey: ['profiles'] });
                    }}
                >
                    Обновить ленту
                </button>
                <div className="w-full mt-8">
                    <Suggestions limit={5} />
                </div>
            </div>
        );
    }

    const currentProfile = profiles[currentIndex];

    return (
        <div className="relative bg-slate-950 overflow-y-auto flex flex-col h-full">
            {/* Header / Stats */}
            <AnimatePresence>
                {swipeStatus && (
                    <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="fixed top-6 left-0 right-0 z-50 flex justify-center gap-3 px-6"
                    >
                        {/* Swipes Left */}
                        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 px-4 py-2 rounded-2xl flex items-center gap-2 shadow-xl">
                            <Heart size={14} className={swipeStatus.remaining > 0 ? 'text-pink-500 fill-pink-500' : 'text-slate-600'} />
                            <span className="text-white text-sm font-black">
                                {swipeStatus.remaining === -1 ? '∞' : swipeStatus.remaining}
                            </span>
                        </div>

                        {/* Stars Balance */}
                        <button
                            onClick={() => setShowTopUpModal(true)}
                            className="bg-amber-400/10 backdrop-blur-xl border border-amber-400/30 px-4 py-2 rounded-2xl flex items-center gap-2 shadow-xl group hover:bg-amber-400/20 transition-colors"
                        >
                            <Star size={14} className="text-amber-400 fill-amber-400 group-hover:scale-110 transition-transform" />
                            <span className="text-amber-400 text-sm font-black">
                                {swipeStatus.stars_balance}
                            </span>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="mt-16">
                <Spotlight />
                <DailyPicks />
                <SmartFilters />
            </div>

            {/* Main Swipe Area */}
            <div className="flex-1 relative mb-16 px-4 py-2 min-h-[300px]">
                <div className="relative w-full h-full max-w-md mx-auto">
                    <SwipeCard
                        key={currentProfile.id}
                        name={currentProfile.name}
                        age={currentProfile.age}
                        bio={currentProfile.bio || ""}
                        image={currentProfile.photos[0] || FALLBACK_AVATAR}
                        onSwipe={handleSwipe}
                        onGiftClick={() => {
                            setSelectedGiftProfile(currentProfile);
                            setShowGiftModal(true);
                        }}
                        onProfileClick={() => router.push(`/users/${currentProfile.id}`)}
                        compatibilityScore={currentProfile.compatibility_score}
                        commonInterests={currentProfile.common_interests}
                    />
                </div>
            </div>

            {/* Bottom Controls */}
            <div className="fixed bottom-28 left-0 right-0 z-50 flex justify-center items-center gap-6 px-6 pointer-events-auto">
                {/* Chat with this person */}
                <button
                    onClick={async () => {
                        if (currentProfile) {
                            try {
                                const result = await authService.startChat(currentProfile.id);
                                router.push(`/chat/${result.match_id}`);
                            } catch (e) {
                                console.error("Failed to start chat", e);
                            }
                        }
                    }}
                    className="w-12 h-12 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-blue-400 shadow-lg active:scale-90 transition-transform hover:bg-slate-800"
                >
                    <MessageCircle size={20} strokeWidth={2.5} />
                </button>

                {/* Nope */}
                <button
                    onClick={() => handleSwipe("left")}
                    className="w-16 h-16 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-rose-500 shadow-xl active:scale-90 transition-transform"
                >
                    <X size={32} strokeWidth={3} />
                </button>

                {/* Like */}
                <button
                    onClick={() => handleSwipe("right")}
                    className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white shadow-[0_10px_30px_rgba(244,63,94,0.3)] active:scale-90 transition-transform"
                >
                    <Heart size={32} fill="white" strokeWidth={0} />
                </button>

                {/* Boost */}
                <button
                    onClick={async () => {
                        try {
                            await authService.activateBoost(1);
                        } catch (e: unknown) {
                            const err = e as { data?: { error?: string } };
                            if (err?.data?.error === 'insufficient_balance') {
                                setShowTopUpModal(true);
                            }
                        }
                    }}
                    className="w-12 h-12 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-purple-500 shadow-lg active:scale-90 transition-transform"
                >
                    <Star size={20} fill="currentColor" strokeWidth={0} />
                </button>
            </div>

            {/* Modals */}
            {selectedGiftProfile && (
                <SendGiftModal
                    isOpen={showGiftModal}
                    onClose={() => {
                        setShowGiftModal(false);
                        setSelectedGiftProfile(null);
                    }}
                    receiverId={selectedGiftProfile.id}
                    receiverName={selectedGiftProfile.name}
                    receiverPhoto={selectedGiftProfile.photos[0]}
                />
            )}

            <BuySwipesModal
                isOpen={showBuySwipesModal}
                onClose={() => setShowBuySwipesModal(false)}
                currentBalance={swipeStatus?.stars_balance || 0}
                onSuccess={() => {
                    refetchSwipeStatus();
                    setShowBuySwipesModal(false);
                }}
                mode="swipes"
            />

            <TopUpModal
                isOpen={showTopUpModal}
                onClose={() => setShowTopUpModal(false)}
                currentBalance={swipeStatus?.stars_balance || 0}
                onSuccess={() => {
                    refetchSwipeStatus();
                }}
            />
        </div>
    );
}
