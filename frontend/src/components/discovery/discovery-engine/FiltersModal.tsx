'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useTelegram } from '@/lib/telegram';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { DiscoveryFilters } from './types';

interface FiltersModalProps {
    filters: DiscoveryFilters;
    onFiltersChange: (filters: Partial<DiscoveryFilters>) => void;
    onClose: () => void;
    isPremium: boolean;
}

export const FiltersModal = ({ filters, onFiltersChange, onClose, isPremium }: FiltersModalProps) => {
    const { hapticFeedback } = useTelegram();

    return (
        <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className="w-full max-w-md bg-gray-900 rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">Фильтры поиска</h2>
                    <button
                        onClick={onClose}
                        className="w-11 h-11 rounded-full bg-gray-700 flex items-center justify-center"
                    >
                        <X className="w-5 h-5 text-white" />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Age Range */}
                    <div>
                        <label className="block text-white font-semibold mb-3">
                            Возраст: {filters.ageRange[0]} - {filters.ageRange[1]}
                        </label>
                        <div className="flex items-center space-x-4">
                            <input
                                type="range"
                                min="18"
                                max="65"
                                value={filters.ageRange[0]}
                                onChange={(e) => {
                                    const newMin = parseInt(e.target.value);
                                    onFiltersChange({
                                        ageRange: [newMin, Math.max(newMin, filters.ageRange[1])]
                                    });
                                    hapticFeedback.light();
                                }}
                                className="flex-1"
                            />
                            <input
                                type="range"
                                min="18"
                                max="65"
                                value={filters.ageRange[1]}
                                onChange={(e) => {
                                    const newMax = parseInt(e.target.value);
                                    onFiltersChange({
                                        ageRange: [Math.min(filters.ageRange[0], newMax), newMax]
                                    });
                                    hapticFeedback.light();
                                }}
                                className="flex-1"
                            />
                        </div>
                    </div>

                    {/* Distance */}
                    <div>
                        <label className="block text-white font-semibold mb-3">
                            Расстояние: {filters.maxDistance} км
                        </label>
                        <input
                            type="range"
                            min="1"
                            max="100"
                            value={filters.maxDistance}
                            onChange={(e) => {
                                onFiltersChange({ maxDistance: parseInt(e.target.value) });
                                hapticFeedback.light();
                            }}
                            className="w-full"
                        />
                    </div>

                    {/* Premium Filters */}
                    {isPremium && (
                        <>
                            <div>
                                <label className="block text-white font-semibold mb-3">
                                    Минимальная совместимость: {filters.minCompatibility}%
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={filters.minCompatibility}
                                    onChange={(e) => {
                                        onFiltersChange({ minCompatibility: parseInt(e.target.value) });
                                        hapticFeedback.light();
                                    }}
                                    className="w-full"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="flex items-center space-x-3">
                                    <input
                                        type="checkbox"
                                        checked={filters.verifiedOnly}
                                        onChange={(e) => {
                                            onFiltersChange({ verifiedOnly: e.target.checked });
                                            hapticFeedback.light();
                                        }}
                                        className="w-5 h-5 rounded"
                                    />
                                    <span className="text-white">Только верифицированные</span>
                                </label>

                                <label className="flex items-center space-x-3">
                                    <input
                                        type="checkbox"
                                        checked={filters.onlineOnly}
                                        onChange={(e) => {
                                            onFiltersChange({ onlineOnly: e.target.checked });
                                            hapticFeedback.light();
                                        }}
                                        className="w-5 h-5 rounded"
                                    />
                                    <span className="text-white">Только онлайн</span>
                                </label>
                            </div>
                        </>
                    )}
                </div>

                <div className="mt-8">
                    <AnimatedButton
                        variant="primary"
                        className="w-full"
                        onClick={onClose}
                    >
                        Применить фильтры
                    </AnimatedButton>
                </div>
            </motion.div>
        </motion.div>
    );
};
