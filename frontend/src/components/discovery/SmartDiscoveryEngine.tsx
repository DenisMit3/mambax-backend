'use client';

import React from 'react';
import { Grid, Layers, SlidersHorizontal } from 'lucide-react';
import { useSmartDiscovery } from './smart-discovery/useSmartDiscovery';
import { GridView } from './smart-discovery/GridView';
import { StackView } from './smart-discovery/StackView';
import { ExpandedProfile } from './smart-discovery/ExpandedProfile';
import type { SmartDiscoveryEngineProps } from './smart-discovery/types';

export type { SmartDiscoveryEngineProps } from './smart-discovery/types';
export type { User, DiscoveryFilters } from './smart-discovery/types';

export function SmartDiscoveryEngine({
    users,
    onSwipe,
    onStartChat,
    onFilterChange,
}: SmartDiscoveryEngineProps) {
    const discovery = useSmartDiscovery(users, onSwipe);

    if (!discovery.currentProfile) {
        return (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-black text-center z-10">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 animate-pulse border border-white/10">
                    <div className="w-10 h-10 border-2 border-white/20 rounded-full" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Никого нет рядом</h3>
                <p className="text-slate-500">Попробуйте изменить настройки поиска.</p>
            </div>
        );
    }

    return (
        <div className="absolute inset-0 bg-black overflow-hidden select-none">
            {/* Header */}
            <header className="absolute top-0 left-0 right-0 h-16 z-30 flex items-center justify-between px-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                <button
                    onClick={() => discovery.setViewMode(prev => prev === 'stack' ? 'grid' : 'stack')}
                    className="w-11 h-11 flex items-center justify-center text-white pointer-events-auto active:scale-95 transition-transform bg-white/10 backdrop-blur rounded-full"
                >
                    {discovery.viewMode === 'stack' ? <Grid size={18} /> : <Layers size={18} />}
                </button>
                <h1 className="text-xl font-bold text-white tracking-wide drop-shadow-md">
                    {discovery.viewMode === 'stack' ? 'Знакомства' : 'Сканер'}
                </h1>
                <button
                    onClick={() => onFilterChange({})}
                    className="w-11 h-11 flex items-center justify-center text-white pointer-events-auto active:scale-95 transition-transform"
                >
                    <SlidersHorizontal size={24} />
                </button>
            </header>

            {/* Content */}
            {discovery.viewMode === 'grid' ? (
                <GridView
                    users={discovery.activeUsers}
                    onSelectUser={(idx) => {
                        discovery.setCurrentIndex(idx);
                        discovery.setViewMode('stack');
                    }}
                />
            ) : (
                <>
                    <StackView
                        currentProfile={discovery.currentProfile}
                        nextProfile={discovery.nextProfile}
                        onStartChat={onStartChat}
                        onExpandProfile={discovery.setExpandedProfile}
                        swipe={discovery.swipe}
                        handleDragEnd={discovery.handleDragEnd}
                        x={discovery.x}
                        y={discovery.y}
                        rotate={discovery.rotate}
                        rotateX={discovery.rotateX}
                        rotateY={discovery.rotateY}
                        nextCardScale={discovery.nextCardScale}
                        nextCardOpacity={discovery.nextCardOpacity}
                        controls={discovery.controls}
                        likeOpacity={discovery.likeOpacity}
                        nopeOpacity={discovery.nopeOpacity}
                        likeScale={discovery.likeScale}
                        nopeScale={discovery.nopeScale}
                    />
                    <ExpandedProfile
                        profile={discovery.expandedProfile}
                        onClose={() => discovery.setExpandedProfile(null)}
                        onSwipe={discovery.swipe}
                    />
                </>
            )}
        </div>
    );
}
