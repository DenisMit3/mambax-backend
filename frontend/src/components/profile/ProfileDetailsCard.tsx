'use client';

import { motion } from 'framer-motion';
import {
    Briefcase, GraduationCap, Ruler, Star as ZodiacIcon,
    Brain, Heart, Dog, Coffee, Baby, Cigarette, Wine,
    Target, Sparkles, MapPin
} from 'lucide-react';

interface ProfileDetailsCardProps {
    profile: Record<string, unknown>;
}

interface DetailItem {
    icon: React.ElementType;
    label: string;
    value: string | number | undefined | null;
    color: string;
}

export function ProfileDetailsCard({ profile }: ProfileDetailsCardProps) {
    const items: DetailItem[] = [
        { icon: MapPin, label: 'Город', value: profile.city as string, color: 'text-blue-400' },
        { icon: Ruler, label: 'Рост', value: profile.height ? `${profile.height} см` : null, color: 'text-green-400' },
        { icon: Briefcase, label: 'Работа', value: profile.job as string, color: 'text-amber-400' },
        { icon: GraduationCap, label: 'Образование', value: profile.education as string, color: 'text-purple-400' },
        { icon: Target, label: 'Ищу', value: formatLookingFor(profile.looking_for as string), color: 'text-pink-400' },
        { icon: ZodiacIcon, label: 'Знак зодиака', value: formatZodiac(profile.zodiac as string), color: 'text-yellow-400' },
        { icon: Brain, label: 'Тип личности', value: profile.personality_type as string, color: 'text-cyan-400' },
        { icon: Heart, label: 'Язык любви', value: formatLoveLang(profile.love_language as string), color: 'text-rose-400' },
        { icon: Dog, label: 'Питомцы', value: formatPets(profile.pets as string), color: 'text-orange-400' },
        { icon: Coffee, label: 'Идеальное свидание', value: profile.ideal_date as string, color: 'text-teal-400' },
        { icon: Baby, label: 'Дети', value: formatChildren(profile.children as string), color: 'text-indigo-400' },
        { icon: Cigarette, label: 'Курение', value: formatSmoking(profile.smoking as string), color: 'text-slate-400' },
        { icon: Wine, label: 'Алкоголь', value: formatDrinking(profile.drinking as string), color: 'text-violet-400' },
        { icon: Sparkles, label: 'Намерение', value: formatIntent(profile.intent as string), color: 'text-fuchsia-400' },
    ].filter(item => item.value);

    if (items.length === 0) return null;

    return (
        <div className="mb-6">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-1 mb-3">О вас</p>
            <div className="grid grid-cols-2 gap-2">
                {items.map((item, i) => {
                    const Icon = item.icon;
                    return (
                        <motion.div
                            key={item.label}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="p-3 rounded-xl bg-white/5 border border-white/5"
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <Icon size={14} className={item.color} />
                                <span className="text-[10px] text-slate-500 font-medium">{item.label}</span>
                            </div>
                            <p className="text-sm text-white font-medium truncate">{item.value}</p>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}

function formatLookingFor(v?: string): string | null {
    if (!v) return null;
    const map: Record<string, string> = {
        relationship: 'Отношения', friendship: 'Дружба', casual: 'Общение',
        marriage: 'Брак', networking: 'Нетворкинг',
    };
    return map[v] || v;
}

function formatZodiac(v?: string): string | null {
    if (!v) return null;
    const map: Record<string, string> = {
        aries: '♈ Овен', taurus: '♉ Телец', gemini: '♊ Близнецы',
        cancer: '♋ Рак', leo: '♌ Лев', virgo: '♍ Дева',
        libra: '♎ Весы', scorpio: '♏ Скорпион', sagittarius: '♐ Стрелец',
        capricorn: '♑ Козерог', aquarius: '♒ Водолей', pisces: '♓ Рыбы',
    };
    return map[v] || v;
}

function formatLoveLang(v?: string): string | null {
    if (!v) return null;
    const map: Record<string, string> = {
        words: 'Слова', touch: 'Прикосновения', gifts: 'Подарки',
        time: 'Время вместе', acts: 'Забота',
    };
    return map[v] || v;
}

function formatPets(v?: string): string | null {
    if (!v) return null;
    const map: Record<string, string> = {
        dog: '🐕 Собака', cat: '🐈 Кошка', both: '🐕🐈 Оба',
        none: 'Нет', want: 'Хочу завести', other: 'Другие',
    };
    return map[v] || v;
}

function formatChildren(v?: string): string | null {
    if (!v) return null;
    const map: Record<string, string> = {
        have: 'Есть дети', want: 'Хочу детей', dont_want: 'Не хочу',
        maybe: 'Может быть', have_want_more: 'Есть, хочу ещё',
    };
    return map[v] || v;
}

function formatSmoking(v?: string): string | null {
    if (!v) return null;
    const map: Record<string, string> = {
        never: 'Не курю', sometimes: 'Иногда', regularly: 'Курю',
        trying_to_quit: 'Бросаю',
    };
    return map[v] || v;
}

function formatDrinking(v?: string): string | null {
    if (!v) return null;
    const map: Record<string, string> = {
        never: 'Не пью', socially: 'В компании', sometimes: 'Иногда',
        regularly: 'Регулярно',
    };
    return map[v] || v;
}

function formatIntent(v?: string): string | null {
    if (!v) return null;
    const map: Record<string, string> = {
        serious: 'Серьёзные отношения', casual: 'Лёгкое общение',
        friends: 'Дружба', unsure: 'Пока не знаю',
    };
    return map[v] || v;
}
