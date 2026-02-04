'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, ShieldCheck, SlidersHorizontal } from 'lucide-react';

import { MetricsDashboard } from './dashboard/MetricsDashboard';
import { ModerationTerminal } from './dashboard/ModerationTerminal';
import { AlgorithmTuner } from './dashboard/AlgorithmTuner';
import { cn } from '@/lib/utils';
import { useTelegram } from '@/lib/telegram';

type TabId = 'metrics' | 'moderation' | 'algorithm';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'metrics', label: 'Overview', icon: LayoutDashboard },
    { id: 'moderation', label: 'Safety Queue', icon: ShieldCheck },
    { id: 'algorithm', label: 'Engine', icon: SlidersHorizontal },
];

export const AdminVisionTerminal = () => {
    const { hapticFeedback } = useTelegram();
    const [activeTab, setActiveTab] = useState<TabId>('metrics');

    const handleTabChange = (id: TabId) => {
        if (activeTab !== id) {
            hapticFeedback.impactOccurred('light');
            setActiveTab(id);
        }
    };

    return (
        <div className="w-full max-w-7xl mx-auto space-y-6">
            {/* Header / Tabs */}
            <div className="flex p-1 bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-700/30 overflow-x-auto">
                {TABS.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => handleTabChange(id)}
                        className={cn(
                            "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all whitespace-nowrap",
                            activeTab === id
                                ? "bg-slate-700/60 text-white shadow-sm"
                                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/20"
                        )}
                    >
                        <Icon size={18} className={cn(activeTab === id ? "text-blue-400" : "text-slate-500")} />
                        {label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="min-h-[400px]">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                    >
                        {activeTab === 'metrics' && <MetricsDashboard />}
                        {activeTab === 'moderation' && <ModerationTerminal />}
                        {activeTab === 'algorithm' && <AlgorithmTuner />}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};
