'use client';

import React from 'react';
import { Send, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FLOW_STEPS, type FlowStep } from './onboardingTypes';

interface OnboardingInputBarProps {
    stepIndex: number;
    currentStepConfig: FlowStep;
    isTextInputAllowed: boolean;
    isNumberInput: boolean;
    isTyping: boolean;
    inputValue: string;
    setInputValue: (val: string) => void;
    tempSelectedOptions: string[];
    handleUserResponse: (text: string) => void;
    handleMultiSelectConfirm: () => void;
}

// --- Нижняя панель ввода + кнопка «Готово» для мультиселекта ---
export default function OnboardingInputBar({
    stepIndex,
    currentStepConfig,
    isTextInputAllowed,
    isNumberInput,
    isTyping,
    inputValue,
    setInputValue,
    tempSelectedOptions,
    handleUserResponse,
    handleMultiSelectConfirm,
}: OnboardingInputBarProps) {
    return (
        <>
            {/* Кнопка подтверждения мультиселекта */}
            <AnimatePresence>
                {tempSelectedOptions.length > 0 && currentStepConfig?.multiSelect && (
                    <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="absolute bottom-[84px] right-4 z-20">
                        <button onClick={handleMultiSelectConfirm} className="px-6 py-3 bg-white text-black rounded-full text-sm font-bold flex items-center space-x-2 shadow-[0_0_20px_rgba(255,255,255,0.4)] hover:scale-105 active:scale-95 transition-all">
                            <span>Готово ({tempSelectedOptions.length})</span> <ArrowRight className="w-4 h-4" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Поле ввода */}
            <div className={`p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-black/80 backdrop-blur border-t border-white/10 transition-all duration-300 ${FLOW_STEPS[stepIndex]?.type === 'photo_upload' ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}>
                <form onSubmit={(e) => { e.preventDefault(); if (isTextInputAllowed && inputValue.trim() && !isTyping) handleUserResponse(inputValue); }} className="flex items-center space-x-3">
                    <div className="flex-1 relative">
                        <input
                            type={isNumberInput ? "number" : "text"}
                            inputMode={isNumberInput ? "numeric" : "text"}
                            disabled={!isTextInputAllowed || isTyping}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder={isTextInputAllowed ? (isNumberInput ? "Введите число..." : "Напиши ответ...") : "Выберите вариант выше..."}
                            onFocus={(e) => {
                                setTimeout(() => (e.target as HTMLInputElement).scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
                            }}
                            className={`w-full border-none rounded-2xl px-5 py-3.5 text-[16px] text-white focus:ring-1 focus:ring-[#ff4b91] transition-all shadow-inner [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${isTextInputAllowed ? 'bg-[#1c1c1e] placeholder-gray-500' : 'bg-[#151517] text-slate-500 placeholder-gray-700 cursor-not-allowed'}`}
                        />
                    </div>
                    <button type="submit" disabled={!isTextInputAllowed || !inputValue.trim() || isTyping} className={`p-3.5 rounded-full shadow-lg transition-all ${isTextInputAllowed && inputValue.trim() ? 'bg-[#ff4b91] text-white' : 'bg-white/5 text-slate-500 cursor-not-allowed'}`}>
                        <Send className="w-5 h-5" />
                    </button>
                </form>
            </div>
        </>
    );
}
