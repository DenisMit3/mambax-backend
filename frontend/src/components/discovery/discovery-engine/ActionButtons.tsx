'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Heart, X, Star, RotateCcw } from 'lucide-react';

interface ActionButtonsProps {
    onPass: () => void;
    onLike: () => void;
    onSuperLike: () => void;
    onUndo: () => void;
    superLikesLeft: number;
    undoEnabled: boolean;
    undoPending: boolean;
}

export function ActionButtons({
    onPass,
    onLike,
    onSuperLike,
    onUndo,
    superLikesLeft,
    undoEnabled,
    undoPending,
}: ActionButtonsProps) {
    return (
        <motion.div
            className="flex items-center justify-center space-x-6 p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
        >
            {/* Undo */}
            <motion.button
                aria-label="Undo"
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg ${undoEnabled
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                    : 'bg-white/20 opacity-50'
                    }`}
                whileHover={undoEnabled ? { scale: 1.1 } : {}}
                whileTap={undoEnabled ? { scale: 0.9 } : {}}
                onClick={onUndo}
                disabled={!undoEnabled || undoPending}
            >
                <RotateCcw className="w-5 h-5 text-white" />
            </motion.button>

            {/* Pass */}
            <motion.button
                aria-label="Pass"
                className="w-14 h-14 rounded-full bg-gradient-to-r from-white/20 to-white/15 flex items-center justify-center shadow-lg"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onPass}
            >
                <X className="w-6 h-6 text-white" />
            </motion.button>

            {/* Super Like */}
            <motion.button
                aria-label="Super Like"
                data-onboarding="superlike-button"
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg ${superLikesLeft > 0
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500'
                    : 'bg-white/20 opacity-50'
                    }`}
                whileHover={superLikesLeft > 0 ? { scale: 1.1 } : {}}
                whileTap={superLikesLeft > 0 ? { scale: 0.9 } : {}}
                onClick={onSuperLike}
                disabled={superLikesLeft === 0}
            >
                <Star className="w-5 h-5 text-white" />
            </motion.button>

            {/* Like */}
            <motion.button
                aria-label="Like"
                data-onboarding="like-button"
                className="w-14 h-14 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center shadow-lg"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onLike}
            >
                <Heart className="w-6 h-6 text-white" />
            </motion.button>
        </motion.div>
    );
}
