'use client';

import { motion } from 'framer-motion';
import { MessageCircle, Check, CheckCheck } from 'lucide-react';
import Image from 'next/image';
import { GlassCard } from '@/components/ui/GlassCard';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { formatTime } from './utils';
import type { Chat } from './types';

interface ActiveChatsListProps {
    chats: Chat[];
    onChatClick: (chatId: string) => void;
}

export function ActiveChatsList({ chats, onChatClick }: ActiveChatsListProps) {
    const prefersReducedMotion = useReducedMotion();

    return (
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
                                        unoptimized
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
    );
}
