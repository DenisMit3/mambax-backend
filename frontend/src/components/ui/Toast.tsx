'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ToastProps {
    message: string;
    type: 'success' | 'error';
    onClose: () => void;
    duration?: number;
}

export function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
    useEffect(() => {
        const timer = setTimeout(onClose, duration);
        return () => clearTimeout(timer);
    }, [onClose, duration]);

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                onClick={onClose}
                className={`fixed bottom-20 left-4 right-4 z-[200] px-4 py-3 rounded-xl text-white text-sm font-semibold text-center backdrop-blur-md cursor-pointer ${
                    type === 'error' ? 'bg-red-500/95' : 'bg-emerald-500/95'
                }`}
            >
                {message}
            </motion.div>
        </AnimatePresence>
    );
}
