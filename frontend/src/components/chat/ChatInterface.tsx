'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { Send, Heart, Gift, Image, Smile, MoreVertical, Phone, Video } from 'lucide-react';
import { useTelegram } from '@/lib/telegram';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { GlassCard } from '@/components/ui/GlassCard';

interface Message {
    id: string;
    text: string;
    senderId: string;
    timestamp: Date;
    type: 'text' | 'image' | 'gift' | 'reaction';
    isRead: boolean;
    replyTo?: string;
    reactions?: { emoji: string; userId: string }[];
}

interface Chat {
    id: string;
    matchId: string;
    participants: {
        id: string;
        name: string;
        photo: string;
        isOnline: boolean;
        lastSeen?: Date;
    }[];
    messages: Message[];
    isTyping: boolean;
    unreadCount: number;
}

interface ChatInterfaceProps {
    chat: Chat;
    currentUserId: string;
    onSendMessage: (text: string, type?: 'text' | 'image' | 'gift') => void;
    onReaction: (messageId: string, emoji: string) => void;
    onCall: (type: 'voice' | 'video') => void;
    isPremium: boolean;
}

const REACTION_EMOJIS = ['❤️', '😍', '😂', '😮', '😢', '👍'];

export const ChatInterface = ({
    chat,
    currentUserId,
    onSendMessage,
    onReaction,
    onCall,
    isPremium
}: ChatInterfaceProps) => {
    const { hapticFeedback } = useTelegram();
    const [message, setMessage] = useState('');
    const [showReactions, setShowReactions] = useState<string | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const otherParticipant = chat.participants.find(p => p.id !== currentUserId);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [chat.messages]);

    const handleSendMessage = () => {
        if (!message.trim()) return;

        onSendMessage(message.trim());
        setMessage('');
        hapticFeedback.light();
        inputRef.current?.focus();
    };

    const handleReaction = (messageId: string, emoji: string) => {
        onReaction(messageId, emoji);
        setShowReactions(null);
        hapticFeedback.medium();
    };

    const formatTime = (date: Date) => {
        return new Intl.DateTimeFormat('ru', {
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    return (
        <div className="flex flex-col h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
            {/* Header */}
            <motion.div
                className="flex items-center justify-between p-4 border-b border-white/10 bg-black/20 backdrop-blur-sm"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="flex items-center space-x-3">
                    <div className="relative">
                        <img
                            src={otherParticipant?.photo || '/placeholder.svg?height=40&width=40'}
                            alt={otherParticipant?.name}
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

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <AnimatePresence>
                    {chat.messages.map((msg, index) => {
                        const isOwn = msg.senderId === currentUserId;
                        const showAvatar = !isOwn && (
                            index === 0 ||
                            chat.messages[index - 1].senderId !== msg.senderId
                        );

                        return (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{
                                    duration: 0.3,
                                    delay: index * 0.05,
                                    ease: "easeOut"
                                }}
                                className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}
                            >
                                {/* Avatar */}
                                {showAvatar && (
                                    <img
                                        src={otherParticipant?.photo || '/placeholder.svg?height=32&width=32'}
                                        alt=""
                                        className="w-8 h-8 rounded-full object-cover mr-2 mt-auto"
                                    />
                                )}

                                <div className={`max-w-[75%] ${showAvatar ? '' : 'ml-10'}`}>
                                    {/* Message Bubble */}
                                    <motion.div
                                        className={`relative p-3 rounded-2xl ${isOwn
                                            ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                                            : 'bg-gray-800 text-white'
                                            } ${msg.type === 'gift' ? 'p-6' : ''}`}
                                        whileHover={{ scale: 1.02 }}
                                        // onLongPress={() => setShowReactions(msg.id)} // Framer motion dict doesn't have onLongPress by default for div, use explicit tap handlers or specialized hooks
                                        onTap={() => setShowReactions(msg.id)}
                                    >
                                        {msg.type === 'text' && (
                                            <p className="text-sm leading-relaxed">{msg.text}</p>
                                        )}

                                        {msg.type === 'image' && (
                                            <div className="rounded-lg overflow-hidden">
                                                <img
                                                    src={msg.text}
                                                    alt="Shared image"
                                                    className="w-full h-auto max-w-xs"
                                                />
                                            </div>
                                        )}

                                        {msg.type === 'gift' && (
                                            <div className="text-center">
                                                <div className="text-4xl mb-2">🎁</div>
                                                <p className="text-sm font-semibold">Подарок!</p>
                                            </div>
                                        )}

                                        {/* Reactions */}
                                        {msg.reactions && msg.reactions.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {msg.reactions.map((reaction, idx) => (
                                                    <motion.div
                                                        key={idx}
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

                                    {/* Timestamp and Read Status */}
                                    <div className={`flex items-center mt-1 space-x-2 ${isOwn ? 'justify-end' : 'justify-start'
                                        }`}>
                                        <span className="text-xs text-gray-500">
                                            {formatTime(msg.timestamp)}
                                        </span>
                                        {isOwn && (
                                            <div className={`w-2 h-2 rounded-full ${msg.isRead ? 'bg-blue-500' : 'bg-gray-500'
                                                }`} />
                                        )}
                                    </div>

                                    {/* Reaction Picker */}
                                    <AnimatePresence>
                                        {showReactions === msg.id && (
                                            <motion.div
                                                className="absolute z-10 bg-gray-800 rounded-full p-2 shadow-lg border border-gray-700 mt-2"
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
                                                            onClick={() => handleReaction(msg.id, emoji)}
                                                        >
                                                            {emoji}
                                                        </motion.button>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {/* Typing Indicator */}
                <AnimatePresence>
                    {chat.isTyping && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="flex items-center space-x-2"
                        >
                            <img
                                src={otherParticipant?.photo || '/placeholder.svg?height=32&width=32'}
                                alt=""
                                className="w-8 h-8 rounded-full object-cover"
                            />
                            <div className="bg-gray-800 rounded-2xl px-4 py-2">
                                <div className="flex space-x-1">
                                    {[0, 1, 2].map((i) => (
                                        <motion.div
                                            key={i}
                                            className="w-2 h-2 bg-gray-400 rounded-full"
                                            animate={{
                                                scale: [1, 1.5, 1],
                                                opacity: [0.5, 1, 0.5]
                                            }}
                                            transition={{
                                                duration: 1,
                                                repeat: Infinity,
                                                delay: i * 0.2
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <motion.div
                className="p-4 border-t border-white/10 bg-black/20 backdrop-blur-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <div className="flex items-center space-x-3">
                    {/* Attachment Buttons */}
                    <div className="flex space-x-2">
                        <AnimatedButton
                            variant="ghost"
                            size="sm"
                            className="text-gray-400"
                        >
                            <Image className="w-4 h-4" />
                        </AnimatedButton>

                        {isPremium && (
                            <AnimatedButton
                                variant="ghost"
                                size="sm"
                                className="text-pink-400"
                            >
                                <Gift className="w-4 h-4" />
                            </AnimatedButton>
                        )}
                    </div>

                    {/* Message Input */}
                    <div className="flex-1 relative">
                        <input
                            ref={inputRef}
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder="Напишите сообщение..."
                            className="w-full bg-gray-800 text-white rounded-full px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                            <Smile className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Send Button */}
                    <AnimatedButton
                        onClick={handleSendMessage}
                        disabled={!message.trim()}
                        className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 disabled:opacity-50"
                    >
                        <Send className="w-4 h-4" />
                    </AnimatedButton>
                </div>

                {/* Emoji Picker */}
                <AnimatePresence>
                    {showEmojiPicker && (
                        <motion.div
                            className="absolute bottom-16 right-4 bg-gray-800 rounded-2xl p-4 shadow-lg border border-gray-700"
                            initial={{ opacity: 0, scale: 0.8, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: 10 }}
                        >
                            <div className="grid grid-cols-6 gap-2">
                                {['😀', '😂', '😍', '🥰', '😘', '😊', '😉', '😎', '🤔', '😮', '😢', '😡', '👍', '👎', '❤️', '💕', '🔥', '✨'].map((emoji) => (
                                    <button
                                        key={emoji}
                                        className="text-xl hover:scale-125 transition-transform p-1"
                                        onClick={() => {
                                            setMessage(prev => prev + emoji);
                                            setShowEmojiPicker(false);
                                        }}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};
