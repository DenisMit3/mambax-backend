'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ToggleSwitchProps {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    description?: string;
}

export const ToggleSwitch = ({ label, checked, onChange, description }: ToggleSwitchProps) => {
    return (
        <div className="flex items-center justify-between py-3">
            <div className="flex flex-col">
                <span className="text-white font-medium">{label}</span>
                {description && <span className="text-xs text-gray-400">{description}</span>}
            </div>
            <motion.button
                className={cn(
                    "w-12 h-6 rounded-full relative transition-colors duration-300",
                    checked ? "bg-green-500" : "bg-gray-600"
                )}
                onClick={() => onChange(!checked)}
                whileTap={{ scale: 0.95 }}
                type="button"
            >
                <motion.div
                    className="w-5 h-5 bg-white rounded-full absolute top-0.5"
                    animate={{ x: checked ? 26 : 2 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
            </motion.button>
        </div>
    );
};
