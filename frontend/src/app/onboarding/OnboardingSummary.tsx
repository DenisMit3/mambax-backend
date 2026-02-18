'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
    Check, Loader2, ArrowLeft, ChevronLeft, ChevronRight,
    Ruler, Baby, Cigarette, Wine, BookOpen, Briefcase, Star,
    Heart, X, Moon, Coffee, Sparkles, Music, MapPin, User,
    Target, PawPrint, Calendar, MessageCircle, Brain, Flame
} from 'lucide-react';
import { type UserData } from './onboardingTypes';

interface OnboardingSummaryProps {
    userData: UserData;
    isSubmitting: boolean;
    onBack: () => void;
    onConfirm: () => void;
}

// --- Лейблы для полей анкеты ---
const DETAIL_LABELS: Record<string, string> = {
    city: 'Город',
    intent: 'Ищу',
    education: 'Образование',
    job: 'Работа',
    height: 'Рост',
    children_clean: 'Дети',
    smoking: 'Курение',
    alcohol: 'Алкоголь',
    zodiac: 'Знак зодиака',
    personality_type: 'Тип личности',
    love_language: 'Язык любви',
    pets: 'Питомцы',
    ideal_date: 'Идеальное свидание',
};

// --- Иконки для полей ---
const getDetailIcon = (key: string) => {
    const props = { size: 16, className: "shrink-0" };
    switch (key) {
        case 'city': return <MapPin {...props} />;
        case 'height': return <Ruler {...props} />;
        case 'children_clean': return <Baby {...props} />;
        case 'smoking': return <Cigarette {...props} />;
        case 'alcohol': return <Wine {...props} />;
        case 'education': return <BookOpen {...props} />;
        case 'job': return <Briefcase {...props} />;
        case 'intent': return <Target {...props} />;
        case 'zodiac': return <Moon {...props} />;
        case 'love_language': return <Heart {...props} />;
        case 'personality_type': return <Brain {...props} />;
        case 'pets': return <PawPrint {...props} />;
        case 'ideal_date': return <Calendar {...props} />;
        default: return <Sparkles {...props} />;
    }
};

// --- Цвета для категорий чипов ---
const getChipStyle = (key: string) => {
    switch (key) {
        case 'city': return 'bg-blue-500/15 text-blue-400 border-blue-500/20';
        case 'intent': return 'bg-pink-500/15 text-pink-400 border-pink-500/20';
        case 'zodiac': return 'bg-purple-500/15 text-purple-400 border-purple-500/20';
        case 'personality_type': return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20';
        case 'love_language': return 'bg-rose-500/15 text-rose-400 border-rose-500/20';
        case 'children_clean': return 'bg-amber-500/15 text-amber-400 border-amber-500/20';
        case 'smoking': return 'bg-slate-500/15 text-slate-400 border-slate-500/20';
        case 'alcohol': return 'bg-orange-500/15 text-orange-400 border-orange-500/20';
        case 'height': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20';
        case 'education': return 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20';
        case 'job': return 'bg-teal-500/15 text-teal-400 border-teal-500/20';
        case 'pets': return 'bg-lime-500/15 text-lime-400 border-lime-500/20';
        case 'ideal_date': return 'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/20';
        default: return 'bg-white/10 text-slate-300 border-white/10';
    }
};

export default function OnboardingSummary({ userData, isSubmitting, onBack, onConfirm }: OnboardingSummaryProps) {
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const photos = userData.photos;
    const hasMultiplePhotos = photos.length > 1;

    const nextPhoto = () => setCurrentPhotoIndex(prev => (prev + 1) % photos.length);
    const prevPhoto = () => setCurrentPhotoIndex(prev => (prev - 1 + photos.length) % photos.length);

    return (
        <div className="absolute inset-0 bg-[#0f0f11] z-50 animate-in fade-in duration-500 flex flex-col overflow-hidden">
            {/* Фото-секция */}
            <div className="relative w-full shrink-0" style={{ height: '55%' }}>
                {photos[currentPhotoIndex] ? (
                    <Image
                        src={photos[currentPhotoIndex].preview}
                        className="w-full h-full object-cover"
                        alt="Profile"
                        fill
                        sizes="100vw"
                        priority
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#ff4b91]/20 to-[#ff9e4a]/20 flex items-center justify-center">
                        <User size={64} className="text-white/30" />
                    </div>
                )}

                {/* Градиент снизу */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f11] via-[#0f0f11]/40 to-transparent" />

                {/* Верхняя навигация */}
                <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-20">
                    <button
                        onClick={onBack}
                        className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white border border-white/10 active:scale-95 transition-transform"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm text-xs font-semibold text-white border border-white/10">
                        Превью профиля
                    </div>
                </div>

                {/* Навигация по фото */}
                {hasMultiplePhotos && (
                    <>
                        {/* Точки */}
                        <div className="absolute top-14 left-0 right-0 flex justify-center gap-1.5 z-20">
                            {photos.map((_, i) => (
                                <div
                                    key={i}
                                    className={`h-1 rounded-full transition-all duration-300 ${i === currentPhotoIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/40'}`}
                                />
                            ))}
                        </div>
                        {/* Стрелки */}
                        <button
                            onClick={prevPhoto}
                            onPointerDown={e => e.stopPropagation()}
                            className="absolute left-0 top-1/4 bottom-1/4 w-1/3 z-10"
                        />
                        <button
                            onClick={nextPhoto}
                            onPointerDown={e => e.stopPropagation()}
                            className="absolute right-0 top-1/4 bottom-1/4 w-1/3 z-10"
                        />
                    </>
                )}

                {/* Имя, возраст, город */}
                <div className="absolute bottom-6 left-0 right-0 px-5 z-20">
                    <h1 className="text-3xl font-bold text-white flex items-center gap-2 truncate">
                        {userData.name}, {userData.age}
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-r from-[#ff4b91] to-[#ff9e4a]">
                            <Check size={14} strokeWidth={3} className="text-white" />
                        </span>
                    </h1>
                    {userData.details.city && (
                        <div className="flex items-center gap-1.5 mt-1.5 text-white/70 text-sm">
                            <MapPin size={14} />
                            <span>{userData.details.city}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Контент */}
            <div className="flex-1 overflow-y-auto scrollbar-hide px-5 pt-4 pb-28">
                {/* Био */}
                {userData.bio && (
                    <div className="mb-5">
                        <div className="flex items-center gap-2 mb-2">
                            <MessageCircle size={14} className="text-[#ff4b91]" />
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">О себе</h3>
                        </div>
                        <p className="text-white/90 text-sm leading-relaxed">{userData.bio}</p>
                    </div>
                )}

                {/* Основная информация - структурированные поля */}
                <div className="mb-5">
                    <div className="flex items-center gap-2 mb-3">
                        <Flame size={14} className="text-[#ff4b91]" />
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Анкета</h3>
                    </div>

                    {/* Пол */}
                    <div className="flex flex-wrap gap-2 mb-3">
                        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-pink-500/15 text-pink-400 border border-pink-500/20">
                            <User size={16} className="shrink-0" />
                            <span>{userData.gender === 'male' ? 'Мужчина' : 'Женщина'}</span>
                        </div>
                    </div>

                    {/* Все поля из details - по секциям */}
                    <div className="space-y-3">
                        {Object.entries(DETAIL_LABELS).map(([key, label]) => {
                            const value = userData.details[key];
                            if (!value) return null;

                            // Для полей с запятыми (multiSelect) - показываем как отдельные чипы
                            const values = value.includes(', ') ? value.split(', ') : [value];

                            return (
                                <div key={key}>
                                    <div className="text-[11px] text-slate-600 uppercase tracking-wider mb-1.5 ml-1">{label}</div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {values.map((v, i) => (
                                            <div
                                                key={i}
                                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border ${getChipStyle(key)}`}
                                            >
                                                {getDetailIcon(key)}
                                                <span>{key === 'height' ? `${v} см` : v}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Интересы */}
                {userData.interests.length > 0 && (
                    <div className="mb-5">
                        <div className="flex items-center gap-2 mb-3">
                            <Sparkles size={14} className="text-[#ff9e4a]" />
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Интересы</h3>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {userData.interests.map((tag, i) => (
                                <span
                                    key={tag || i}
                                    className="px-3 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-[#ff4b91]/15 to-[#ff9e4a]/15 text-[#ff9e4a] border border-[#ff4b91]/20"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Фото-галерея (миниатюры) */}
                {photos.length > 1 && (
                    <div className="mb-5">
                        <div className="flex items-center gap-2 mb-3">
                            <Star size={14} className="text-[#ff4b91]" />
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Фото ({photos.length})</h3>
                        </div>
                        <div className="flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1">
                            {photos.map((photo, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentPhotoIndex(i)}
                                    className={`relative shrink-0 w-20 h-20 rounded-xl overflow-hidden snap-start border-2 transition-all ${i === currentPhotoIndex ? 'border-[#ff4b91] scale-105' : 'border-white/10 opacity-70'}`}
                                >
                                    <Image src={photo.preview} alt={`Photo ${i + 1}`} fill className="object-cover" sizes="80px" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Кнопки действий */}
            <div className="absolute bottom-0 left-0 right-0 z-30 px-5 pb-6 pt-4 bg-gradient-to-t from-[#0f0f11] via-[#0f0f11] to-transparent">
                <div className="flex items-center justify-center gap-5">
                    {/* Назад - редактировать */}
                    <button
                        onClick={onBack}
                        className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/70 active:scale-95 transition-all"
                    >
                        <X size={26} strokeWidth={2} />
                    </button>

                    {/* Подтвердить */}
                    <button
                        onClick={onConfirm}
                        disabled={isSubmitting}
                        className="flex-1 max-w-[220px] h-14 rounded-2xl bg-gradient-to-r from-[#ff4b91] to-[#ff9e4a] flex items-center justify-center gap-2 text-white font-bold text-base shadow-lg shadow-[#ff4b91]/25 active:scale-[0.97] transition-all disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                <span>Сохраняю...</span>
                            </>
                        ) : (
                            <>
                                <Check size={20} strokeWidth={3} />
                                <span>Создать профиль</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
