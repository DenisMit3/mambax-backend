'use client';

/**
 * FIX (PERF-003): Virtualized message list for better performance with long chat histories
 */

import { useRef, useEffect, memo, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion } from 'framer-motion';
import { Check, CheckCheck, Play, Pause } from 'lucide-react';

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

interface VirtualizedMessageListProps {
    messages: Message[];
    currentUserId: string;
    otherParticipantPhoto?: string;
    onMessageTap?: (messageId: string) => void;
    playingAudio: string | null;
    onToggleAudio: (url: string) => void;
}

const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
    });
};

// Memoized message component
const MessageItem = memo(function MessageItem({
    msg,
    isOwn,
    showAvatar,
    otherParticipantPhoto,
    onTap,
    playingAudio,
    onToggleAudio
}: {
    msg: Message;
    isOwn: boolean;
    showAvatar: boolean;
    otherParticipantPhoto?: string;
    onTap?: () => void;
    playingAudio: string | null;
    onToggleAudio: (url: string) => void;
}) {
    return (
        <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group px-4 py-1`}>
            {/* Avatar */}
            {showAvatar && (
                <img
                    src={otherParticipantPhoto || '/placeholder.svg?height=32&width=32'}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover mr-2 mt-auto"
                />
            )}

            <div className={`max-w-[75%] ${showAvatar ? '' : 'ml-10'}`}>
                {/* Message Bubble */}
                <div
                    className={`relative p-3 rounded-2xl cursor-pointer ${isOwn
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                        : 'bg-gray-800 text-white'
                    } ${msg.type === 'gift' ? 'p-6' : ''}`}
                    onClick={onTap}
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

                    {msg.type === 'voice' && (
                        <div className="flex items-center space-x-2 min-w-[150px]">
                            <button
                                onClick={(e) => { e.stopPropagation(); onToggleAudio(msg.audioUrl || ''); }}
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
                                        <div
                                            key={i}
                                            className="w-1 bg-white/40 rounded-full"
                                            style={{ height: playingAudio === msg.audioUrl ? '12px' : '4px' }}
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
                                <div
                                    key={idx}
                                    className="bg-black/20 rounded-full px-2 py-1 text-xs"
                                >
                                    {reaction.emoji}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Timestamp and Read Status */}
                <div className={`flex items-center mt-1 space-x-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <span className="text-xs text-gray-500">
                        {formatTime(msg.timestamp)}
                    </span>
                    {isOwn && (
                        <span className="text-xs">
                            {msg.isPending ? (
                                <span className="text-gray-500">...</span>
                            ) : msg.isRead ? (
                                <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
                            ) : (
                                <Check className="w-3.5 h-3.5 text-gray-500" />
                            )}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
});

export const VirtualizedMessageList = memo(function VirtualizedMessageList({
    messages,
    currentUserId,
    otherParticipantPhoto,
    onMessageTap,
    playingAudio,
    onToggleAudio
}: VirtualizedMessageListProps) {
    const parentRef = useRef<HTMLDivElement>(null);

    const virtualizer = useVirtualizer({
        count: messages.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 80, // Estimated row height
        overscan: 5, // Render 5 extra items above/below viewport
    });

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (messages.length > 0) {
            virtualizer.scrollToIndex(messages.length - 1, { align: 'end' });
        }
    }, [messages.length, virtualizer]);

    const handleToggleAudio = useCallback((url: string) => {
        onToggleAudio(url);
    }, [onToggleAudio]);

    return (
        <div
            ref={parentRef}
            className="flex-1 overflow-y-auto"
            style={{ contain: 'strict' }}
        >
            <div
                style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                }}
            >
                {virtualizer.getVirtualItems().map((virtualRow) => {
                    const msg = messages[virtualRow.index];
                    const isOwn = msg.senderId === currentUserId;
                    const previousMessage = virtualRow.index > 0 ? messages[virtualRow.index - 1] : null;
                    const showAvatar = !isOwn && (!previousMessage || previousMessage.senderId !== msg.senderId);

                    return (
                        <div
                            key={msg.id}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                transform: `translateY(${virtualRow.start}px)`,
                            }}
                        >
                            <MessageItem
                                msg={msg}
                                isOwn={isOwn}
                                showAvatar={showAvatar}
                                otherParticipantPhoto={otherParticipantPhoto}
                                onTap={onMessageTap ? () => onMessageTap(msg.id) : undefined}
                                playingAudio={playingAudio}
                                onToggleAudio={handleToggleAudio}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

export default VirtualizedMessageList;
