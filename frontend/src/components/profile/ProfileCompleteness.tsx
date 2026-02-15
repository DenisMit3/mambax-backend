'use client';

import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface ProfileCompletenessProps {
    profile: Record<string, unknown>;
}

const FIELDS = [
    { key: 'photos', label: 'Фото', check: (p: Record<string, unknown>) => Array.isArray(p.photos) && p.photos.length >= 2 },
    { key: 'bio', label: 'О себе', check: (p: Record<string, unknown>) => typeof p.bio === 'string' && p.bio.length > 10 },
    { key: 'city', label: 'Город', check: (p: Record<string, unknown>) => !!p.city },
    { key: 'interests', label: 'Интересы', check: (p: Record<string, unknown>) => Array.isArray(p.interests) && p.interests.length >= 3 },
    { key: 'height', label: 'Рост', check: (p: Record<string, unknown>) => !!p.height },
    { key: 'job', label: 'Работа', check: (p: Record<string, unknown>) => !!p.job },
    { key: 'education', label: 'Образование', check: (p: Record<string, unknown>) => !!p.education },
    { key: 'looking_for', label: 'Цель знакомства', check: (p: Record<string, unknown>) => !!p.looking_for },
    { key: 'zodiac', label: 'Знак зодиака', check: (p: Record<string, unknown>) => !!p.zodiac },
    { key: 'personality_type', label: 'Тип личности', check: (p: Record<string, unknown>) => !!p.personality_type },
];

export function ProfileCompleteness({ profile }: ProfileCompletenessProps) {
    const completed = FIELDS.filter(f => f.check(profile));
    const percentage = Math.round((completed.length / FIELDS.length) * 100);
    const missing = FIELDS.filter(f => !f.check(profile));

    if (percentage === 100) return null;

    return (
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20">
            <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-white">Заполненность профиля</span>
                <span className="text-sm font-bold text-blue-400">{percentage}%</span>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-3">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                />
            </div>

            {/* Missing fields */}
            {missing.length > 0 && (
                <div className="space-y-1.5">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Добавьте для лучших результатов:</p>
                    <div className="flex flex-wrap gap-1.5">
                        {missing.slice(0, 4).map(f => (
                            <span key={f.key} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 text-xs text-slate-400">
                                <AlertCircle size={10} className="text-amber-400" />
                                {f.label}
                            </span>
                        ))}
                        {missing.length > 4 && (
                            <span className="px-2 py-1 rounded-lg bg-white/5 text-xs text-slate-500">
                                +{missing.length - 4}
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
