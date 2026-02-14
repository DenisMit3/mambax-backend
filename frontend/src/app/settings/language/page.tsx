'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Search, Check, ArrowLeft } from 'lucide-react';
import { useHaptic } from '@/hooks/useHaptic';
import { authService } from '@/services/api';

// ============================================
// Список языков с флагами
// ============================================
const LANGUAGES = [
    { code: 'ru', name: 'Russian', native_name: 'Русский', flag: '🇷🇺' },
    { code: 'en', name: 'English', native_name: 'English', flag: '🇬🇧' },
    { code: 'uk', name: 'Ukrainian', native_name: 'Українська', flag: '🇺🇦' },
    { code: 'kk', name: 'Kazakh', native_name: 'Қазақша', flag: '🇰🇿' },
    { code: 'uz', name: 'Uzbek', native_name: "O'zbek", flag: '🇺🇿' },
    { code: 'de', name: 'German', native_name: 'Deutsch', flag: '🇩🇪' },
    { code: 'fr', name: 'French', native_name: 'Français', flag: '🇫🇷' },
    { code: 'es', name: 'Spanish', native_name: 'Español', flag: '🇪🇸' },
    { code: 'tr', name: 'Turkish', native_name: 'Türkçe', flag: '🇹🇷' },
    { code: 'zh', name: 'Chinese', native_name: '中文', flag: '🇨🇳' },
];

// ============================================
// Страница выбора языка
// ============================================
export default function LanguagePage() {
    const router = useRouter();
    const haptic = useHaptic();

    const [selected, setSelected] = useState('ru');
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState(false);

    // Фильтрация по поиску
    const filtered = LANGUAGES.filter((lang) => {
        const q = search.toLowerCase();
        return (
            lang.native_name.toLowerCase().includes(q) ||
            lang.name.toLowerCase().includes(q) ||
            lang.code.includes(q)
        );
    });

    // Выбор языка — автосохранение
    const selectLanguage = async (code: string) => {
        if (code === selected || saving) return;
        haptic.light();
        setSelected(code);
        setSaving(true);
        try {
            await authService.setLanguage(code);
            haptic.success();
        } catch (e) {
            console.error('Ошибка сохранения языка:', e);
            haptic.error();
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white pb-24">
            {/* Шапка */}
            <div className="px-6 pt-8 pb-4 flex items-center gap-4">
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => { haptic.light(); router.back(); }}
                    className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/70 hover:bg-white/10 transition"
                >
                    <ArrowLeft size={20} />
                </motion.button>
                <div className="flex-1">
                    <h1 className="text-2xl font-black tracking-wide">ЯЗЫК</h1>
                    <p className="text-xs text-slate-500 mt-0.5">Язык интерфейса</p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
                    <Globe size={18} className="text-purple-400" />
                </div>
            </div>

            {/* Поиск */}
            <div className="px-6 mb-4">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative"
                >
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Поиск языка..."
                        className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-950 border border-white/5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-purple-500/40 transition"
                    />
                </motion.div>
            </div>

            {/* Список языков */}
            <div className="px-6 space-y-2">
                <AnimatePresence mode="popLayout">
                    {filtered.map((lang, i) => {
                        const isActive = lang.code === selected;
                        return (
                            <motion.button
                                key={lang.code}
                                layout
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: i * 0.03 }}
                                onClick={() => selectLanguage(lang.code)}
                                className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${
                                    isActive
                                        ? 'bg-gradient-to-r from-purple-500/15 to-pink-500/10 border border-purple-500/30'
                                        : 'bg-slate-950 border border-white/5 hover:bg-white/5'
                                }`}
                            >
                                <span className="text-2xl">{lang.flag}</span>
                                <div className="flex-1 text-left">
                                    <div className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-slate-300'}`}>
                                        {lang.native_name}
                                    </div>
                                    <div className="text-xs text-slate-500">{lang.name}</div>
                                </div>
                                {isActive && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center"
                                    >
                                        <Check size={14} className="text-purple-400" />
                                    </motion.div>
                                )}
                            </motion.button>
                        );
                    })}
                </AnimatePresence>

                {filtered.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-12 text-slate-600 text-sm"
                    >
                        Ничего не найдено
                    </motion.div>
                )}
            </div>
        </div>
    );
}
