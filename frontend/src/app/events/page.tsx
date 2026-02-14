"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Calendar,
    MapPin,
    Users,
    Plus,
    ArrowLeft,
    Clock,
    Sparkles,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    X,
} from "lucide-react";
import { authService } from "@/services/api";
import { FALLBACK_AVATAR } from "@/lib/constants";
import { useHaptic } from "@/hooks/useHaptic";
import { useRequireAuth } from "@/hooks/useRequireAuth";

// ============================================
// Типы
// ============================================

interface EventItem {
    id: string;
    title: string;
    description: string;
    date: string;
    location: string;
    image_url: string;
    attendees_count: number;
    category: string;
}

interface ToastState {
    message: string;
    type: "success" | "error" | "info";
    visible: boolean;
}

// ============================================
// Константы
// ============================================

const CATEGORIES = ["All", "Speed Dating", "Parties", "Outdoor", "Online"] as const;
type Category = (typeof CATEGORIES)[number];

const categoryColor: Record<string, string> = {
    "Speed Dating": "from-pink-500 to-rose-600",
    Parties: "from-purple-500 to-violet-600",
    Outdoor: "from-emerald-500 to-green-600",
    Online: "from-blue-500 to-cyan-600",
};

// ============================================
// Утилиты
// ============================================

/** Форматирование даты */
function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "short",
        weekday: "short",
    });
}

/** Форматирование времени */
function formatTime(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

/** Нормализация URL изображений */
function resolveImageUrl(url: string | undefined | null): string {
    if (!url) return FALLBACK_AVATAR;
    if (url.startsWith("http") || url.startsWith("data:")) return url;
    if (url.startsWith("/static/")) return `/api_proxy${url}`;
    return `/api_proxy/${url.replace(/^\//, "")}`;
}

// ============================================
// Компонент Toast
// ============================================

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
    useEffect(() => {
        if (!toast.visible) return;
        const timer = setTimeout(onClose, 3500);
        return () => clearTimeout(timer);
    }, [toast.visible, onClose]);

    const iconMap = {
        success: <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />,
        error: <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />,
        info: <Sparkles className="w-5 h-5 text-purple-400 shrink-0" />,
    };

    const bgMap = {
        success: "border-green-500/30 bg-green-950/80",
        error: "border-red-500/30 bg-red-950/80",
        info: "border-purple-500/30 bg-purple-950/80",
    };

    return (
        <AnimatePresence>
            {toast.visible && (
                <motion.div
                    initial={{ opacity: 0, y: -30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -30 }}
                    className={`fixed top-4 left-4 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-2xl border backdrop-blur-xl ${bgMap[toast.type]}`}
                >
                    {iconMap[toast.type]}
                    <span className="text-sm font-medium flex-1">{toast.message}</span>
                    <button onClick={onClose} className="p-2.5 rounded-full hover:bg-white/10">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// ============================================
// Основной компонент
// ============================================

export default function EventsPage() {
    const router = useRouter();
    const haptic = useHaptic();
    const { isAuthed, isChecking } = useRequireAuth();

    // Состояния
    const [activeCategory, setActiveCategory] = useState<Category>("All");
    const [events, setEvents] = useState<EventItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
    const [registering, setRegistering] = useState(false);
    const [toast, setToast] = useState<ToastState>({ message: "", type: "info", visible: false });

    // Реф для отмены запросов при размонтировании
    const cancelledRef = useRef(false);

    // ============================================
    // Toast хелпер
    // ============================================

    const showToast = useCallback((message: string, type: ToastState["type"] = "info") => {
        setToast({ message, type, visible: true });
    }, []);

    const hideToast = useCallback(() => {
        setToast((prev) => ({ ...prev, visible: false }));
    }, []);

    // ============================================
    // Получение геолокации
    // ============================================

    const getCoords = useCallback((): Promise<{ lat: number; lon: number } | null> => {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                resolve(null);
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
                () => resolve(null),
                { timeout: 5000, maximumAge: 60000 }
            );
        });
    }, []);

    // ============================================
    // Загрузка событий
    // ============================================

    const loadEvents = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            // Пытаемся получить координаты пользователя
            const coords = await getCoords();
            const res = await authService.getEvents(coords?.lat, coords?.lon);

            if (!cancelledRef.current) {
                setEvents(res.events ?? []);
            }
        } catch (err) {
            if (!cancelledRef.current) {
                console.error("[Events] Ошибка загрузки:", err);
                setError("Не удалось загрузить события. Проверьте подключение к интернету.");
            }
        } finally {
            if (!cancelledRef.current) {
                setLoading(false);
            }
        }
    }, [getCoords]);

    useEffect(() => {
        if (!isAuthed) return;
        cancelledRef.current = false;
        loadEvents();
        return () => {
            cancelledRef.current = true;
        };
    }, [isAuthed, loadEvents]);

    // ============================================
    // Регистрация на событие
    // ============================================

    const handleRegister = useCallback(
        async (eventId: string) => {
            if (registering) return;
            setRegistering(true);
            haptic.success();

            try {
                const res = await authService.registerForEvent(eventId);
                if (res.success) {
                    showToast(res.message || "Вы зарегистрированы на событие!", "success");
                    // Обновляем счётчик участников локально
                    setEvents((prev) =>
                        prev.map((e) =>
                            e.id === eventId ? { ...e, attendees_count: e.attendees_count + 1 } : e
                        )
                    );
                    // Обновляем и в модалке, если открыта
                    setSelectedEvent((prev) =>
                        prev && prev.id === eventId
                            ? { ...prev, attendees_count: prev.attendees_count + 1 }
                            : prev
                    );
                } else {
                    showToast(res.message || "Не удалось зарегистрироваться", "error");
                }
            } catch (err: unknown) {
                const message =
                    err instanceof Error ? err.message : "Ошибка регистрации. Попробуйте позже.";
                showToast(message, "error");
            } finally {
                setRegistering(false);
            }
        },
        [registering, haptic, showToast]
    );

    // ============================================
    // FAB — создание события (заглушка)
    // ============================================

    const handleCreateEvent = useCallback(() => {
        haptic.medium();
        showToast("Создание событий скоро будет доступно", "info");
    }, [haptic, showToast]);

    // ============================================
    // Фильтрация по категории
    // ============================================

    const filtered =
        activeCategory === "All" ? events : events.filter((e) => e.category === activeCategory);

    // ============================================
    // Рендер
    // ============================================

    return (
        <div className="min-h-screen bg-black text-white pb-24">
            {/* Toast уведомления */}
            <Toast toast={toast} onClose={hideToast} />

            {/* Хедер */}
            <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-xl border-b border-white/5">
                <div className="flex items-center gap-3 px-4 py-3">
                    <button
                        onClick={() => {
                            haptic.light();
                            router.back();
                        }}
                        className="p-2 rounded-full hover:bg-white/10 transition-colors"
                        aria-label="Назад"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                        <h1 className="text-lg font-bold">События</h1>
                    </div>
                </div>

                {/* Фильтры категорий */}
                <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => {
                                haptic.selection();
                                setActiveCategory(cat);
                            }}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                                activeCategory === cat
                                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25"
                                    : "bg-slate-950 text-slate-400 hover:text-white"
                            }`}
                        >
                            {cat === "All" ? "Все" : cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Контент */}
            <div className="px-4 pt-4">
                {loading ? (
                    /* Скелетоны загрузки */
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="rounded-2xl bg-slate-950 overflow-hidden border border-white/5">
                                <div className="h-40 bg-slate-900 animate-pulse" />
                                <div className="p-4 space-y-3">
                                    <div className="h-5 w-3/4 bg-slate-800 rounded animate-pulse" />
                                    <div className="flex gap-4">
                                        <div className="h-4 w-24 bg-slate-800 rounded animate-pulse" />
                                        <div className="h-4 w-16 bg-slate-800 rounded animate-pulse" />
                                    </div>
                                    <div className="h-4 w-1/2 bg-slate-800 rounded animate-pulse" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    /* Ошибка загрузки */
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center py-20 text-center"
                    >
                        <div className="w-16 h-16 rounded-full bg-red-950/50 border border-red-500/20 flex items-center justify-center mb-4">
                            <AlertCircle className="w-8 h-8 text-red-400" />
                        </div>
                        <h2 className="text-xl font-bold mb-2">Ошибка загрузки</h2>
                        <p className="text-slate-400 text-sm max-w-xs mb-6">{error}</p>
                        <button
                            onClick={loadEvents}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 font-semibold text-sm active:scale-[0.97] transition-transform"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Попробовать снова
                        </button>
                    </motion.div>
                ) : filtered.length === 0 ? (
                    /* Пустой список */
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center py-20 text-center"
                    >
                        <div className="w-16 h-16 rounded-full bg-slate-950 flex items-center justify-center mb-4">
                            <Calendar className="w-8 h-8 text-purple-400" />
                        </div>
                        <h2 className="text-xl font-bold mb-2">Событий пока нет</h2>
                        <p className="text-slate-400 text-sm max-w-xs">
                            {activeCategory !== "All"
                                ? `В категории «${activeCategory}» пока нет событий. Попробуйте другую категорию.`
                                : "Мы готовим классные события для знакомств. Следите за обновлениями!"}
                        </p>
                    </motion.div>
                ) : (
                    /* Список карточек */
                    <motion.div
                        className="space-y-4"
                        initial="hidden"
                        animate="visible"
                        variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
                    >
                        {filtered.map((event) => (
                            <motion.div
                                key={event.id}
                                variants={{
                                    hidden: { opacity: 0, y: 20 },
                                    visible: { opacity: 1, y: 0 },
                                }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => {
                                    haptic.light();
                                    setSelectedEvent(event);
                                }}
                                className="rounded-2xl overflow-hidden bg-slate-950 border border-white/5 cursor-pointer active:border-purple-500/30 transition-colors"
                            >
                                {/* Изображение */}
                                <div className="relative h-40 overflow-hidden">
                                    <img
                                        src={resolveImageUrl(event.image_url)}
                                        alt={event.title}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                                    {/* Бейдж категории */}
                                    <span
                                        className={`absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r ${
                                            categoryColor[event.category] || "from-slate-500 to-slate-600"
                                        }`}
                                    >
                                        {event.category}
                                    </span>
                                    {/* Участники */}
                                    <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1">
                                        <Users className="w-3.5 h-3.5 text-purple-400" />
                                        <span className="text-xs font-medium">{event.attendees_count}</span>
                                    </div>
                                </div>

                                {/* Инфо */}
                                <div className="p-4 space-y-2">
                                    <h3 className="font-bold text-base leading-tight">{event.title}</h3>
                                    <div className="flex items-center gap-4 text-xs text-slate-400">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {formatDate(event.date)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5" />
                                            {formatTime(event.date)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-slate-500">
                                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                                        <span className="truncate">{event.location}</span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </div>

            {/* FAB — создать событие */}
            <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 260, damping: 20 }}
                onClick={handleCreateEvent}
                className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg shadow-purple-500/30 flex items-center justify-center active:scale-95 transition-transform"
                aria-label="Создать событие"
            >
                <Plus className="w-6 h-6" />
            </motion.button>

            {/* Модалка деталей события */}
            <AnimatePresence>
                {selectedEvent && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center"
                        onClick={() => setSelectedEvent(null)}
                    >
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-lg bg-slate-950 rounded-t-3xl border-t border-white/10 overflow-hidden"
                        >
                            {/* Ручка */}
                            <div className="flex justify-center pt-3 pb-2">
                                <div className="w-10 h-1 rounded-full bg-white/20" />
                            </div>

                            <div className="px-5 pb-8 space-y-4">
                                <img
                                    src={resolveImageUrl(selectedEvent.image_url)}
                                    alt={selectedEvent.title}
                                    className="w-full h-48 object-cover rounded-2xl"
                                />
                                <h2 className="text-xl font-bold">{selectedEvent.title}</h2>
                                <p className="text-sm text-slate-400 leading-relaxed">
                                    {selectedEvent.description}
                                </p>

                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2 text-slate-300">
                                        <Calendar className="w-4 h-4 text-purple-400" />
                                        {formatDate(selectedEvent.date)}, {formatTime(selectedEvent.date)}
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-300">
                                        <MapPin className="w-4 h-4 text-pink-400" />
                                        {selectedEvent.location}
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-300">
                                        <Users className="w-4 h-4 text-purple-400" />
                                        {selectedEvent.attendees_count} участников
                                    </div>
                                </div>

                                <button
                                    disabled={registering}
                                    onClick={() => handleRegister(selectedEvent.id)}
                                    className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 font-semibold text-sm active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {registering ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            Регистрация...
                                        </>
                                    ) : (
                                        "Хочу пойти"
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
