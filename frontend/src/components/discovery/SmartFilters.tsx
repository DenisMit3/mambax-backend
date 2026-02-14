"use client";

import { useState, useEffect } from "react";
import { Brain, Sparkles, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { authService } from "@/services/api";
import { useHaptic } from "@/hooks/useHaptic";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface SmartFiltersData {
    age_range?: [number, number];
    interests?: string[];
    education?: string | null;
}

interface SmartFiltersProps {
    onApply?: (filters: SmartFiltersData) => void;
}

export function SmartFilters({ onApply }: SmartFiltersProps) {
    const haptic = useHaptic();
    const prefersReducedMotion = useReducedMotion();
    const [filters, setFilters] = useState<SmartFiltersData | null>(null);
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [applied, setApplied] = useState(false);

    useEffect(() => {
        setLoading(true);
        authService.getSmartFilters()
            .then((data) => {
                if (data && (data.age_range || data.interests?.length)) {
                    setFilters(data);
                }
            })
            .catch((e) => console.warn('Operation failed:', e))
            .finally(() => setLoading(false));
    }, []);

    if (loading || !filters) return null;

    const hasFilters = (filters.age_range && filters.age_range.length === 2) ||
        (filters.interests && filters.interests.length > 0) ||
        filters.education;

    if (!hasFilters) return null;

    const handleApply = () => {
        haptic.medium();
        setApplied(true);
        onApply?.(filters);
    };

    const handleDismiss = () => {
        haptic.light();
        setFilters(null);
    };

    return (
        <AnimatePresence>
            {filters && (
                <motion.div
                    initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
                    animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                    exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
                    className="mx-4 mb-2"
                >
                    <div className="bg-slate-900/80 backdrop-blur-xl border border-purple-500/20 rounded-2xl overflow-hidden">
                        {/* Header */}
                        <button
                            onClick={() => { setExpanded(!expanded); haptic.light(); }}
                            className="w-full flex items-center justify-between p-3 px-4"
                        >
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                    <Brain size={14} className="text-purple-400" />
                                </div>
                                <span className="text-xs font-bold text-white uppercase tracking-wider">
                                    AI Smart Filters
                                </span>
                                <Sparkles size={12} className="text-purple-400" />
                            </div>
                            <div className="flex items-center gap-2">
                                {applied && (
                                    <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">
                                        Applied
                                    </span>
                                )}
                                <motion.div
                                    animate={{ rotate: expanded ? 180 : 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="text-slate-500"
                                >
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                        <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                    </svg>
                                </motion.div>
                            </div>
                        </button>

                        {/* Expandable Content */}
                        <AnimatePresence>
                            {expanded && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
                                    className="overflow-hidden"
                                >
                                    <div className="px-4 pb-4 space-y-3">
                                        <p className="text-[10px] text-slate-500 font-medium">
                                            Based on your like history, we suggest:
                                        </p>

                                        {/* Age Range */}
                                        {filters.age_range && filters.age_range.length === 2 && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest w-16">Age</span>
                                                <span className="text-sm font-bold text-white">
                                                    {filters.age_range[0]} – {filters.age_range[1]}
                                                </span>
                                            </div>
                                        )}

                                        {/* Interests */}
                                        {filters.interests && filters.interests.length > 0 && (
                                            <div>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1.5">
                                                    Интересы
                                                </span>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {filters.interests.map((interest) => (
                                                        <span
                                                            key={interest}
                                                            className="px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[10px] font-bold"
                                                        >
                                                            {interest}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Education */}
                                        {filters.education && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest w-16">Edu</span>
                                                <span className="text-sm font-bold text-white">{filters.education}</span>
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="flex gap-2 pt-1">
                                            <button
                                                onClick={handleApply}
                                                disabled={applied}
                                                className="flex-1 py-2.5 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 hover:bg-purple-500/30 transition-colors disabled:opacity-50"
                                            >
                                                {applied ? <Check size={12} /> : <Sparkles size={12} />}
                                                {applied ? "Applied" : "Apply Filters"}
                                            </button>
                                            <button
                                                onClick={handleDismiss}
                                                className="py-2.5 px-4 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-500 text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
