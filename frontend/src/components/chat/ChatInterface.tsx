'use client';

import { AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback, memo } from 'react';
import { ContextualTooltip } from '@/components/onboarding/ContextualTooltip';
import { IcebreakersModal } from './IcebreakersModal';
import { ChatHeader } from './ChatHeader';
import { ChatMessageBubble } from './ChatMessageBubble';
import { ChatTypingIndicator } from './ChatTypingIndicator';
import { ChatComposer } from './ChatComposer';
import { ConversationPromptsModal } from './ConversationPromptsModal';
import { useChatLogic } from './useChatLogic';
import type { Chat } from './ChatTypes';

interface ChatInterfaceProps {
    chat: Chat;
    currentUserId: string;
    onSendMessage: (text: string, type?: 'text' | 'image' | 'gift') => void;
    onReaction: (messageId: string, emoji: string) => void;
    onCall: (type: 'voice' | 'video') => void;
    isPremium: boolean;
}

export const ChatInterface = ({
    chat, currentUserId, onSendMessage, onReaction, onCall, isPremium
}: ChatInterfaceProps) => {
    const otherParticipant = chat.participants.find(p => p.id !== currentUserId);

    const {
        message, setMessage, allMessages, showReactions, setShowReactions,
        playingAudio, isPartnerTyping, inputRef, messagesEndRef,
        handleSendMessage, handleVoiceSend, toggleAudio, handleReaction,
        handleMessageChange,
    } = useChatLogic(chat, currentUserId, otherParticipant, onSendMessage);

    // Icebreakers & conversation prompts state
    const [showIcebreakers, setShowIcebreakers] = useState(false);
    const [showConversationPrompts, setShowConversationPrompts] = useState(false);
    const [conversationPrompts, setConversationPrompts] = useState<string[]>([]);
    const [isConversationStalled, setIsConversationStalled] = useState(false);
    const [loadingPrompts, setLoadingPrompts] = useState(false);

    // Авто-показ icebreakers для нового матча
    useEffect(() => {
        if (chat.matchId && chat.messages.length === 0) {
            const t = setTimeout(() => setShowIcebreakers(true), 500);
            return () => clearTimeout(t);
        }
    }, [chat.matchId, chat.messages.length]);

    // Проверка: разговор затих (>24ч)
    useEffect(() => {
        if (chat.messages.length === 0) { setIsConversationStalled(false); return; }
        const last = chat.messages[chat.messages.length - 1];
        const hours = (Date.now() - new Date(last.timestamp).getTime()) / 3_600_000;
        setIsConversationStalled(hours >= 24);
    }, [chat.messages]);

    const handleOpenConversationPrompts = useCallback(async () => {
        if (!isConversationStalled) return;
        setLoadingPrompts(true);
        setShowConversationPrompts(true);
        try {
            const res = await fetch(`/api_proxy/api/chat/conversation-prompts?match_id=${chat.matchId}`, {
                headers: {
                    'Authorization': `Bearer ${(() => { try { return localStorage.getItem('accessToken') || localStorage.getItem('token'); } catch { return ''; } })()}`
                }
            });
            if (res.ok) { const data = await res.json(); setConversationPrompts(data.prompts || []); }
        } catch (e) { console.error('Failed to fetch conversation prompts:', e); }
        finally { setLoadingPrompts(false); }
    }, [chat.matchId, isConversationStalled]);

    const formatTime = (date: Date) =>
        new Intl.DateTimeFormat('ru', { hour: '2-digit', minute: '2-digit' }).format(new Date(date));

    const onReactionWrapper = (messageId: string, emoji: string) => {
        handleReaction(messageId, emoji);
        onReaction(messageId, emoji);
    };

    const selectPromptOrIcebreaker = (text: string) => {
        setMessage(text);
        setShowIcebreakers(false);
        setShowConversationPrompts(false);
        inputRef.current?.focus();
    };

    return (
        <div className="flex flex-col h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
            <ChatHeader
                otherParticipant={otherParticipant}
                isPremium={isPremium}
                hasMessages={chat.messages.length > 0}
                isConversationStalled={isConversationStalled}
                onCall={onCall}
                onOpenIcebreakers={() => setShowIcebreakers(true)}
                onOpenConversationPrompts={handleOpenConversationPrompts}
                formatTime={formatTime}
            />

            <IcebreakersModal
                isOpen={showIcebreakers}
                onClose={() => setShowIcebreakers(false)}
                matchId={chat.matchId}
                onSelectIcebreaker={selectPromptOrIcebreaker}
            />

            <ConversationPromptsModal
                isOpen={showConversationPrompts}
                onClose={() => setShowConversationPrompts(false)}
                prompts={conversationPrompts}
                loading={loadingPrompts}
                onSelectPrompt={selectPromptOrIcebreaker}
            />

            {/* Список сообщений */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <AnimatePresence>
                    {allMessages.map((msg, index) => {
                        const isOwn = msg.senderId === currentUserId;
                        const prev = index > 0 ? allMessages[index - 1] : null;
                        const showAvatar = !isOwn && (!prev || prev.senderId !== msg.senderId);
                        return (
                            <ChatMessageBubble
                                key={msg.id}
                                msg={msg} isOwn={isOwn} showAvatar={showAvatar}
                                otherParticipant={otherParticipant}
                                playingAudio={playingAudio} showReactions={showReactions}
                                onToggleAudio={toggleAudio}
                                onTapMessage={(id) => setShowReactions(id)}
                                onReaction={onReactionWrapper}
                                formatTime={formatTime}
                            />
                        );
                    })}
                </AnimatePresence>

                <AnimatePresence>
                    {(chat.isTyping || isPartnerTyping) && (
                        <ChatTypingIndicator otherParticipant={otherParticipant} />
                    )}
                </AnimatePresence>
                <div ref={messagesEndRef} />
            </div>

            <ChatComposer
                message={message} isPremium={isPremium} inputRef={inputRef}
                onMessageChange={handleMessageChange}
                onSendMessage={handleSendMessage}
                onVoiceSend={handleVoiceSend}
            />

            <ContextualTooltip
                stepId="first_chat_opened"
                title="Совет: используй голосовые сообщения"
                message="Голосовые сообщения создают более личную связь. Попробуй!"
                trigger="auto" delay={5000}
            />
        </div>
    );
};

// Мемоизация для предотвращения лишних ре-рендеров
export default memo(ChatInterface);
