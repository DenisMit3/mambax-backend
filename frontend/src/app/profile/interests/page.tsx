'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Hash, ArrowLeft, Check, Search } from 'lucide-react';

import { authService } from '@/services/api';
import { httpClient } from '@/lib/http-client';
import { useHaptic } from '@/hooks/useHaptic';
import { useRequireAuth } from "@/hooks/useRequireAuth";

const MAX_INTERESTS = 10;

interface Category {
    name: string;
    interests: string[];
}

export default function InterestsPage() {
    const router = useRouter();
    const { isAuthed, isChecking } = useRequireAuth();
    const haptic = useHaptic();

    const [categories, setCategories] = useState<Category[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Загрузка категорий и текущих интересов
    useEffect(() => {
        if (!isAuthed) return;
        const load = async () => {
            try {
                const [catData, me] = await Promise.all([
                    authService.getInterestCategories(),
                    authService.getMe(),
                ]);
                setCategories(catData.categories);
                if (me.interests?.length) {
                    setSelected(new Set(me.interests));
                }
            } catch (e) {
                console.error('Ошибка загрузки интересов:', e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [isAuthed]);

    // Фильтрация по поиску
    const filtered = useMemo(() => {
        if (!search.trim()) return categories;
        const q = search.toLowerCase();
        return categories
            .map(cat => ({
                ...cat,
                interests: cat.interests.filter(i => i.toLowerCase().includes(q)),
            }))
            .filter(cat => cat.interests.length > 0);
    }, [categories, search]);

    // Переключение интереса
    const toggle = (interest: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(interest)) {
                next.delete(interest);
                haptic.light();
            } else if (next.size < MAX_INTERESTS) {
                next.add(interest);
                haptic.medium();
            } else {
                haptic.error();
            }
            return next;
        });
    };

    // Сохранение
    const save = async () => {
        setSaving(true);
        try {
            await authService.updateInterests(Array.from(selected));
            haptic.success();
            router.back();
        } catch (e) {
            console.error('Ошибка сохранения:', e);
            haptic.error();
        } finally {
            setSaving(false);
        }
    };

    if (loading || isChecking) {
        return (
            <div className="flex items-center justify-center h-full bg-black">
                <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white pb-24">
            {/* Шапка */}
            <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-xl border-b border-white/5 px-4 py-3">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.back()} className="p-1.5 rounded-full hover:bg-white/10 transition">
                        <ArrowLeft className="w-5 h-5 text-slate-300" />
                    </button>
                    <h1 className="text-lg font-semibold flex-1">Мои интересы</h1>
                    <span className="text-sm font-medium text-purple-400">
                        {selected.size}/{MAX_INTERESTS}
                    </span>
                </div>

                {/* Поиск */}
                <div className="mt-3 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Поиск интересов..."
                        inputMode="search"
                        autoComplete="off"
                        autoCapitalize="off"
                        enterKeyHint="search"
                        className="w-full bg-slate-950 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 border border-white/5 focus:border-purple-500/50 focus:outline-none transition"
                    />
                </div>
            </div>

            {/* Категории */}
            <div className="px-4 pt-4 space-y-6">
                {filtered.map(cat => (
                    <section key={cat.name}>
                        <div className="flex items-center gap-2 mb-3">
                            <Hash className="w-4 h-4 text-purple-400" />
                            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
                                {cat.name}
                            </h2>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {cat.interests.map(interest => {
                                const active = selected.has(interest);
                                return (
                                    <motion.button
                                        key={interest}
                                        whileTap={{ scale: 0.92 }}
                                        onClick={() => toggle(interest)}
                                        className={`
                                            px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors
                                            ${active
                                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                                                : 'bg-slate-950 text-slate-400 border border-white/5 hover:border-purple-500/30'
                                            }
                                        `}
                                    >
                                        <span className="flex items-center gap-1.5">
                                            {active && <Check className="w-3.5 h-3.5" />}
                                            {interest}
                                        </span>
                                    </motion.button>
                                );
                            })}
                        </div>
                    </section>
                ))}

                {filtered.length === 0 && (
                    <p className="text-center text-slate-600 py-12 text-sm">Ничего не найдено</p>
                )}
            </div>

            {/* Кнопка сохранения */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/95 to-transparent">
                <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={save}
                    disabled={saving || selected.size === 0}
                    className="w-full py-3.5 rounded-2xl font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-500 disabled:opacity-40 transition-opacity"
                >
                    {saving ? 'Сохранение...' : 'Сохранить'}
                </motion.button>
            </div>
        </div>
    );
}
