'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Heart, Eye } from 'lucide-react';

import { useTelegram } from '@/lib/telegram';
import { NewMatchesList } from './NewMatchesList';
import { ActiveChatsList } from './ActiveChatsList';
import { LikedUsersGrid } from './LikedUsersGrid';
import type { MatchHubProps } from './types';

export type { Match, Chat, LikedUser, MatchHubProps } from './types';

export const MatchHub = ({
    matches,
    chats,
    likedUsers,
    isPremium,
    onMatchClick,
    onChatClick,
    onInstantMatch,
    onUpgradeToPremium
}: MatchHubProps) => {
    const { hapticFeedback } = useTelegram();
    const [activeTab, setActiveTab] = useState<'matches' | 'likes'>('matches');

    const handleTabChange = (tab: 'matches' | 'likes') => {
        setActiveTab(tab);
        hapticFeedback.light();
    };

    const newMatchesCount = matches.filter(m => m.isNew).length;
    const totalLikesCount = likedUsers.length;

    const tabs = [
        { id: 'matches' as const, label: 'Матчи', icon: Heart, count: newMatchesCount, color: 'from-pink-500 to-red-500' },
        { id: 'likes' as const, label: 'Лайки', icon: Eye, count: totalLikesCount, color: 'from-purple-500 to-pink-500' }
    ];

    return (
        <div className="flex flex-col h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 max-w-[430px] mx-auto">
            {/* Header */}
            <motion.div
                className="p-6 border-b border-white/10"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold text-white">Активность</h1>
                    <motion.div
                        className="w-10 h-10 rounded-full bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center"
                        animate={{
                            boxShadow: [
                                '0 0 20px rgba(255, 59, 48, 0.4)',
                                '0 0 40px rgba(255, 59, 48, 0.6)',
                                '0 0 20px rgba(255, 59, 48, 0.4)'
                            ]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        <Heart className="w-5 h-5 text-white" />
                    </motion.div>
                </div>

                {/* Tab Selector */}
                <div className="flex bg-gray-800/50 rounded-2xl p-1 backdrop-blur-xl">
                    {tabs.map((tab) => (
                        <motion.button
                            key={tab.id}
                            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-semibold transition-all duration-300 relative overflow-hidden ${activeTab === tab.id
                                ? `bg-gradient-to-r ${tab.color} text-white shadow-lg`
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                            onClick={() => handleTabChange(tab.id)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            {activeTab === tab.id && (
                                <motion.div
                                    className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent"
                                    initial={{ x: '-100%' }}
                                    animate={{ x: '100%' }}
                                    transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                                />
                            )}
                            <tab.icon className="w-4 h-4" />
                            <span>{tab.label}</span>
                            {tab.count > 0 && (
                                <motion.div
                                    className="w-5 h-5 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-xs font-bold"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                                >
                                    {tab.count > 99 ? '99+' : tab.count}
                                </motion.div>
                            )}
                        </motion.button>
                    ))}
                </div>
            </motion.div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                <AnimatePresence mode="wait">
                    {activeTab === 'matches' ? (
                        <motion.div
                            key="matches"
                            className="h-full flex flex-col"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                        >
                            <NewMatchesList matches={matches} onMatchClick={onMatchClick} />
                            <ActiveChatsList chats={chats} onChatClick={onChatClick} />
                        </motion.div>
                    ) : (
                        <LikedUsersGrid
                            likedUsers={likedUsers}
                            isPremium={isPremium}
                            onInstantMatch={onInstantMatch}
                            onUpgradeToPremium={onUpgradeToPremium}
                        />
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
