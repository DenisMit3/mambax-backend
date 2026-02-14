'use client';

import React from 'react';
import Image from 'next/image';
import { Camera, Check, Loader2, ArrowRight, Ruler, Baby, Cigarette, Wine, BookOpen, Briefcase, Star, Heart, X, Moon, Coffee, Sparkles, Music } from 'lucide-react';
import { type UserData } from './onboardingTypes';

interface OnboardingSummaryProps {
    userData: UserData;
    isSubmitting: boolean;
    onBack: () => void;
    onConfirm: () => void;
}

// --- Хелпер: стили для чипов анкеты ---
const getDetailStyle = (key: string) => {
    switch (key) {
        case 'zodiac': return "bg-purple-100 text-purple-700 hover:bg-purple-200";
        case 'height': return "bg-slate-100 text-slate-600 hover:bg-slate-200";
        case 'intent': return "bg-pink-100 text-pink-700 hover:bg-pink-200";
        case 'children_clean': return "bg-amber-100 text-amber-700 hover:bg-amber-200";
        case 'smoking': return "bg-zinc-100 text-zinc-600 hover:bg-zinc-200";
        case 'alcohol': return "bg-orange-50 text-orange-600 hover:bg-orange-100";
        default: return "bg-slate-50 text-slate-700 hover:bg-slate-100";
    }
};

// --- Хелпер: иконки для чипов анкеты ---
const getDetailIcon = (key: string) => {
    const props = { size: 14, className: "shrink-0" };
    switch (key) {
        case 'height': return <Ruler {...props} />;
        case 'children_clean': return <Baby {...props} />;
        case 'smoking': return <Cigarette {...props} />;
        case 'alcohol': return <Wine {...props} />;
        case 'education': return <BookOpen {...props} />;
        case 'job': return <Briefcase {...props} />;
        case 'intent': return <Heart {...props} />;
        case 'zodiac': return <Moon {...props} />;
        case 'love_language': return <Star {...props} />;
        case 'personality_type': return <Coffee {...props} />;
        default: return <Sparkles {...props} />;
    }
};

// --- Экран превью профиля (summary) ---
export default function OnboardingSummary({ userData, isSubmitting, onBack, onConfirm }: OnboardingSummaryProps) {
    return (
        <div className="absolute inset-0 bg-white z-50 animate-in fade-in duration-500 font-sans text-slate-900 flex flex-col">
            {/* Фото-шапка */}
            <div className="relative h-[62%] shrink-0 w-full overflow-hidden">
                {userData.photos[0] ? (
                    <Image src={userData.photos[0].preview} className="w-full h-full object-cover" alt="Profile" fill unoptimized />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-300">
                        <Camera size={48} className="opacity-50" />
                    </div>
                )}

                {/* Градиент для читаемости текста */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10" />

                {/* Верхняя навигация */}
                <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-20">
                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
                        <ArrowRight className="rotate-180" size={20} />
                    </div>
                    <div className="px-3 py-1 rounded-full bg-white/20 backdrop-blur text-xs font-bold text-white border border-white/20">
                        Анкета
                    </div>
                </div>

                {/* Имя и био */}
                <div className="absolute bottom-6 left-0 right-0 px-6 z-20 text-white">
                    <h1 className="text-3xl font-bold flex items-center gap-2 drop-shadow-md">
                        {userData.name}, {userData.age}
                        <span className="bg-blue-500 text-white rounded-full p-0.5"><Check size={14} strokeWidth={4} /></span>
                    </h1>
                    <p className="text-white/90 text-sm font-medium leading-relaxed mt-2 line-clamp-2 drop-shadow-sm opacity-90">
                        {userData.bio || 'Привет! Я тут новенький.'}
                    </p>
                </div>
            </div>

            {/* Контент-область */}
            <div className="flex-1 -mt-6 rounded-t-[32px] bg-white relative z-10 px-6 pt-8 pb-32 overflow-y-auto scrollbar-hide shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
                {/* Секция: Анкета */}
                <div className="mb-6">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Анкета</h3>
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(userData.details).map(([key, value], idx) => {
                            if (!value) return null;
                            return (
                                <div key={idx} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${getDetailStyle(key)}`}>
                                    {getDetailIcon(key)}
                                    <span>{value}</span>
                                </div>
                            );
                        })}
                        {/* Чип пола */}
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold">
                            <Ruler size={14} className="shrink-0" />
                            <span>{userData.gender === 'male' ? 'Мужчина' : 'Женщина'}</span>
                        </div>
                    </div>
                </div>

                {/* Секция: Интересы */}
                <div className="mb-6">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Интересы</h3>
                    <div className="flex flex-wrap gap-2">
                        {userData.interests.map((tag, i) => (
                            <span key={tag || i} className="px-3 py-1.5 bg-pink-50 text-pink-600 rounded-full text-xs font-bold border border-pink-100 flex items-center gap-1">
                                {tag}
                            </span>
                        ))}
                        {userData.interests.length === 0 && <span className="text-xs text-gray-400">Нет интересов</span>}
                    </div>
                </div>

                {/* Секция: Музыка */}
                <div className="mb-6">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Музыка</h3>
                    <div className="flex flex-wrap gap-2">
                        {['The Weeknd', 'Arctic Monkeys', 'Drake'].map((m) => (
                            <div key={m} className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs font-bold border border-blue-100 flex items-center gap-1">
                                <Music size={12} /> {m}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Кнопки действий (фиксированные внизу) */}
            <div className="absolute bottom-8 left-0 right-0 px-10 flex justify-between items-center z-30 pointer-events-none">
                <div className="w-full flex justify-center gap-8 pointer-events-auto">
                    {/* Назад */}
                    <button onClick={onBack} className="w-14 h-14 rounded-full bg-white border border-gray-100 shadow-xl shadow-red-100 flex items-center justify-center text-rose-500 hover:scale-110 active:scale-95 transition-all">
                        <X size={28} strokeWidth={2.5} />
                    </button>
                    {/* Звезда */}
                    <button className="w-10 h-10 rounded-full bg-white border border-gray-100 shadow-lg shadow-purple-100 flex items-center justify-center text-purple-400 hover:scale-110 transition-all mt-2">
                        <Star size={20} fill="currentColor" stroke="none" />
                    </button>
                    {/* Подтвердить */}
                    <button onClick={onConfirm} disabled={isSubmitting} className="w-14 h-14 rounded-full bg-blue-500 shadow-xl shadow-blue-200 flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all">
                        {isSubmitting ? <Loader2 className="animate-spin" /> : <Check size={28} strokeWidth={3} />}
                    </button>
                </div>
            </div>
        </div>
    );
}
