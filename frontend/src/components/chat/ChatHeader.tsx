'use client';

import { motion } from 'framer-motion';
import { Phone, Video, MoreVertical, Lightbulb } from 'lucide-react';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { FALLBACK_AVATAR } from '@/lib/constants';
import type { ChatParticipant } from './ChatTypes';

interface ChatHeaderProps {
    otherParticipant: ChatParticipant | undefined;
    isPremium: boolean;
    hasMessages: boolean;
    isConversationStalled: boolean;
    onCall: (type: 'voice' | 'video') => void;
    onOpenIcebreakers: () => void;
    onOpenConversationPrompts: () => void;
    formatTime: (date: Date) => string;
}

// Шапка чата: аватар, статус, кнопки звонков и подсказок
export const ChatHeader = ({
    otherParticipant,
    isPremium,
    hasMessages,
    isConversationStalled,
    onCall,
    onOpenIcebreakers,
    onOpenConversationPrompts,
    formatTime,
}: ChatHeaderProps) => {
    return (
        <motion.div
            className="flex items-center justify-between p-4 border-b border-white/10 bg-black/20 backdrop-blur-sm"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <div className="flex items-center space-x-3">
                <div className="relative">
                    <img
                        src={otherParticipant?.photo || FALLBACK_AVATAR}
                        alt={otherParticipant?.name}
                        loading="lazy"
                        className="w-10 h-10 rounded-full object-cover"
                    />
                    {otherParticipant?.isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-black" />
                    )}
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-white">
                        {otherParticipant?.name}
                    </h2>
                    <p className="text-xs text-gray-400">
                        {otherParticipant?.isOnline
                            ? 'В сети'
                            : otherParticipant?.lastSeen
                                ? `Был(а) ${formatTime(otherParticipant.lastSeen)}`
                                : 'Не в сети'
                        }
                    </p>
                </div>
            </div>

            <div className="flex items-center space-x-2">
                {/* Кнопка icebreakers для новых чатов (нет сообщений) */}
                {!hasMessages && (
                    <AnimatedButton
                        variant="ghost"
                        size="sm"
                        onClick={onOpenIcebreakers}
                        title="Идеи для разговора"
                    >
                        <Lightbulb className="w-4 h-4 text-amber-400" />
                    </AnimatedButton>
                )}
                {/* Кнопка подсказок для затихших разговоров (>24ч) */}
                {isConversationStalled && hasMessages && (
                    <AnimatedButton
                        variant="ghost"
                        size="sm"
                        onClick={onOpenConversationPrompts}
                        title="Возобновить разговор"
                    >
                        <Lightbulb className="w-4 h-4 text-amber-400" />
                    </AnimatedButton>
                )}
                {isPremium && (
                    <>
                        <AnimatedButton
                            variant="ghost"
                            size="sm"
                            onClick={() => onCall('voice')}
                        >
                            <Phone className="w-4 h-4" />
                        </AnimatedButton>
                        <AnimatedButton
                            variant="ghost"
                            size="sm"
                            onClick={() => onCall('video')}
                        >
                            <Video className="w-4 h-4" />
                        </AnimatedButton>
                    </>
                )}
                <AnimatedButton variant="ghost" size="sm">
                    <MoreVertical className="w-4 h-4" />
                </AnimatedButton>
            </div>
        </motion.div>
    );
};
