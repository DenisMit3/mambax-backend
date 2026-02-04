"use client";

import { useState, useEffect, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SlidersHorizontal, MapPin, X, Heart, Star, Zap, Search, ChevronDown, Filter } from "lucide-react";
import { authService, UserProfile } from "@/services/api";

// --- Components ---

// FIX: Memoized to prevent re-renders when parent updates
const StoryCircle = memo(({ user, index }: { user: UserProfile; index: number }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: Math.min(index * 0.05, 0.2) }} // FIX: Cap delay
        className="flex flex-col items-center gap-1 min-w-[70px] cursor-pointer group"
    >
        <div className="w-[66px] h-[66px] rounded-full p-[2px] bg-gradient-to-tr from-[#ff4b91] to-[#ff9e4a] group-hover:scale-105 transition-transform">
            <div className="w-full h-full rounded-full border-2 border-black overflow-hidden relative">
                <img src={getPhotoUrl(user.photos)} alt={user.name} className="w-full h-full object-cover" loading="lazy" />
            </div>
        </div>
        <span className="text-[10px] text-white font-medium truncate w-full text-center">{user.name}</span>
    </motion.div>
));
StoryCircle.displayName = 'StoryCircle';

// Helper for Photo URLs
const getPhotoUrl = (photos: string[] | undefined) => {
    if (!photos || photos.length === 0) return 'https://placehold.co/400x600/1a1a1a/white?text=No+Photo';
    const photo = photos[0];
    if (photo.startsWith('/static/')) return `/api_proxy${photo}`;
    if (photo.startsWith('http') || photo.startsWith('data:')) return photo;
    return `/api_proxy/${photo}`;
};

export default function SearchPage() {
    const [profiles, setProfiles] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [activeFilter, setActiveFilter] = useState("Онлайн");
    const [showFilters, setShowFilters] = useState(false);

    // Initial Load
    useEffect(() => {
        loadProfiles();
    }, []);

    const loadProfiles = async () => {
        setLoading(true);
        try {
            // Fetch real profiles from API
            // Note: API might support filters in future, currently just fetches feed
            const response = await authService.getProfiles({ limit: 20 });

            // Handle PaginatedResponse structure safely
            let data: UserProfile[] = [];
            // @ts-ignore
            if (response && response.items && Array.isArray(response.items)) {
                // @ts-ignore
                data = response.items;
            } else if (Array.isArray(response)) {
                data = response;
            }

            setProfiles(data);
        } catch (error) {
            console.error("Failed to load search profiles", error);
            setProfiles([]);
        } finally {
            setLoading(false);
        }
    };

    // Actions
    const handleLike = async (user: UserProfile) => {
        // Optimistic UI: Close immediately
        setSelectedUser(null);

        if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }

        try {
            await authService.swipe(user.id, 'like');
        } catch (e) {
            console.error(e);
        }
    };

    const handleDislike = async (user: UserProfile) => {
        setSelectedUser(null);
        try {
            await authService.swipe(user.id, 'dislike');
            // If failed, we could reopen, but for swiping it's usually fine
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="h-full bg-black text-white relative flex flex-col">

            {/* 1. Header & Filters (Sticky) */}
            <div className="sticky top-0 z-40 bg-black/90 backdrop-blur-md border-b border-white/5 pb-2">
                <div className="px-4 pt-4 pb-2 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-black tracking-wide text-white flex items-center gap-2">
                            ПОИСК <div className="w-1.5 h-1.5 bg-[#ff4b91] rounded-full mt-1" />
                        </h1>
                    </div>
                    <button
                        onClick={() => setShowFilters(true)}
                        className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition"
                    >
                        <SlidersHorizontal size={18} />
                    </button>
                </div>

                {/* Tags (Horizontal Scroll) */}
                <div className="flex gap-2 px-4 overflow-x-auto scrollbar-hide pb-2">
                    {['Онлайн', 'Новые', 'Рядом', 'Путешествия', 'С верификацией'].map((tag) => (
                        <button
                            key={tag}
                            onClick={() => setActiveFilter(tag)}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${activeFilter === tag
                                ? 'bg-white text-black border-white'
                                : 'bg-white/5 text-gray-400 border-white/5 hover:border-white/20'
                                }`}
                        >
                            {tag}
                        </button>
                    ))}
                </div>
            </div>

            {/* 2. Content Area (Scrollable) */}
            <div className="flex-1 overflow-y-auto scrollbar-hide pb-24">

                {/* Stories / Highlights Area */}
                {!loading && profiles.length > 0 && (
                    <div className="pt-4 pb-6 px-4">
                        <div className="flex gap-4 overflow-x-auto scrollbar-hide">
                            <div className="flex flex-col items-center gap-1 min-w-[70px]">
                                <div className="w-[66px] h-[66px] rounded-full border-2 border-[#ff4b91] border-dashed flex items-center justify-center bg-white/5">
                                    <Search size={24} className="text-[#ff4b91]" />
                                </div>
                                <span className="text-[10px] text-gray-400 font-medium">Мой идеал</span>
                            </div>
                            {profiles.slice(0, 5).map((u, i) => (
                                <StoryCircle key={'story-' + u.id} user={u} index={i} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Main Grid */}
                <div className="px-2">
                    {loading ? (
                        <div className="grid grid-cols-2 gap-2">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="aspect-[3/4] rounded-2xl bg-white/5 animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-2">
                            {profiles.map((user, idx) => (
                                <motion.div
                                    key={user.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: Math.min(idx * 0.03, 0.3) }} // FIX: Cap delay
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setSelectedUser(user)}
                                    className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-zinc-900 group cursor-pointer"
                                >
                                    <img
                                        src={getPhotoUrl(user.photos)}
                                        alt={user.name}
                                        loading={idx > 3 ? "lazy" : "eager"}
                                        decoding="async"
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                    />

                                    {/* Gradient & Info */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent p-3 flex flex-col justify-end">
                                        <div className="flex items-end justify-between">
                                            <div>
                                                <h3 className="text-white font-bold text-lg leading-none">{user.name}, {user.age}</h3>
                                                <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                                                    <MapPin size={10} />
                                                    <span>{user.distance_km ? `${user.distance_km.toFixed(0)} км` : 'Рядом'}</span>
                                                </div>
                                            </div>
                                            {/* Status Dot */}
                                            {idx % 3 === 0 && ( // Fake status logic for demo if no real status
                                                <div className="w-2.5 h-2.5 rounded-full bg-green-500 border border-black mb-1" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Verification Badge */}
                                    {user.is_verified && (
                                        <div className="absolute top-2 right-2 bg-blue-500 rounded-full p-1 shadow-lg">
                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    )}

                    {!loading && profiles.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                            <Search size={48} className="mb-4 opacity-20" />
                            <p>Никого не найдено :(</p>
                            <button onClick={() => setActiveFilter('Все')} className="mt-4 text-[#ff4b91]">Сбросить фильтры</button>
                        </div>
                    )}
                </div>
            </div>

            {/* 3. Filter Modal */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center"
                        onClick={() => setShowFilters(false)}
                    >
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#1c1c1e] w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 border-t sm:border border-white/10 shadow-2xl"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">Фильтры</h3>
                                <button onClick={() => setShowFilters(false)} className="p-2 bg-white/5 rounded-full">
                                    <X size={20} className="text-gray-400" />
                                </button>
                            </div>

                            {/* Age Range Slider (Mock) */}
                            <div className="mb-6">
                                <label className="text-sm text-gray-400 font-bold mb-2 block">Возраст (18 - 35)</label>
                                <div className="h-12 bg-white/5 rounded-xl flex items-center px-4 relative">
                                    <div className="absolute left-4 right-12 h-1 bg-gray-700 rounded-full">
                                        <div className="absolute left-0 w-1/2 h-full bg-[#ff4b91] rounded-full" />
                                    </div>
                                    <div className="absolute left-[50%] w-6 h-6 bg-white rounded-full shadow-lg border-2 border-[#ff4b91]" />
                                </div>
                            </div>

                            {/* Distance Slider (Mock) */}
                            <div className="mb-8">
                                <label className="text-sm text-gray-400 font-bold mb-2 block">Расстояние (до 50 км)</label>
                                <div className="h-12 bg-white/5 rounded-xl flex items-center px-4 relative">
                                    <div className="absolute left-4 right-4 h-1 bg-gray-700 rounded-full">
                                        <div className="absolute left-0 w-1/3 h-full bg-blue-500 rounded-full" />
                                    </div>
                                    <div className="absolute left-[33%] w-6 h-6 bg-white rounded-full shadow-lg border-2 border-blue-500" />
                                </div>
                            </div>

                            <button onClick={() => setShowFilters(false)} className="w-full py-4 bg-[#ff4b91] rounded-xl text-white font-bold text-lg active:scale-95 transition">
                                Применить
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 4. Profile Modal (Full Screen) */}
            <AnimatePresence>
                {selectedUser && (
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        // ABSOLUTE POSITIONING to stay within mobile frame
                        className="absolute inset-0 z-[150] bg-black flex flex-col"
                    >
                        {/* Close Button Area */}
                        <div className="absolute top-0 left-0 p-4 z-50 w-full flex justify-between bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                            <button
                                onClick={() => setSelectedUser(null)}
                                className="pointer-events-auto w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20"
                            >
                                <ChevronDown size={24} className="text-white" />
                            </button>

                            <div className="pointer-events-auto px-3 py-1 bg-black/50 backdrop-blur-xl rounded-full border border-white/10 flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-xs font-bold text-white">Online</span>
                            </div>
                        </div>

                        {/* Image (Parallax-ish) */}
                        <div className="flex-1 relative w-full bg-zinc-900">
                            <img
                                src={getPhotoUrl(selectedUser.photos)}
                                alt={selectedUser.name}
                                className="w-full h-full object-cover"
                            />
                            {/* Gradient Overlay for Text */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90" />

                            {/* Info */}
                            <div className="absolute bottom-32 left-0 right-0 p-6">
                                <h2 className="text-4xl font-black text-white leading-none mb-2">{selectedUser.name}, {selectedUser.age}</h2>
                                <p className="text-gray-300 line-clamp-2 text-sm leading-relaxed max-w-[90%]">
                                    {selectedUser.bio || "Нет описания профиля."}
                                </p>

                                {/* Chips */}
                                <div className="flex flex-wrap gap-2 mt-4">
                                    {selectedUser.interests?.slice(0, 3).map(tag => (
                                        <span key={tag} className="px-3 py-1 rounded-lg bg-white/10 backdrop-blur-md border border-white/10 text-xs font-bold text-white">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Action Bar */}
                        <div className="absolute bottom-0 left-0 right-0 p-6 pb-8 bg-black/80 backdrop-blur-xl border-t border-white/10 z-50 flex items-center justify-center gap-6">
                            <button
                                onClick={() => handleDislike(selectedUser)}
                                className="w-16 h-16 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-red-500 hover:bg-zinc-700 active:scale-90 transition shadow-lg"
                            >
                                <X size={32} />
                            </button>

                            <button
                                className="w-12 h-12 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-blue-400 hover:bg-zinc-700 active:scale-90 transition shadow-lg"
                            >
                                <Star size={20} fill="currentColor" />
                            </button>

                            <button
                                onClick={() => handleLike(selectedUser)}
                                className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#ff4b91] to-[#ff9e4a] flex items-center justify-center text-white hover:brightness-110 active:scale-90 transition shadow-[0_0_20px_rgba(255,75,145,0.4)]"
                            >
                                <Heart size={32} fill="currentColor" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
