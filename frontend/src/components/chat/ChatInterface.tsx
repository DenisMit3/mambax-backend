'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Send, Heart, Gift, Image, Smile, MoreVertical, Phone, Video, Play, Pause, Check, CheckCheck, Lightbulb } from 'lucide-react';
import { useTelegram } from '@/lib/telegram';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { GlassCard } from '@/components/ui/GlassCard';
import { VoiceRecorder } from './VoiceRecorder';
import { useHaptic } from '@/hooks/useHaptic';
import { useSoundService } from '@/hooks/useSoundService';
import { wsService } from '@/services/websocket';
import { ContextualTooltip } from '@/components/onboarding/ContextualTooltip';
import { IcebreakersModal } from './IcebreakersModal';
// import { getToken } from '@/services/auth'; // Assuming this exists, or use localStorage
const getToken = () => localStorage.getItem('token');

interface Message {
    id: string;
    text: string;
    senderId: string;
    timestamp: Date;
    type: 'text' | 'image' | 'gift' | 'reaction' | 'voice';
    isRead: boolean;
    isPending?: boolean;
    replyTo?: string;
    reactions?: { emoji: string; userId: string }[];
    audioUrl?: string;
    duration?: number;
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
    const haptic = useHaptic();
    const soundService = useSoundService();
    const [message, setMessage] = useState('');
    const [showReactions, setShowReactions] = useState<string | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showIcebreakers, setShowIcebreakers] = useState(false);
    const [showConversationPrompts, setShowConversationPrompts] = useState(false);
    const [conversationPrompts, setConversationPrompts] = useState<string[]>([]);
    const [isConversationStalled, setIsConversationStalled] = useState(false);
    const [loadingPrompts, setLoadingPrompts] = useState(false);

    // Voice & Audio
    const [playingAudio, setPlayingAudio] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Optimistic UI
    const [localMessages, setLocalMessages] = useState<Message[]>(chat.messages);
    const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);

    // FIX: Local typing state with 10s timeout
    const [isPartnerTyping, setIsPartnerTyping] = useState(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        setLocalMessages(chat.messages);
    }, [chat.messages]);

    // Auto-show icebreakers for new match (no messages yet)
    useEffect(() => {
        if (chat.matchId && chat.messages.length === 0) {
            const t = setTimeout(() => setShowIcebreakers(true), 500);
            return () => clearTimeout(t);
        }
    }, [chat.matchId, chat.messages.length]);

    // Check if conversation is stalled (last message > 24h ago)
    useEffect(() => {
        if (chat.messages.length === 0) {
            setIsConversationStalled(false);
            return;
        }
        const lastMessage = chat.messages[chat.messages.length - 1];
        const lastMessageTime = new Date(lastMessage.timestamp).getTime();
        const now = Date.now();
        const hoursSinceLastMessage = (now - lastMessageTime) / (1000 * 60 * 60);
        setIsConversationStalled(hoursSinceLastMessage >= 24);
    }, [chat.messages]);

    // Fetch conversation prompts when stalled conversation modal is opened
    const handleOpenConversationPrompts = useCallback(async () => {
        if (!isConversationStalled) return;
        
        setLoadingPrompts(true);
        setShowConversationPrompts(true);
        
        try {
            const token = getToken();
            const response = await fetch(`/api/chat/conversation-prompts?match_id=${chat.matchId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                setConversationPrompts(data.prompts || []);
            }
        } catch (error) {
            console.error('Failed to fetch conversation prompts:', error);
        } finally {
            setLoadingPrompts(false);
        }
    }, [chat.matchId, isConversationStalled]);

    const allMessages = [...localMessages, ...optimisticMessages];

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
    const [typingDebounce, setTypingDebounce] = useState<NodeJS.Timeout | null>(null);

    const otherParticipant = chat.participants.find(p => p.id !== currentUserId);

    // Removed manual whoosh sound initialization

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [allMessages]);

    // WebSocket Handlers
    useEffect(() => {
        const handleReadReceipt = (data: any) => {
            if (data.type === 'read' && data.message_ids) {
                const updateRead = (msgs: Message[]) => msgs.map(m =>
                    data.message_ids.includes(m.id) ? { ...m, isRead: true } : m
                );
                setLocalMessages(prev => updateRead(prev));
                setOptimisticMessages(prev => updateRead(prev));
                haptic.light();
            }
        };

        const handleMessageConfirmed = (data: any) => {
            // If we get an echo or confirmation of our message
            if (data.sender_id === currentUserId) {
                setOptimisticMessages(prev =>
                    prev.filter(m => m.text !== data.content) // Simplified matching
                );
            }
        };

        // FIX: Implement typing handler with 10s timeout
        const handleTyping = (data: any) => {
            if (data.type === 'typing' && data.user_id !== currentUserId) {
                if (data.is_typing) {
                    setIsPartnerTyping(true);
                    
                    // Clear existing timeout
                    if (typingTimeoutRef.current) {
                        clearTimeout(typingTimeoutRef.current);
                    }
                    
                    // Set 10s timeout to auto-clear typing indicator
                    typingTimeoutRef.current = setTimeout(() => {
                        setIsPartnerTyping(false);
                    }, 10000);
                } else {
                    // Explicitly stopped typing
                    setIsPartnerTyping(false);
                    if (typingTimeoutRef.current) {
                        clearTimeout(typingTimeoutRef.current);
                        typingTimeoutRef.current = null;
                    }
                }
            }
        };

        wsService.on('read', handleReadReceipt);
        wsService.on('message', handleMessageConfirmed);
        wsService.on('typing', handleTyping);

        return () => {
            wsService.off('read', handleReadReceipt);
            wsService.off('message', handleMessageConfirmed);
            wsService.off('typing', handleTyping);
            
            // Cleanup typing timeout on unmount
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, [currentUserId, haptic]);

    // Auto-read effect
    useEffect(() => {
        const unreadMessages = chat.messages.filter(
            m => m.senderId !== currentUserId && !m.isRead
        );

        if (unreadMessages.length > 0) {
            const messageIds = unreadMessages.map(m => m.id);
            wsService.send({
                type: 'read',
                match_id: chat.matchId,
                message_ids: messageIds
            });
        }
    }, [chat.messages, chat.matchId]);

    // FIX (PERF-001): Memoize handlers to prevent unnecessary re-renders
    const handleSendMessage = useCallback(() => {
        if (!message.trim()) return;

        const tempId = `temp-${Date.now()}`;
        const optimisticMsg: Message = {
            id: tempId,
            text: message.trim(),
            senderId: currentUserId,
            timestamp: new Date(),
            type: 'text',
            isRead: false,
            isPending: true
        };

        setOptimisticMessages(prev => [...prev, optimisticMsg]);
        onSendMessage(message.trim());

        setMessage('');
        soundService.playSent();
        haptic.success();
        inputRef.current?.focus();
    }, [message, currentUserId, onSendMessage, soundService, haptic]);

    const handleVoiceSend = useCallback(async (audioBlob: Blob, duration: number) => {
        const formData = new FormData();
        formData.append('file', audioBlob, 'voice.webm');

        const token = localStorage.getItem('token'); // Simplification

        try {
            // Upload
            const response = await fetch('/api/chat/voice', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!response.ok) throw new Error('Upload failed');

            const { url, duration: serverDuration } = await response.json();

            // Send WS
            wsService.send({
                type: 'voice',
                match_id: chat.matchId,
                media_url: url,
                duration: serverDuration
            });

            haptic.success();
            soundService.playSent();
        } catch (e) {
            console.error(e);
            haptic.error();
        }
    }, [chat.matchId, haptic, soundService]);

    const toggleAudio = useCallback((url: string) => {
        if (playingAudio === url) {
            audioRef.current?.pause();
            setPlayingAudio(null);
        } else {
            if (audioRef.current) audioRef.current.pause();
            audioRef.current = new Audio(url);
            audioRef.current.onended = () => setPlayingAudio(null);
            audioRef.current.play();
            setPlayingAudio(url);
        }
    }, [playingAudio]);

    const handleReaction = (messageId: string, emoji: string) => {
        onReaction(messageId, emoji);
        setShowReactions(null);
        haptic.medium();
    };

    const formatTime = (date: Date) => {
        return new Intl.DateTimeFormat('ru', {
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(date));
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
                    {/* Show icebreakers button for new chats (no messages) */}
                    {chat.messages.length === 0 && (
                        <AnimatedButton
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowIcebreakers(true)}
                            title="Идеи для разговора"
                        >
                            <Lightbulb className="w-4 h-4 text-amber-400" />
                        </AnimatedButton>
                    )}
                    {/* Show conversation prompts button only when conversation is stalled (>24h) */}
                    {isConversationStalled && chat.messages.length > 0 && (
                        <AnimatedButton
                            variant="ghost"
                            size="sm"
                            onClick={handleOpenConversationPrompts}
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

            <IcebreakersModal
                isOpen={showIcebreakers}
                onClose={() => setShowIcebreakers(false)}
                matchId={chat.matchId}
                onSelectIcebreaker={(text) => {
                    setMessage(text);
                    setShowIcebreakers(false);
                    inputRef.current?.focus();
                }}
            />

            {/* Conversation Prompts Modal for stalled conversations */}
            <AnimatePresence>
                {showConversationPrompts && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowConversationPrompts(false)}
                    >
                        <motion.div
                            className="w-full max-w-lg bg-gray-900 rounded-t-3xl p-6 border-t border-white/10"
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="w-12 h-1 bg-gray-600 rounded-full mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                                <Lightbulb className="w-5 h-5 text-amber-400" />
                                Возобновить разговор
                            </h3>
                            <p className="text-sm text-gray-400 mb-4">
                                Разговор затих? Вот несколько идей, чтобы его оживить:
                            </p>
                            
                            {loadingPrompts ? (
                                <div className="flex justify-center py-8">
                                    <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : conversationPrompts.length > 0 ? (
                                <div className="space-y-3">
                                    {conversationPrompts.map((prompt, index) => (
                                        <motion.button
                                            key={index}
                                            className="w-full p-4 bg-gray-800 hover:bg-gray-700 rounded-xl text-left text-white transition-colors"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                            onClick={() => {
                                                setMessage(prompt);
                                                setShowConversationPrompts(false);
                                                inputRef.current?.focus();
                                            }}
                                        >
                                            {prompt}
                                        </motion.button>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-gray-500 py-4">
                                    Не удалось загрузить подсказки
                                </p>
                            )}
                            
                            <button
                                className="w-full mt-4 py-3 text-gray-400 hover:text-white transition-colors"
                                onClick={() => setShowConversationPrompts(false)}
                            >
                                Закрыть
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <AnimatePresence>
                    {allMessages.map((msg, index) => {
                        const isOwn = msg.senderId === currentUserId;
                        const previousMessage = index > 0 ? allMessages[index - 1] : null;
                        const showAvatar = !isOwn && (
                            !previousMessage || previousMessage.senderId !== msg.senderId
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
                                        loading="lazy"
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
                                                    loading="lazy"
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

                                        {msg.type === 'voice' && (
                                            <div className="flex items-center space-x-2 min-w-[150px]">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); toggleAudio(msg.audioUrl || ''); }}
                                                    className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0"
                                                >
                                                    {playingAudio === msg.audioUrl ?
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
                                                                animate={playingAudio === msg.audioUrl ? {
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
                                                        {msg.duration ? `${msg.duration.toFixed(0)}s` : 'Voice'}
                                                    </span>
                                                </div>
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
                                            <div className="flex items-center">
                                                {msg.isPending ? (
                                                    <div className="w-3 h-3 rounded-full border-2 border-gray-500 border-t-transparent animate-spin" />
                                                ) : (
                                                    <motion.div
                                                        className="flex items-center"
                                                        initial={false}
                                                        animate={msg.isRead ? "read" : "unread"}
                                                    >
                                                        {/* FIX: Double-check icons - gray when unread, blue when read */}
                                                        <div className="flex -space-x-1">
                                                            <Check className={`w-3 h-3 ${msg.isRead ? 'text-blue-500' : 'text-gray-500'}`} />
                                                            <Check className={`w-3 h-3 ${msg.isRead ? 'text-blue-500' : 'text-gray-500'}`} />
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </div>
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
                    {(chat.isTyping || isPartnerTyping) && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="flex items-center space-x-2"
                        >
                            <img
                                src={otherParticipant?.photo || '/placeholder.svg?height=32&width=32'}
                                alt=""
                                loading="lazy"
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
                            onChange={(e) => {
                                const val = e.target.value;
                                setMessage(val);

                                // Typing Logic
                                if (val.length > 0 && !typingDebounce) {
                                    wsService.send({
                                        type: 'typing',
                                        match_id: chat.matchId,
                                        is_typing: true,
                                        recipient_id: otherParticipant?.id
                                    });
                                }

                                if (typingDebounce) clearTimeout(typingDebounce);
                                const newDebounce = setTimeout(() => {
                                    wsService.send({
                                        type: 'typing',
                                        match_id: chat.matchId,
                                        is_typing: false,
                                        recipient_id: otherParticipant?.id
                                    });
                                    setTypingDebounce(null);
                                }, 300);
                                setTypingDebounce(newDebounce);

                                if (typingTimeout) clearTimeout(typingTimeout);
                                const newTimeout = setTimeout(() => {
                                    wsService.send({
                                        type: 'typing',
                                        match_id: chat.matchId,
                                        is_typing: false,
                                        recipient_id: otherParticipant?.id
                                    });
                                    setTypingTimeout(null);
                                }, 10000);
                                setTypingTimeout(newTimeout);
                            }}
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

                    {/* Send Button or Voice */}
                    {message.trim() ? (
                        <AnimatedButton
                            onClick={handleSendMessage}
                            className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                        >
                            <Send className="w-4 h-4" />
                        </AnimatedButton>
                    ) : (
                        <VoiceRecorder onSend={handleVoiceSend} />
                    )}
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

            {/* Contextual Tooltips */}
            <ContextualTooltip
                stepId="first_chat_opened"
                title="Совет: используй голосовые сообщения"
                message="Голосовые сообщения создают более личную связь. Попробуй!"
                trigger="auto"
                delay={5000}
            />
        </div>
    );
};

// FIX (PERF-001): Memoize component to prevent unnecessary re-renders
export default memo(ChatInterface);
