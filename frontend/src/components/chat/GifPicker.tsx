"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from 'next/image';
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, TrendingUp, Loader2 } from "lucide-react";
import { httpClient } from "@/lib/http-client";
import { useHaptic } from "@/hooks/useHaptic";

interface GifItem {
    id: string;
    url: string;
    preview_url: string;
    width: number;
    height: number;
    title?: string;
}

interface GifPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectGif: (gifUrl: string) => void;
}

export function GifPicker({ isOpen, onClose, onSelectGif }: GifPickerProps) {
    const haptic = useHaptic();
    const [query, setQuery] = useState("");
    const [gifs, setGifs] = useState<GifItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<"trending" | "search">("trending");
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    // Load trending on open
    useEffect(() => {
        if (isOpen) {
            loadTrending();
            setTimeout(() => inputRef.current?.focus(), 300);
        } else {
            setQuery("");
            setGifs([]);
            setMode("trending");
        }
    }, [isOpen]);

    // Debounced search
    useEffect(() => {
        if (!query.trim()) {
            if (mode === "search") {
                setMode("trending");
                loadTrending();
            }
            return;
        }

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            searchGifs(query.trim());
        }, 400);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [query]);

    const loadTrending = async () => {
        setLoading(true);
        try {
            const data = await httpClient.get<{ gifs: GifItem[] }>("/api/chat/gifs/trending?limit=30");
            setGifs(data.gifs || []);
        } catch {
            setGifs([]);
        } finally {
            setLoading(false);
        }
    };

    const searchGifs = async (q: string) => {
        setLoading(true);
        setMode("search");
        try {
            const data = await httpClient.get<{ gifs: GifItem[] }>(`/api/chat/gifs/search?q=${encodeURIComponent(q)}&limit=30`);
            setGifs(data.gifs || []);
        } catch {
            setGifs([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = useCallback((gif: GifItem) => {
        haptic.light();
        onSelectGif(gif.url || gif.preview_url);
        onClose();
    }, [haptic, onSelectGif, onClose]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="absolute bottom-0 left-0 right-0 h-[70vh] bg-slate-950 border-t border-slate-800 rounded-t-3xl flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Handle */}
                    <div className="flex justify-center pt-3 pb-1">
                        <div className="w-10 h-1 rounded-full bg-slate-700" />
                    </div>

                    {/* Header */}
                    <div className="px-4 pb-3 flex items-center justify-between">
                        <h3 className="text-white font-black text-sm uppercase tracking-widest">GIF</h3>
                        <button onClick={onClose} className="p-1.5 rounded-full bg-slate-800 text-slate-400">
                            <X size={16} />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="px-4 pb-3">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Поиск GIF..."
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50"
                            />
                            {query && (
                                <button
                                    onClick={() => setQuery("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Mode indicator */}
                    {mode === "trending" && !loading && gifs.length > 0 && (
                        <div className="px-4 pb-2 flex items-center gap-1.5">
                            <TrendingUp size={12} className="text-pink-400" />
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Trending</span>
                        </div>
                    )}

                    {/* Grid */}
                    <div className="flex-1 overflow-y-auto px-3 pb-6">
                        {loading && (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 size={24} className="text-purple-400 animate-spin" />
                            </div>
                        )}

                        {!loading && gifs.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <p className="text-slate-500 text-sm">
                                    {mode === "search" ? "Ничего не найдено" : "Нет доступных GIF"}
                                </p>
                                <p className="text-slate-600 text-xs mt-1">
                                    {mode === "search" ? "Попробуйте другой запрос" : "Попробуйте позже"}
                                </p>
                            </div>
                        )}

                        {!loading && gifs.length > 0 && (
                            <div className="grid grid-cols-2 gap-1.5">
                                {gifs.map((gif) => (
                                    <motion.button
                                        key={gif.id}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => handleSelect(gif)}
                                        className="relative rounded-xl overflow-hidden bg-slate-900 aspect-square"
                                    >
                                        <Image
                                            src={gif.preview_url || gif.url}
                                            alt={gif.title || "GIF"}
                                            loading="lazy"
                                            className="w-full h-full object-cover"
                                            fill
                                            unoptimized
                                        />
                                    </motion.button>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
