"use client";

import { useState, useEffect, useMemo, memo } from "react";
import Image from 'next/image';
import { motion, AnimatePresence } from "framer-motion";
import { SlidersHorizontal, MapPin, X, Heart, Star, Search, ChevronDown } from "lucide-react";
import { authService, UserProfile, PaginatedResponse } from "@/services/api";
import { FALLBACK_AVATAR } from "@/lib/constants";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { ErrorState } from "@/components/ui/ErrorState";
import { useHaptic } from '@/hooks/useHaptic';

// --- Типы фильтров ---
type FilterTag = "Онлайн" | "Новые" | "Рядом" | "Путешествия" | "С верификацией";
const FILTER_TAGS: FilterTag[] = ["Онлайн", "Новые", "Рядом", "Путешествия", "С верификацией"];

// --- Components ---

// Мемоизированный компонент Story-кружка
const StoryCircle = memo(({ user, index }: { user: UserProfile; index: number }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: Math.min(index * 0.05, 0.2) }}
        className="flex flex-col items-center gap-1 min-w-[70px] cursor-pointer group"
    >
        <div className="w-[66px] h-[66px] rounded-full p-[2px] bg-gradient-to-tr from-[#ff4b91] to-[#ff9e4a] group-hover:scale-105 transition-transform">
            <div className="w-full h-full rounded-full border-2 border-black overflow-hidden relative">
                <Image src={getPhotoUrl(user.photos)} alt={user.name} className="w-full h-full object-cover" loading="lazy" fill sizes="56px" />
            </div>
        </div>
        <span className="text-[10px] text-white font-medium truncate w-full text-center">{user.name}</span>
    </motion.div>
));
StoryCircle.displayName = 'StoryCircle';

// Хелпер для URL фотографий
const getPhotoUrl = (photos: string[] | undefined) => {
    if (!photos || photos.length === 0) return FALLBACK_AVATAR;
    const photo = photos[0];
    if (photo.startsWith('/static/')) return `/api_proxy${photo}`;
    if (photo.startsWith('http') || photo.startsWith('data:')) return photo;
    return `/api_proxy/${photo}`;
};

export default function SearchPage() {
    const { isAuthed, isChecking } = useRequireAuth();
    const haptic = useHaptic();
    const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [activeFilter, setActiveFilter] = useState<FilterTag | null>(null);
    const [showFilters, setShowFilters] = useState(false);

    // Состояние фильтров модального окна
    const [ageMin, setAgeMin] = useState(18);
    const [ageMax, setAgeMax] = useState(60);
    const [distanceMax, setDistanceMax] = useState(100);

    // Загрузка профилей
    useEffect(() => {
        if (isAuthed) loadProfiles();
    }, [isAuthed]);

    const loadProfiles = async () => {
        setLoading(true);
        setError(false);
        try {
            const response: PaginatedResponse<UserProfile> = await authService.getProfiles({ limit: 40 });
            setAllProfiles(response.items ?? []);
        } catch (error) {
            console.error("Не удалось загрузить профили", error);
            setError(true);
            setAllProfiles([]);
        } finally {
            setLoading(false);
        }
    };

    // Применение фильтров и сортировки к профилям
    const profiles = useMemo(() => {
        let result = allProfiles.filter(u => {
            // Фильтр по возрасту из модального окна
            if (u.age < ageMin || u.age > ageMax) return false;
            // Фильтр по расстоянию из модального окна
            if (u.distance_km !== undefined && u.distance_km > distanceMax) return false;
            return true;
        });

        // Применение тег-фильтра
        if (activeFilter === "Онлайн") {
            result = result.filter(u => u.online_status === "online");
        } else if (activeFilter === "С верификацией") {
            result = result.filter(u => u.is_verified === true);
        } else if (activeFilter === "Новые") {
            result = [...result].sort((a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
        } else if (activeFilter === "Рядом") {
            result = [...result].sort((a, b) =>
                (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity)
            );
        }
        // "Путешествия" — без специальной логики, показываем все

        return result;
    }, [allProfiles, activeFilter, ageMin, ageMax, distanceMax]);

    // Обработка тег-фильтра: повторный клик снимает фильтр
    const handleFilterClick = (tag: FilterTag) => {
        setActiveFilter(prev => prev === tag ? null : tag);
    };

    // Применение фильтров из модального окна
    const applyModalFilters = () => {
        setShowFilters(false);
    };

    // Сброс фильтров модального окна
    const resetModalFilters = () => {
        setAgeMin(18);
        setAgeMax(60);
        setDistanceMax(100);
    };

    // Actions
    const handleLike = async (user: UserProfile) => {
        setSelectedUser(null);
        haptic.success();
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
        } catch (e) {
            console.error(e);
        }
    };

    if (isChecking || loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return <ErrorState onRetry={loadProfiles} />;
    }

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
                    {FILTER_TAGS.map((tag) => (
                        <button
                            key={tag}
                            onClick={() => handleFilterClick(tag)}
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
                {!loading && allProfiles.length > 0 && (
                    <div className="pt-4 pb-6 px-4">
                        <div className="flex gap-4 overflow-x-auto scrollbar-hide">
                            <div className="flex flex-col items-center gap-1 min-w-[70px]">
                                <div className="w-[66px] h-[66px] rounded-full border-2 border-[#ff4b91] border-dashed flex items-center justify-center bg-white/5">
                                    <Search size={24} className="text-[#ff4b91]" />
                                </div>
                                <span className="text-[10px] text-gray-400 font-medium">Мой идеал</span>
                            </div>
                            {allProfiles.slice(0, 5).map((u, i) => (
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
                                    transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setSelectedUser(user)}
                                    className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-zinc-900 group cursor-pointer"
                                >
                                    <Image
                                        src={getPhotoUrl(user.photos)}
                                        alt={user.name}
                                        loading={idx > 3 ? "lazy" : "eager"}
                                        decoding="async"
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                        fill
                                        sizes="100vw"
                                    />

                                    {/* Gradient & Info */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent p-3 flex flex-col justify-end">
                                        <div className="flex items-end justify-between">
                                            <div>
                                                <h3 className="text-white font-bold text-lg leading-none">{user.name}, {user.age}</h3>
                                                <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                                                    <MapPin size={10} />
                                                    <span>{user.distance_km !== undefined ? `${user.distance_km.toFixed(0)} км` : 'Рядом'}</span>
                                                </div>
                                            </div>
                                            {/* Реальный статус онлайн */}
                                            {user.online_status === "online" && (
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
                            <button
                                onClick={() => { setActiveFilter(null); resetModalFilters(); }}
                                className="mt-4 text-[#ff4b91]"
                            >
                                Сбросить фильтры
                            </button>
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

                            {/* Возраст — минимум */}
                            <div className="mb-5">
                                <label className="text-sm text-gray-400 font-bold mb-2 block">
                                    Возраст: {ageMin} — {ageMax}
                                </label>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-gray-500 w-6 text-right">{ageMin}</span>
                                    <input
                                        type="range"
                                        min={18}
                                        max={ageMax - 1}
                                        value={ageMin}
                                        onChange={(e) => setAgeMin(Number(e.target.value))}
                                        className="flex-1 h-1.5 rounded-full appearance-none bg-gray-700 accent-[#ff4b91] cursor-pointer"
                                    />
                                </div>
                                <div className="flex items-center gap-3 mt-2">
                                    <span className="text-xs text-gray-500 w-6 text-right">{ageMax}</span>
                                    <input
                                        type="range"
                                        min={ageMin + 1}
                                        max={80}
                                        value={ageMax}
                                        onChange={(e) => setAgeMax(Number(e.target.value))}
                                        className="flex-1 h-1.5 rounded-full appearance-none bg-gray-700 accent-[#ff4b91] cursor-pointer"
                                    />
                                </div>
                            </div>

                            {/* Расстояние */}
                            <div className="mb-8">
                                <label className="text-sm text-gray-400 font-bold mb-2 block">
                                    Расстояние: до {distanceMax} км
                                </label>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-gray-500 w-6 text-right">{distanceMax}</span>
                                    <input
                                        type="range"
                                        min={1}
                                        max={300}
                                        value={distanceMax}
                                        onChange={(e) => setDistanceMax(Number(e.target.value))}
                                        className="flex-1 h-1.5 rounded-full appearance-none bg-gray-700 accent-blue-500 cursor-pointer"
                                    />
                                </div>
                            </div>

                            {/* Кнопки */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => { resetModalFilters(); }}
                                    className="flex-1 py-4 rounded-xl text-gray-400 font-bold text-base border border-white/10 bg-transparent active:scale-95 transition"
                                >
                                    Сбросить
                                </button>
                                <button
                                    onClick={applyModalFilters}
                                    className="flex-1 py-4 bg-[#ff4b91] rounded-xl text-white font-bold text-base active:scale-95 transition"
                                >
                                    Применить
                                </button>
                            </div>
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

                            {/* Реальный статус онлайн в модалке профиля */}
                            {selectedUser.online_status === "online" ? (
                                <div className="pointer-events-auto px-3 py-1 bg-black/50 backdrop-blur-xl rounded-full border border-white/10 flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-xs font-bold text-white">Online</span>
                                </div>
                            ) : (
                                <div className="pointer-events-auto px-3 py-1 bg-black/50 backdrop-blur-xl rounded-full border border-white/10 flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-gray-500" />
                                    <span className="text-xs font-bold text-gray-400">Offline</span>
                                </div>
                            )}
                        </div>

                        {/* Image */}
                        <div className="flex-1 relative w-full bg-zinc-900">
                            <Image
                                src={getPhotoUrl(selectedUser.photos)}
                                alt={selectedUser.name}
                                className="w-full h-full object-cover"
                                fill
                                sizes="100vw"
                            />
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
