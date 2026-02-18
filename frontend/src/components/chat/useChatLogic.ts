'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { wsService } from '@/services/websocket';
import { useHaptic } from '@/hooks/useHaptic';
import { useSoundService } from '@/hooks/useSoundService';
import { httpClient } from '@/lib/http-client';
import type { Message, Chat, ChatParticipant } from './ChatTypes';


/**
 * Хук, инкапсулирующий всю логику чата:
 * WebSocket (read receipts, typing), optimistic messages, отправка, голос, аудио
 */
export function useChatLogic(chat: Chat, currentUserId: string, otherParticipant: ChatParticipant | undefined, onSendMessage: (text: string) => void) {
    const haptic = useHaptic();
    const soundService = useSoundService();

    const [message, setMessage] = useState('');
    const [showReactions, setShowReactions] = useState<string | null>(null);
    const [playingAudio, setPlayingAudio] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const [localMessages, setLocalMessages] = useState<Message[]>(chat.messages);
    const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);
    const [isPartnerTyping, setIsPartnerTyping] = useState(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const typingTimeoutTimerRef = useRef<NodeJS.Timeout | null>(null);
    const typingDebounceRef = useRef<NodeJS.Timeout | null>(null);

    const inputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const allMessages = [...localMessages, ...optimisticMessages];

    // Синхронизация сообщений из пропсов
    useEffect(() => { setLocalMessages(chat.messages); }, [chat.messages]);

    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Скролл вниз только если пользователь уже внизу
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            return;
        }
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
        if (isNearBottom) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [allMessages]);

    // WebSocket: read receipts, подтверждение, typing
    useEffect(() => {
        const handleReadReceipt = (data: { type?: string; message_ids?: string[] }) => {
            if (data.type === 'read' && data.message_ids) {
                const updateRead = (msgs: Message[]) => msgs.map(m =>
                    data.message_ids!.includes(m.id) ? { ...m, isRead: true } : m
                );
                setLocalMessages(prev => updateRead(prev));
                setOptimisticMessages(prev => updateRead(prev));
                haptic.light();
            }
        };
        const handleMessageConfirmed = (data: { sender_id?: string; content?: string }) => {
            if (data.sender_id === currentUserId) {
                setOptimisticMessages(prev => prev.filter(m => m.text !== data.content));
            }
        };
        const handleTyping = (data: { type?: string; user_id?: string; is_typing?: boolean }) => {
            if (data.type === 'typing' && data.user_id !== currentUserId) {
                if (data.is_typing) {
                    setIsPartnerTyping(true);
                    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                    typingTimeoutRef.current = setTimeout(() => setIsPartnerTyping(false), 10000);
                } else {
                    setIsPartnerTyping(false);
                    if (typingTimeoutRef.current) { clearTimeout(typingTimeoutRef.current); typingTimeoutRef.current = null; }
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
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
            if (typingTimeoutTimerRef.current) clearTimeout(typingTimeoutTimerRef.current);
        };
    }, [currentUserId, haptic]);

    // Авто-прочтение
    useEffect(() => {
        const unread = chat.messages.filter(m => m.senderId !== currentUserId && !m.isRead);
        if (unread.length > 0) {
            wsService.send({ type: 'read', match_id: chat.matchId, message_ids: unread.map(m => m.id) });
        }
    }, [chat.messages, chat.matchId, currentUserId]);

    // --- Handlers ---

    const handleSendMessage = useCallback(() => {
        if (!message.trim()) return;
        const optimisticMsg: Message = {
            id: `temp-${Date.now()}`, text: message.trim(), senderId: currentUserId,
            timestamp: new Date(), type: 'text', isRead: false, isPending: true
        };
        setOptimisticMessages(prev => [...prev, optimisticMsg]);
        onSendMessage(message.trim());
        setMessage('');
        soundService.playSent();
        haptic.success();
        inputRef.current?.focus();
    }, [message, currentUserId, onSendMessage, soundService, haptic]);

    const handleVoiceSend = useCallback(async (audioBlob: Blob, _duration: number) => {
        const formData = new FormData();
        formData.append('file', audioBlob, 'voice.webm');
        try {
            const data = await httpClient.post<{ url: string; duration: number }>('/api/chat/voice', formData);
            wsService.send({ type: 'voice', match_id: chat.matchId, media_url: data.url, duration: data.duration });
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

    const handleReaction = useCallback((messageId: string, emoji: string) => {
        setShowReactions(null);
        haptic.medium();
        // onReaction вызывается снаружи
        return { messageId, emoji };
    }, [haptic]);

    const handleMessageChange = useCallback((val: string) => {
        setMessage(val);
        if (val.length > 0 && !typingDebounceRef.current) {
            wsService.send({ type: 'typing', match_id: chat.matchId, is_typing: true, recipient_id: otherParticipant?.id });
        }
        if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
        typingDebounceRef.current = setTimeout(() => {
            wsService.send({ type: 'typing', match_id: chat.matchId, is_typing: false, recipient_id: otherParticipant?.id });
            typingDebounceRef.current = null;
        }, 2500);
        if (typingTimeoutTimerRef.current) clearTimeout(typingTimeoutTimerRef.current);
        typingTimeoutTimerRef.current = setTimeout(() => {
            wsService.send({ type: 'typing', match_id: chat.matchId, is_typing: false, recipient_id: otherParticipant?.id });
            typingTimeoutTimerRef.current = null;
        }, 10000);
    }, [chat.matchId, otherParticipant?.id]);

    // Очистка аудио при размонтировании
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = '';
                audioRef.current = null;
            }
        };
    }, []);

    return {
        message, setMessage, allMessages, showReactions, setShowReactions,
        playingAudio, isPartnerTyping, inputRef, messagesEndRef, scrollContainerRef,
        handleSendMessage, handleVoiceSend, toggleAudio, handleReaction,
        handleMessageChange,
    };
}
