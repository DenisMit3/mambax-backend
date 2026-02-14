'use client';

import { motion } from 'framer-motion';
import { FALLBACK_AVATAR } from '@/lib/constants';
import type { ChatParticipant } from './ChatTypes';

interface ChatTypingIndicatorProps {
    otherParticipant: ChatParticipant | undefined;
}

// Индикатор набора текста: три анимированные точки
export const ChatTypingIndicator = ({ otherParticipant }: ChatTypingIndicatorProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex items-center space-x-2"
        >
            <img
                src={otherParticipant?.photo || FALLBACK_AVATAR}
                alt={otherParticipant?.name || 'Изображение'}
                loading="lazy"
                className="w-8 h-8 rounded-full object-cover"
            />
            <div className="bg-gray-800 rounded-2xl px-4 py-2">
                <div className="flex space-x-1">
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            className="w-2 h-2 bg-gray-400 rounded-full"
                            animate={{
                                scale: [1, 1.5, 1],
                                opacity: [0.5, 1, 0.5]
                            }}
                            transition={{
                                duration: 1,
                                repeat: Infinity,
                                delay: i * 0.2
                            }}
                        />
                    ))}
                </div>
            </div>
        </motion.div>
    );
};
