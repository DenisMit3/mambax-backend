'use client';

import { motion } from 'framer-motion';

// Обёртка секции с анимацией перехода
export function SectionWrapper({ children }: { children: React.ReactNode }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
        >
            {children}
        </motion.div>
    );
}

// Индикатор загрузки
export function Loader() {
    return (
        <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
        </div>
    );
}
