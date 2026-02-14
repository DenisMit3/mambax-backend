'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, MapPin, Users, Shield, ArrowLeft, Check } from 'lucide-react';
import { httpClient } from '@/lib/http-client';
import { useHaptic } from '@/hooks/useHaptic';
import { authService } from '@/services/api';

// ============================================
// Типы
// ============================================
interface MatchingPreferences {
    age_min: number;
    age_max: number;
    distance_km: number;
    gender_preference: string;
    show_verified_only: boolean;
}

const GENDER_OPTIONS = [
    { value: 'male', label: 'Мужчины', icon: '♂' },
    { value: 'female', label: 'Женщины', icon: '♀' },
    { value: 'all', label: 'Все', icon: '⚥' },
];

const DEFAULT_PREFS: MatchingPreferences = {
    age_min: 18,
    age_max: 45,
    distance_km: 50,
    gender_preference: 'all',
    show_verified_only: false,
};

// ============================================
// Страница настроек поиска
// ============================================
export default function PreferencesPage() {
    const router = useRouter();
    const haptic = useHaptic();

    const [prefs, setPrefs] = useState<MatchingPreferences>(DEFAULT_PREFS);
    const [loading, setLoading] = useState(true);
    const [saved, setSaved] = useState(false);

    // Ref для debounce-сохранения
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Загрузка настроек
    useEffect(() => {
        authService.getMatchingPreferences()
            .then((data) => setPrefs(prev => ({ ...prev, ...data })))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    // Автосохранение с debounce
    const savePrefs = useCallback((updated: MatchingPreferences) => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(async () => {
            try {
                await authService.updateMatchingPreferences(updated);
                setSaved(true);
                haptic.success();
                setTimeout(() => setSaved(false), 2000);
            } catch (e) {
                console.error('Ошибка сохранения:', e);
                haptic.error();
            }
        }, 600);
    }, [haptic]);

    // Обновление поля + автосохранение
    const update = useCallback(<K extends keyof MatchingPreferences>(key: K, value: MatchingPreferences[K]) => {
        setPrefs(prev => {
            const next = { ...prev, [key]: value };
            savePrefs(next);
            return next;
        });
    }, [savePrefs]);

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white pb-24">
            {/* Header */}
            <div className="px-6 pt-8 pb-6 flex items-center gap-4">
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => { haptic.light(); router.back(); }}
                    className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/70 hover:bg-white/10 transition"
                >
                    <ArrowLeft size={20} />
                </motion.button>
                <div className="flex-1">
                    <h1 className="text-2xl font-black tracking-wide">ПОИСК</h1>
                    <p className="text-xs text-slate-500 mt-0.5">Настройки подбора</p>
                </div>
                {/* Индикатор сохранения */}
                <AnimatePresence>
                    {saved && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center"
                        >
                            <Check size={16} className="text-green-400" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="px-6 space-y-6">
                {/* Возрастной диапазон */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="rounded-2xl bg-slate-950 border border-white/5 p-5"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
                            <Users size={18} className="text-purple-400" />
                        </div>
                        <div className="flex-1">
                            <span className="text-sm font-semibold">Возраст</span>
                        </div>
                        <span className="text-sm font-bold text-purple-400">
                            {prefs.age_min} — {prefs.age_max}
                        </span>
                    </div>

                    {/* Dual range slider */}
                    <DualRangeSlider
                        min={18}
                        max={65}
                        valueMin={prefs.age_min}
                        valueMax={prefs.age_max}
                        onChangeMin={(v) => update('age_min', Math.min(v, prefs.age_max - 1))}
                        onChangeMax={(v) => update('age_max', Math.max(v, prefs.age_min + 1))}
                        onInput={() => haptic.selection()}
                    />
                </motion.div>

                {/* Дистанция */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="rounded-2xl bg-slate-950 border border-white/5 p-5"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-9 h-9 rounded-xl bg-pink-500/10 flex items-center justify-center">
                            <MapPin size={18} className="text-pink-400" />
                        </div>
                        <div className="flex-1">
                            <span className="text-sm font-semibold">Расстояние</span>
                        </div>
                        <span className="text-sm font-bold text-pink-400">
                            {prefs.distance_km} км
                        </span>
                    </div>

                    <input
                        type="range"
                        min={1}
                        max={100}
                        value={prefs.distance_km}
                        onChange={(e) => update('distance_km', Number(e.target.value))}
                        onInput={() => haptic.selection()}
                        className="w-full h-1.5 rounded-full appearance-none bg-white/10 accent-pink-500 cursor-pointer
                            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-pink-500 [&::-webkit-slider-thumb]:shadow-lg
                            [&::-webkit-slider-thumb]:shadow-pink-500/30"
                    />
                    <div className="flex justify-between mt-2 text-[10px] text-slate-600">
                        <span>1 км</span>
                        <span>100 км</span>
                    </div>
                </motion.div>

                {/* Пол */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="rounded-2xl bg-slate-950 border border-white/5 p-5"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
                            <SlidersHorizontal size={18} className="text-purple-400" />
                        </div>
                        <span className="text-sm font-semibold">Кого показывать</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        {GENDER_OPTIONS.map((opt) => (
                            <motion.button
                                key={opt.value}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => { haptic.light(); update('gender_preference', opt.value); }}
                                className={`py-3 rounded-xl text-sm font-medium transition-all ${
                                    prefs.gender_preference === opt.value
                                        ? 'bg-gradient-to-br from-purple-500/30 to-pink-500/20 border border-purple-500/40 text-white'
                                        : 'bg-white/5 text-slate-400 hover:bg-white/10'
                                }`}
                            >
                                <span className="text-lg block mb-0.5">{opt.icon}</span>
                                {opt.label}
                            </motion.button>
                        ))}
                    </div>
                </motion.div>

                {/* Только верифицированные */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="rounded-2xl bg-slate-950 border border-white/5 p-5"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                            <Shield size={18} className="text-green-400" />
                        </div>
                        <div className="flex-1">
                            <div className="text-sm font-semibold">Только верифицированные</div>
                            <div className="text-xs text-slate-500 mt-0.5">Показывать профили с подтверждённой личностью</div>
                        </div>
                        <ToggleButton
                            checked={prefs.show_verified_only}
                            onChange={(v) => { haptic.light(); update('show_verified_only', v); }}
                        />
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

// ============================================
// Dual Range Slider (два ползунка)
// ============================================
function DualRangeSlider({
    min, max, valueMin, valueMax, onChangeMin, onChangeMax, onInput,
}: {
    min: number; max: number;
    valueMin: number; valueMax: number;
    onChangeMin: (v: number) => void;
    onChangeMax: (v: number) => void;
    onInput?: () => void;
}) {
    // Процент заполнения для визуальной полоски
    const leftPct = ((valueMin - min) / (max - min)) * 100;
    const rightPct = ((valueMax - min) / (max - min)) * 100;

    return (
        <div className="relative h-5">
            {/* Фоновая полоска */}
            <div className="absolute top-1/2 -translate-y-1/2 w-full h-1.5 rounded-full bg-white/10" />
            {/* Активная полоска */}
            <div
                className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                style={{ left: `${leftPct}%`, width: `${rightPct - leftPct}%` }}
            />
            {/* Ползунок min */}
            <input
                type="range"
                min={min}
                max={max}
                value={valueMin}
                onChange={(e) => onChangeMin(Number(e.target.value))}
                onInput={onInput}
                className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-500 [&::-webkit-slider-thumb]:shadow-lg
                    [&::-webkit-slider-thumb]:shadow-purple-500/30 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:cursor-pointer
                    [&::-webkit-slider-thumb]:relative [&::-webkit-slider-thumb]:z-10"
            />
            {/* Ползунок max */}
            <input
                type="range"
                min={min}
                max={max}
                value={valueMax}
                onChange={(e) => onChangeMax(Number(e.target.value))}
                onInput={onInput}
                className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-pink-500 [&::-webkit-slider-thumb]:shadow-lg
                    [&::-webkit-slider-thumb]:shadow-pink-500/30 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:cursor-pointer
                    [&::-webkit-slider-thumb]:relative [&::-webkit-slider-thumb]:z-20"
            />
            {/* Подписи */}
            <div className="absolute -bottom-4 w-full flex justify-between text-[10px] text-slate-600">
                <span>{min}</span>
                <span>{max}</span>
            </div>
        </div>
    );
}

// ============================================
// Toggle Button (инлайн, без внешнего компонента)
// ============================================
function ToggleButton({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <motion.button
            type="button"
            onClick={() => onChange(!checked)}
            whileTap={{ scale: 0.95 }}
            className={`w-12 h-6 rounded-full relative transition-colors duration-300 shrink-0 ${
                checked ? 'bg-green-500' : 'bg-white/10'
            }`}
        >
            <motion.div
                className="w-5 h-5 bg-white rounded-full absolute top-0.5"
                animate={{ x: checked ? 26 : 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
        </motion.button>
    );
}
