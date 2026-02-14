'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { FLOW_STEPS } from './onboardingTypes';

interface OnboardingProgressProps {
    stepIndex: number;
}

// --- Хедер с прогресс-баром ---
export default function OnboardingProgress({ stepIndex }: OnboardingProgressProps) {
    return (
        <div className="px-4 py-3 border-b border-white/10 bg-black/50 backdrop-blur shrink-0 flex items-center justify-between z-10">
            <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#ff4b91] to-[#ff9e4a] flex items-center justify-center animate-pulse">
                    <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="font-bold text-sm tracking-tight text-white">MambaX AI</div>
            </div>
            <div className="flex flex-col items-end">
                <span className="text-[10px] text-gray-500 mb-1 font-mono">{stepIndex + 1}/{FLOW_STEPS.length}</span>
                <div className="h-1 w-16 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-[#ff4b91]"
                        initial={{ width: 0 }}
                        animate={{ width: `${((stepIndex + 1) / FLOW_STEPS.length) * 100}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
