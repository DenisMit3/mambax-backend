'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb } from 'lucide-react';

interface ConversationPromptsModalProps {
    isOpen: boolean;
    onClose: () => void;
    prompts: string[];
    loading: boolean;
    onSelectPrompt: (text: string) => void;
}

// Модалка подсказок для возобновления затихшего разговора
export const ConversationPromptsModal = ({
    isOpen,
    onClose,
    prompts,
    loading,
    onSelectPrompt,
}: ConversationPromptsModalProps) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        className="w-full max-w-lg bg-gray-900 rounded-t-3xl p-6 border-t border-white/10"
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-12 h-1 bg-gray-600 rounded-full mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                            <Lightbulb className="w-5 h-5 text-amber-400" />
                            Возобновить разговор
                        </h3>
                        <p className="text-sm text-gray-400 mb-4">
                            Разговор затих? Вот несколько идей, чтобы его оживить:
                        </p>

                        {loading ? (
                            <div className="flex justify-center py-8">
                                <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : prompts.length > 0 ? (
                            <div className="space-y-3">
                                {prompts.map((prompt, index) => (
                                    <motion.button
                                        key={prompt || index}
                                        className="w-full p-4 bg-gray-800 hover:bg-gray-700 rounded-xl text-left text-white transition-colors"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        onClick={() => onSelectPrompt(prompt)}
                                    >
                                        {prompt}
                                    </motion.button>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-gray-500 py-4">
                                Не удалось загрузить подсказки
                            </p>
                        )}

                        <button
                            className="w-full mt-4 py-3 text-gray-400 hover:text-white transition-colors"
                            onClick={onClose}
                        >
                            Закрыть
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
