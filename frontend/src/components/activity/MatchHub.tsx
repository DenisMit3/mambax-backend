'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Heart, MessageCircle, Eye, Crown, Clock, Zap, Check, CheckCheck } from 'lucide-react';
import Image from 'next/image';

import { useTelegram } from '@/lib/telegram';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { GlassCard } from '@/components/ui/GlassCard';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface Match {
    id: string;
    user: {
        id: string;
        name: string;
        photo: string;
        age: number;
    };
    matchedAt: Date;
    isNew: boolean;
}

interface Chat {
    id: string;
    user: {
        id: string;
        name: string;
        photo: string;
        isOnline: boolean;
    };
    lastMessage: {
        text: string;
        timestamp: Date;
        isRead: boolean;
        isOwn: boolean;
    };
    unreadCount: number;
}

interface LikedUser {
    id: string;
    name: string;
    photo: string;
    age: number;
    likedAt: Date;
    canInstantMatch: boolean;
}

interface MatchHubProps {
    matches: Match[];
    chats: Chat[];
    likedUsers: LikedUser[];
    isPremium: boolean;
    onMatchClick: (matchId: string) => void;
    onChatClick: (chatId: string) => void;
    onInstantMatch: (userId: string) => void;
    onUpgradeToPremium: () => void;
}

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
    const prefersReducedMotion = useReducedMotion();
    const [activeTab, setActiveTab] = useState<'matches' | 'likes'>('matches');

    const handleTabChange = (tab: 'matches' | 'likes') => {
        setActiveTab(tab);
        hapticFeedback.light();
    };

    const formatTime = (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}д`;
        if (hours > 0) return `${hours}ч`;
        return 'сейчас';
    };

    const newMatchesCount = matches.filter(m => m.isNew).length;
    const totalLikesCount = likedUsers.length;

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
                    {[
                        {
                            id: 'matches',
                            label: 'Матчи',
                            icon: Heart,
                            count: newMatchesCount,
                            color: 'from-pink-500 to-red-500'
                        },
                        {
                            id: 'likes',
                            label: 'Лайки',
                            icon: Eye,
                            count: totalLikesCount,
                            color: 'from-purple-500 to-pink-500'
                        }
                    ].map((tab) => (
                        <motion.button
                            key={tab.id}
                            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-semibold transition-all duration-300 relative overflow-hidden ${activeTab === tab.id
                                ? `bg-gradient-to-r ${tab.color} text-white shadow-lg`
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                            onClick={() => handleTabChange(tab.id as 'matches' | 'likes')}
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
                            {/* New Matches Horizontal Scroll */}
                            {newMatchesCount > 0 && (
                                <div className="p-4">
                                    <motion.h3
                                        className="text-lg font-bold text-white mb-4 flex items-center"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                    >
                                        <Zap className="w-5 h-5 mr-2 text-orange-400" />
                                        Новые матчи
                                        <motion.div
                                            className="ml-2 w-2 h-2 bg-orange-400 rounded-full"
                                            animate={{ scale: [1, 1.5, 1] }}
                                            transition={{ duration: 1, repeat: Infinity }}
                                        />
                                    </motion.h3>

                                    <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-hide">
                                        {matches.filter(m => m.isNew).map((match, index) => (
                                            <motion.div
                                                key={match.id}
                                                className="flex-shrink-0"
                                                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                transition={{
                                                    delay: prefersReducedMotion ? 0 : index * 0.1,
                                                    type: 'spring',
                                                    stiffness: 300,
                                                    damping: 20
                                                }}
                                            >
                                                <GlassCard
                                                    className="w-24 h-32 p-3 cursor-pointer relative overflow-hidden"
                                                    onClick={() => onMatchClick(match.id)}
                                                    glow
                                                >
                                                    {/* Neon Pulse Border */}
                                                    <motion.div
                                                        className="absolute inset-0 rounded-3xl border-2 border-orange-400"
                                                        animate={{
                                                            boxShadow: [
                                                                '0 0 10px rgba(251, 146, 60, 0.5)',
                                                                '0 0 20px rgba(251, 146, 60, 0.8)',
                                                                '0 0 10px rgba(251, 146, 60, 0.5)'
                                                            ]
                                                        }}
                                                        transition={{ duration: 2, repeat: Infinity }}
                                                    />

                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent rounded-3xl" />
                                                    <Image
                                                        src={match.user.photo}
                                                        alt={match.user.name}
                                                        fill
                                                        className="object-cover rounded-2xl"
                                                        sizes="(max-width: 768px) 33vw, 120px"
                                                    />
                                                    <div className="absolute bottom-2 left-2 right-2 z-10">
                                                        <p className="text-white text-xs font-semibold truncate">
                                                            {match.user.name}
                                                        </p>
                                                        <p className="text-gray-300 text-xs">
                                                            {match.user.age}
                                                        </p>
                                                    </div>

                                                    {/* New Match Badge */}
                                                    <motion.div
                                                        className="absolute top-2 right-2 w-3 h-3 bg-orange-400 rounded-full z-10"
                                                        animate={{ scale: [1, 1.3, 1] }}
                                                        transition={{ duration: 1, repeat: Infinity }}
                                                    />
                                                </GlassCard>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Active Chats */}
                            <div className="flex-1 p-4 overflow-y-auto">
                                <motion.h3
                                    className="text-lg font-bold text-white mb-4 flex items-center"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    <MessageCircle className="w-5 h-5 mr-2 text-blue-400" />
                                    Активные чаты
                                </motion.h3>

                                <motion.div
                                    className="space-y-3"
                                    variants={{
                                        hidden: { opacity: 0 },
                                        show: {
                                            opacity: 1,
                                            transition: {
                                                staggerChildren: prefersReducedMotion ? 0 : 0.05
                                            }
                                        }
                                    }}
                                    initial="hidden"
                                    animate="show"
                                >
                                    {chats.map((chat) => (
                                        <motion.div
                                            key={chat.id}
                                            variants={{
                                                hidden: { opacity: 0, y: 20 },
                                                show: { opacity: 1, y: 0 }
                                            }}
                                        >
                                            <GlassCard
                                                className="p-4 cursor-pointer hover:bg-white/5 transition-all duration-300"
                                                onClick={() => onChatClick(chat.id)}
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <div className="relative">
                                                        <Image
                                                            src={chat.user.photo}
                                                            alt={chat.user.name}
                                                            width={48}
                                                            height={48}
                                                            className="rounded-full object-cover"
                                                        />
                                                        {chat.user.isOnline && (
                                                            <motion.div
                                                                className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-black"
                                                                animate={{ scale: [1, 1.2, 1] }}
                                                                transition={{ duration: 2, repeat: Infinity }}
                                                            />
                                                        )}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <h4 className="font-semibold text-white truncate">
                                                                {chat.user.name}
                                                            </h4>
                                                            <div className="flex items-center space-x-1">
                                                                <span className="text-xs text-gray-400">
                                                                    {formatTime(chat.lastMessage.timestamp)}
                                                                </span>
                                                                {chat.lastMessage.isOwn && (
                                                                    chat.lastMessage.isRead ? (
                                                                        <CheckCheck className="w-3 h-3 text-blue-400" />
                                                                    ) : (
                                                                        <Check className="w-3 h-3 text-gray-400" />
                                                                    )
                                                                )}
                                                            </div>
                                                        </div>
                                                        <p className="text-sm text-gray-400 truncate">
                                                            {chat.lastMessage.text}
                                                        </p>
                                                    </div>

                                                    {chat.unreadCount > 0 && (
                                                        <motion.div
                                                            className="w-6 h-6 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg"
                                                            initial={{ scale: 0 }}
                                                            animate={{ scale: 1 }}
                                                            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                                                        >
                                                            <span className="text-xs text-white font-semibold">
                                                                {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                                                            </span>
                                                        </motion.div>
                                                    )}
                                                </div>
                                            </GlassCard>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="likes"
                            className="h-full p-4 overflow-y-auto"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                        >
                            <motion.h3
                                className="text-lg font-bold text-white mb-4 flex items-center"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <Eye className="w-5 h-5 mr-2 text-purple-400" />
                                Кто поставил лайк
                            </motion.h3>

                            {!isPremium && totalLikesCount > 0 ? (
                                <motion.div
                                    className="mb-6"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                >
                                    <GlassCard className="p-8 text-center relative overflow-hidden">
                                        {/* Gold Glass Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 via-orange-500/20 to-red-500/20 backdrop-blur-sm" />
                                        <motion.div
                                            className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/10 to-transparent"
                                            animate={{ x: ['-100%', '100%'] }}
                                            transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                                        />

                                        <div className="relative z-10">
                                            <motion.div
                                                animate={{ rotate: [0, 10, -10, 0] }}
                                                transition={{ duration: 2, repeat: Infinity }}
                                            >
                                                <Crown className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                                            </motion.div>
                                            <h4 className="text-2xl font-bold text-white mb-2">
                                                {totalLikesCount} {totalLikesCount === 1 ? 'человек лайкнул' : 'людей лайкнули'} вас!
                                            </h4>
                                            <p className="text-gray-300 mb-6 leading-relaxed">
                                                Получите Premium, чтобы увидеть кто это и начать общение прямо сейчас
                                            </p>
                                            <AnimatedButton
                                                onClick={onUpgradeToPremium}
                                                className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-black font-bold px-8 py-3"
                                            >
                                                <Crown className="w-5 h-5 mr-2" />
                                                Разблокировать Premium
                                            </AnimatedButton>
                                        </div>
                                    </GlassCard>
                                </motion.div>
                            ) : null}

                            {/* Liked Users Grid */}
                            <motion.div
                                className="grid grid-cols-2 gap-4"
                                variants={{
                                    hidden: { opacity: 0 },
                                    show: {
                                        opacity: 1,
                                        transition: {
                                            staggerChildren: prefersReducedMotion ? 0 : 0.1
                                        }
                                    }
                                }}
                                initial="hidden"
                                animate="show"
                            >
                                {likedUsers.map((user) => (
                                    <motion.div
                                        key={user.id}
                                        variants={{
                                            hidden: { opacity: 0, scale: 0.8 },
                                            show: { opacity: 1, scale: 1 }
                                        }}
                                    >
                                        <GlassCard
                                            className={`aspect-[3/4] p-4 cursor-pointer relative overflow-hidden ${!isPremium ? 'blur-sm' : ''
                                                }`}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent rounded-3xl" />
                                            <Image
                                                src={user.photo}
                                                alt={isPremium ? user.name : 'Hidden'}
                                                fill
                                                className="object-cover rounded-2xl"
                                                sizes="(max-width: 768px) 50vw, 33vw"
                                            />

                                            <div className="absolute bottom-4 left-4 right-4 z-10">
                                                <p className="text-white font-semibold text-sm mb-1">
                                                    {isPremium ? `${user.name}, ${user.age}` : '???'}
                                                </p>
                                                <p className="text-gray-300 text-xs mb-3">
                                                    {formatTime(user.likedAt)} назад
                                                </p>

                                                {isPremium && user.canInstantMatch && (
                                                    <AnimatedButton
                                                        onClick={() => onInstantMatch(user.id)}
                                                        className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs py-2"
                                                        size="sm"
                                                    >
                                                        Instant Match
                                                    </AnimatedButton>
                                                )}
                                            </div>

                                            {/* Heart Icon */}
                                            <div className="absolute top-4 right-4 z-10">
                                                <motion.div
                                                    className="w-8 h-8 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg"
                                                    animate={{ scale: [1, 1.1, 1] }}
                                                    transition={{ duration: 2, repeat: Infinity }}
                                                >
                                                    <Heart className="w-4 h-4 text-white fill-white" />
                                                </motion.div>
                                            </div>
                                        </GlassCard>
                                    </motion.div>
                                ))}
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
