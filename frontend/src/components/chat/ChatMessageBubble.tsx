'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Check } from 'lucide-react';
import { FALLBACK_AVATAR } from '@/lib/constants';
import type { Message, ChatParticipant } from './ChatTypes';
import { REACTION_EMOJIS } from './ChatTypes';

interface ChatMessageBubbleProps {
    msg: Message;
    isOwn: boolean;
    showAvatar: boolean;
    otherParticipant: ChatParticipant | undefined;
    playingAudio: string | null;
    showReactions: string | null;
    onToggleAudio: (url: string) => void;
    onTapMessage: (messageId: string) => void;
    onReaction: (messageId: string, emoji: string) => void;
    formatTime: (date: Date) => string;
}

// Пузырь сообщения: текст, изображение, подарок, голосовое, реакции
export const ChatMessageBubble = ({
    msg,
    isOwn,
    showAvatar,
    otherParticipant,
    playingAudio,
    showReactions,
    onToggleAudio,
    onTapMessage,
    onReaction,
    formatTime,
}: ChatMessageBubbleProps) => {
    return (
        <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}>
            {/* Аватар */}
            {showAvatar && (
                <img
                    src={otherParticipant?.photo || FALLBACK_AVATAR}
                    alt={otherParticipant?.name || 'Фото в чате'}
                    loading="lazy"
                    className="w-8 h-8 rounded-full object-cover mr-2 mt-auto"
                />
            )}

            <div className={`max-w-[75%] ${showAvatar ? '' : 'ml-10'}`}>
                {/* Пузырь сообщения */}
                <motion.div
                    className={`relative p-3 rounded-2xl ${isOwn
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                        : 'bg-white/10 text-white'
                        } ${msg.type === 'gift' ? 'p-6' : ''}`}
                    whileTap={{ scale: 0.98 }}
                    onTap={() => onTapMessage(msg.id)}
                >
                    {msg.type === 'text' && (
                        <p className="text-sm leading-relaxed break-words overflow-wrap-anywhere">{msg.text}</p>
                    )}

                    {msg.type === 'image' && (
                        <div className="rounded-lg overflow-hidden">
                            <img
                                src={msg.text}
                                alt="Shared image"
                                loading="lazy"
                                className="w-full h-auto max-w-full"
                            />
                        </div>
                    )}

                    {msg.type === 'gift' && (
                        <div className="text-center">
                            <div className="text-4xl mb-2">🎁</div>
                            <p className="text-sm font-semibold">Подарок!</p>
                        </div>
                    )}

                    {msg.type === 'voice' && (
                        <VoiceBubble
                            audioUrl={msg.audioUrl}
                            duration={msg.duration}
                            isPlaying={playingAudio === msg.audioUrl}
                            onToggle={() => onToggleAudio(msg.audioUrl || '')}
                        />
                    )}

                    {/* Реакции на сообщении */}
                    {msg.reactions && msg.reactions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {msg.reactions.map((reaction, idx) => (
                                <motion.div
                                    key={reaction.emoji || idx}
                                    className="bg-black/20 rounded-full px-2 py-1 text-xs"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: idx * 0.1 }}
                                >
                                    {reaction.emoji}
                                </motion.div>
                            ))}
                        </div>
                    )}
                </motion.div>

                {/* Время и статус прочтения */}
                <div className={`flex items-center mt-1 space-x-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <span className="text-xs text-gray-500">
                        {formatTime(msg.timestamp)}
                    </span>
                    {isOwn && (
                        <div className="flex items-center">
                            {msg.isPending ? (
                                <div className="w-3 h-3 rounded-full border-2 border-gray-500 border-t-transparent animate-spin" />
                            ) : (
                                <motion.div
                                    className="flex items-center"
                                    initial={false}
                                    animate={msg.isRead ? "read" : "unread"}
                                >
                                    <div className="flex -space-x-1">
                                        <Check className={`w-3 h-3 ${msg.isRead ? 'text-blue-500' : 'text-gray-500'}`} />
                                        <Check className={`w-3 h-3 ${msg.isRead ? 'text-blue-500' : 'text-gray-500'}`} />
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    )}
                </div>

                {/* Пикер реакций */}
                <AnimatePresence>
                    {showReactions === msg.id && (
                        <motion.div
                            className="absolute z-10 bg-white/10 rounded-full p-2 shadow-lg border border-white/10 mt-2"
                            initial={{ opacity: 0, scale: 0.8, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="flex space-x-2">
                                {REACTION_EMOJIS.map((emoji) => (
                                    <motion.button
                                        key={emoji}
                                        className="text-lg hover:scale-125 transition-transform"
                                        whileHover={{ scale: 1.3 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => onReaction(msg.id, emoji)}
                                    >
                                        {emoji}
                                    </motion.button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

// Внутренний компонент для голосового сообщения
function VoiceBubble({
    audioUrl,
    duration,
    isPlaying,
    onToggle,
}: {
    audioUrl?: string;
    duration?: number;
    isPlaying: boolean;
    onToggle: () => void;
}) {
    return (
        <div className="flex items-center space-x-2 min-w-[150px]">
            <button
                onClick={(e) => { e.stopPropagation(); onToggle(); }}
                className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center shrink-0"
            >
                {isPlaying ?
                    <Pause className="w-4 h-4 text-white" /> :
                    <Play className="w-4 h-4 text-white fill-current" />
                }
            </button>
            <div className="flex flex-col flex-1">
                <div className="flex items-center space-x-0.5 h-4">
                    {[...Array(12)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="w-1 bg-white/40 rounded-full"
                            animate={isPlaying ? {
                                height: [4, 12, 6, 14, 4],
                            } : { height: 4 }}
                            transition={{
                                duration: 1,
                                repeat: Infinity,
                                delay: i * 0.1,
                            }}
                        />
                    ))}
                </div>
                <span className="text-xs text-white/50 mt-1">
                    {duration ? `${duration.toFixed(0)}s` : 'Voice'}
                </span>
            </div>
        </div>
    );
}
