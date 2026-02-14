'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Edit3, Check, ArrowLeft, Plus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { authService } from '@/services/api';
import { useHaptic } from '@/hooks/useHaptic';

// Максимум 3 ответа (как в Hinge)
const MAX_ANSWERS = 3;

interface Prompt {
    id: string;
    text: string;
}

export default function PromptsPage() {
    const router = useRouter();
    const haptic = useHaptic();

    const [prompts, setPrompts] = useState<Prompt[]>([]);
    const [myAnswers, setMyAnswers] = useState<Record<string, string>>({});
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [draft, setDraft] = useState('');
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    const answeredCount = Object.keys(myAnswers).length;

    // Загрузка данных
    useEffect(() => {
        (async () => {
            try {
                const [available, my] = await Promise.all([
                    authService.getAvailablePrompts(),
                    authService.getMyPrompts(),
                ]);
                setPrompts(available.prompts);
                setMyAnswers(my.prompts ?? {});
            } catch (e) {
                console.error('Ошибка загрузки промптов:', e);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // Раскрыть/свернуть карточку
    const toggle = useCallback((id: string) => {
        haptic.light();
        if (expandedId === id) {
            setExpandedId(null);
            setDraft('');
            return;
        }
        // Нельзя добавить больше MAX если ещё нет ответа
        if (!myAnswers[id] && answeredCount >= MAX_ANSWERS) return;
        setExpandedId(id);
        setDraft(myAnswers[id] ?? '');
    }, [expandedId, myAnswers, answeredCount, haptic]);

    // Сохранение ответа
    const save = useCallback(async () => {
        if (!expandedId || !draft.trim()) return;
        setSaving(true);
        haptic.medium();
        try {
            const res = await authService.savePromptAnswer(expandedId, draft.trim());
            if (res.status === 'ok') {
                setMyAnswers(res.prompts);
                haptic.success();
            }
        } catch (e) {
            console.error('Ошибка сохранения:', e);
            haptic.error();
        } finally {
            setSaving(false);
            setExpandedId(null);
            setDraft('');
        }
    }, [expandedId, draft, haptic]);

    // Удаление ответа — сохраняем пустую строку
    const remove = useCallback(async (id: string) => {
        haptic.medium();
        try {
            const res = await authService.savePromptAnswer(id, '');
            if (res.status === 'ok') setMyAnswers(res.prompts);
        } catch (e) {
            console.error('Ошибка удаления:', e);
        }
    }, [haptic]);

    // ─── Рендер ───

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full bg-black">
                <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black px-4 pt-4 pb-24">
            {/* Шапка */}
            <div className="flex items-center gap-3 mb-6">
                <button
                    onClick={() => { haptic.light(); router.back(); }}
                    className="p-2 rounded-xl bg-slate-950 text-slate-400 hover:text-white transition"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-lg font-bold text-white">Мои промпты</h1>
                    <p className="text-xs text-slate-500">
                        {answeredCount}/{MAX_ANSWERS} выбрано
                    </p>
                </div>
            </div>

            {/* Счётчик */}
            <div className="flex gap-1.5 mb-5">
                {Array.from({ length: MAX_ANSWERS }).map((_, i) => (
                    <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                            i < answeredCount ? 'bg-purple-500' : 'bg-slate-800'
                        }`}
                    />
                ))}
            </div>

            {/* Список промптов */}
            <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                    {prompts.map((p) => {
                        const answer = myAnswers[p.id];
                        const isExpanded = expandedId === p.id;
                        const hasAnswer = !!answer;
                        const canAdd = hasAnswer || answeredCount < MAX_ANSWERS;

                        return (
                            <motion.div
                                key={p.id}
                                layout
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -12 }}
                                className={`rounded-2xl border transition-colors ${
                                    isExpanded
                                        ? 'border-purple-500/40 bg-slate-950'
                                        : hasAnswer
                                            ? 'border-slate-800 bg-slate-950/80'
                                            : 'border-slate-800/50 bg-slate-950/40'
                                } ${!canAdd && !isExpanded ? 'opacity-40 pointer-events-none' : ''}`}
                            >
                                {/* Заголовок карточки */}
                                <button
                                    onClick={() => toggle(p.id)}
                                    className="w-full flex items-start gap-3 p-4 text-left"
                                >
                                    <div className={`mt-0.5 p-1.5 rounded-lg ${
                                        hasAnswer ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-800 text-slate-500'
                                    }`}>
                                        <MessageCircle size={16} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-white">{p.text}</p>
                                        {hasAnswer && !isExpanded && (
                                            <p className="text-xs text-slate-400 mt-1 line-clamp-2">{answer}</p>
                                        )}
                                    </div>

                                    {hasAnswer && !isExpanded ? (
                                        <Edit3 size={16} className="text-slate-500 mt-1 shrink-0" />
                                    ) : !isExpanded ? (
                                        <Plus size={16} className="text-slate-600 mt-1 shrink-0" />
                                    ) : null}
                                </button>

                                {/* Развёрнутая форма */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="px-4 pb-4 space-y-3">
                                                <textarea
                                                    value={draft}
                                                    onChange={(e) => setDraft(e.target.value)}
                                                    maxLength={300}
                                                    rows={3}
                                                    placeholder="Напиши свой ответ..."
                                                    autoFocus
                                                    className="w-full bg-black/60 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 resize-none focus:outline-none focus:border-purple-500/50 transition"
                                                />

                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] text-slate-600">
                                                        {draft.length}/300
                                                    </span>

                                                    <div className="flex gap-2">
                                                        {hasAnswer && (
                                                            <button
                                                                onClick={() => remove(p.id)}
                                                                className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 transition"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={save}
                                                            disabled={saving || !draft.trim()}
                                                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-medium disabled:opacity-40 hover:bg-purple-500 transition"
                                                        >
                                                            {saving ? (
                                                                <div className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                                                            ) : (
                                                                <Check size={14} />
                                                            )}
                                                            Сохранить
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
}
