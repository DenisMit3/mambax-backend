'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Heart, Zap, Loader2, X } from 'lucide-react';

import { TopUpModal } from '@/components/ui/TopUpModal';
import { authService } from '@/services/api';

interface LikeUser {
    id: string;
    name: string;
    age: number;
    photos: string[];
    isSuper?: boolean;
}

export default function LikesPage() {
    const [isPremium, setIsPremium] = useState(false);
    const [showTopUp, setShowTopUp] = useState(false);
    const [likes, setLikes] = useState<LikeUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentBalance, setCurrentBalance] = useState(0);
    const [selectedUser, setSelectedUser] = useState<LikeUser | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [likesRes, meRes] = await Promise.all([
                    authService.getLikesReceived(),
                    authService.getMe()
                ]);

                const likesData = (likesRes.likes || []).map((u: any) => ({
                    id: u.id,
                    name: u.name || 'Анон',
                    age: u.age || 25,
                    photos: u.photos || [],
                    isSuper: u.isSuper || false
                }));
                setLikes(likesData);
                setCurrentBalance(meRes.stars_balance || 0);
            } catch (e: any) {
                // Handle "User not found" or auth errors gracefully
                if (e.message === 'User not found' || e.status === 404 || e.status === 401) {
                    if (typeof window !== 'undefined') {
                        console.warn('User session invalid, redirecting to login...');
                        localStorage.removeItem('token');
                        localStorage.removeItem('accessToken');
                        window.location.href = '/auth/phone';
                        return;
                    }
                }
                console.error('Failed to load likes data:', e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleUnlock = async () => {
        // FIX: Use cached balance instead of duplicate getMe() call
        if (currentBalance >= 100) {
            try {
                // Auto spend 100 stars
                await authService.spendStarsDev(100);
                setIsPremium(true);
                setCurrentBalance(prev => prev - 100);
            } catch (e) {
                console.error(e);
                alert("Ошибка списания звёзд");
            }
        } else {
            setShowTopUp(true);
        }
    };

    const handleLike = async () => {
        if (!selectedUser) return;

        const userToProcess = selectedUser;
        // Optimistic update: Remove immediately
        setSelectedUser(null);
        setLikes(prev => prev.filter(sys => sys.id !== userToProcess.id));

        try {
            await authService.swipe(userToProcess.id, 'like');

            // Optional: haptic feedback
            if (window.Telegram?.WebApp?.HapticFeedback) {
                window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
            }
        } catch (e: any) {
            const errorMsg = e.message || e.data?.detail || '';
            // If already swiped, it's fine
            if (typeof errorMsg === 'string' && errorMsg.includes('Already swiped')) {
                return;
            }
            console.error('Like error:', e);
            alert("Ошибка при лайке: " + (errorMsg || "Unknown error"));
            // Optionally revert state here, but simple retry is often better UX for swipes
        }
    };

    const handleDislike = async () => {
        if (!selectedUser) return;

        const userToProcess = selectedUser;
        // Optimistic update
        setSelectedUser(null);
        setLikes(prev => prev.filter(sys => sys.id !== userToProcess.id));

        try {
            await authService.swipe(userToProcess.id, 'dislike');
        } catch (e) {
            console.error(e);
            // alert("Ошибка дизлайка");
        }
    };

    const getPhotoUrl = (photos: string[]) => {
        if (!photos || photos.length === 0) return '/placeholder-user.jpg';
        const photo = photos[0];
        if (photo.startsWith('/static/')) return `/api_proxy${photo}`; // Backend static
        if (photo.startsWith('http') || photo.startsWith('data:')) return photo;
        return `/api_proxy/${photo}`; // Fallback helper
    };

    return (
        <div className="h-full relative flex flex-col bg-black text-white">
            {/* Scrollable Main Content */}
            <div className="flex-1 overflow-y-auto pb-24 scrollbar-hide">
                {/* Header */}
                <div className="px-6 pt-8 pb-4 flex items-end justify-between sticky top-0 bg-black/80 backdrop-blur-xl z-20 border-b border-white/5">
                    <div>
                        <h1 className="text-2xl font-black text-white tracking-wide">СИМПАТИИ</h1>
                        <p className="text-sm text-slate-500 font-medium">Вами интересуются</p>
                    </div>
                    <div className="flex items-center gap-1 bg-[#ff4b91]/10 px-3 py-1 rounded-full border border-[#ff4b91]/20">
                        <Heart size={14} className="text-[#ff4b91] fill-[#ff4b91]" />
                        <span className="text-[#ff4b91] font-bold">{likes.length}</span>
                    </div>
                </div>

                {/* Grid */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
                    </div>
                ) : (
                    <div className="p-4 grid grid-cols-2 gap-3">
                        {likes.map((user, idx) => (
                            <motion.div
                                key={user.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.1 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setSelectedUser(user)}
                                className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-slate-900 border border-white/5 group cursor-pointer"
                            >
                                {/* Image Layer */}
                                <img
                                    src={getPhotoUrl(user.photos)}
                                    alt={user.name}
                                    loading={idx > 3 ? "lazy" : "eager"}
                                    decoding="async"
                                    className={`w-full h-full object-cover transition-all duration-700 ${isPremium ? 'scale-100' : 'scale-110 blur-xl brightness-50'}`}
                                />

                                {/* Lock Icon Overlay (No Premium) - Visual Only now, click opens profile */}
                                {!isPremium && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
                                        <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center mb-2 border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                                            <Lock size={18} className="text-white" />
                                        </div>
                                        {user.isSuper && (
                                            <div className="absolute top-2 right-2">
                                                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/50">
                                                    <Zap size={12} className="text-white fill-white" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Info Overlay */}
                                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black via-black/50 to-transparent pointer-events-none">
                                    {isPremium ? (
                                        <div>
                                            <div className="text-white font-bold text-lg leading-none">{user.name}, {user.age}</div>
                                            {user.isSuper && <div className="text-blue-400 text-xs font-bold mt-1">Суперлайк!</div>}
                                        </div>
                                    ) : (
                                        <div className="h-4 w-20 bg-white/20 rounded animate-pulse" />
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {!loading && likes.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-[50vh] text-slate-500">
                        <Heart size={48} className="mb-4 opacity-20" />
                        <p>Пока нет новых лайков</p>
                    </div>
                )}
            </div>

            {/* PROFILE OVERLAY (BOTTOM SHEET MODAL) */}
            <AnimatePresence>
                {selectedUser && (
                    <>
                        {/* Backdrop - tap to dismiss */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedUser(null)}
                            className="absolute inset-0 z-[70] bg-black/60 backdrop-blur-sm"
                        />

                        {/* Bottom Sheet */}
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="absolute bottom-0 left-0 right-0 z-[80] bg-zinc-900 rounded-t-3xl shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Drag Handle */}
                            <div
                                className="py-4 cursor-pointer"
                                onClick={() => setSelectedUser(null)}
                            >
                                <div className="w-12 h-1 bg-white/30 rounded-full mx-auto" />
                            </div>

                            {/* Profile Preview */}
                            <div className="px-6 pb-6">
                                {/* Blurred Photo Preview */}
                                <div className="relative w-full h-40 rounded-2xl overflow-hidden mb-5 bg-zinc-800">
                                    <img
                                        src={getPhotoUrl(selectedUser.photos)}
                                        alt={selectedUser.name}
                                        className={`w-full h-full object-cover transition-all ${!isPremium ? 'blur-xl scale-110 brightness-50' : ''}`}
                                    />
                                    {!isPremium && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                                                <Lock size={28} className="text-white/70" />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {!isPremium ? (
                                    <div className="flex flex-col items-center text-center space-y-4">
                                        <h2 className="text-2xl font-bold text-white">Секретный поклонник</h2>
                                        <p className="text-gray-400 text-sm">
                                            Кто-то вами заинтересовался! Разблокируйте профиль, чтобы увидеть фото и начать общение.
                                        </p>
                                        <motion.button
                                            whileTap={{ scale: 0.95 }}
                                            onClick={handleUnlock}
                                            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#ff4b91] to-[#ff9e4a] shadow-lg flex items-center justify-center gap-2 text-white font-bold text-lg"
                                        >
                                            <Zap size={20} fill="currentColor" />
                                            УЗНАТЬ (100 ⭐️)
                                        </motion.button>
                                    </div>
                                ) : (
                                    <div className="space-y-5">
                                        <div>
                                            <h2 className="text-2xl font-bold text-white">{selectedUser.name}, {selectedUser.age}</h2>
                                            {selectedUser.isSuper && (
                                                <span className="inline-block mt-2 px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded-full border border-blue-500/30">
                                                    Суперлайк
                                                </span>
                                            )}
                                            <p className="text-gray-400 mt-2">Вам поставили лайк! Ответьте взаимностью.</p>
                                        </div>

                                        <div className="flex gap-4">
                                            <motion.button
                                                whileTap={{ scale: 0.95 }}
                                                onClick={handleDislike}
                                                className="flex-1 py-4 bg-zinc-800 rounded-xl text-white font-bold hover:bg-zinc-700 transition"
                                            >
                                                Скрыть
                                            </motion.button>
                                            <motion.button
                                                whileTap={{ scale: 0.95 }}
                                                onClick={handleLike}
                                                className="flex-1 py-4 bg-gradient-to-r from-[#ff4b91] to-[#ff9e4a] rounded-xl text-white font-bold shadow-lg flex items-center justify-center gap-2"
                                            >
                                                <Heart size={20} fill="currentColor" />
                                                Like
                                            </motion.button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Safe area padding for mobile */}
                            <div className="h-8" />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <TopUpModal isOpen={showTopUp} onClose={() => setShowTopUp(false)} currentBalance={currentBalance} />
        </div>
    );
}
