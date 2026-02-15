'use client';

/**
 * VIP Chat System Component — Оркестратор
 * 
 * TODO (PERF): For chats with 1000+ messages, implement virtualization
 * using react-window or @tanstack/virtual to prevent DOM overload.
 * Currently renders all messages which can cause scroll lag.
 */

import { useState } from 'react';
import React from 'react';
import { useTelegram } from '@/lib/telegram';
import type { EmojiClickData } from 'emoji-picker-react';

// Типы (реэкспорт для обратной совместимости)
export { type Message, type ChatUser } from './vipChatTypes';
import type { Message, ChatUser } from './vipChatTypes';

// Подкомпоненты
import { VIPChatHeader } from './VIPChatHeader';
import { VIPMessageList } from './VIPMessageList';
import { VIPComposer } from './VIPComposer';
import { VIPReactionPicker } from './VIPReactionPicker';
import { VIPImageLightbox } from './VIPImageLightbox';

interface VIPChatSystemProps {
  user: ChatUser;
  messages: Message[];
  isPremium: boolean;
  onSendMessage: (text: string) => void;
  onSendImage: (file: File) => void;
  onSendSuperLike: () => void;
  onReaction?: (id: string, reaction: string) => void;
  onBack: () => void;
  /** Optional: inject text into input (e.g. from icebreakers or prompts) */
  injectInputText?: string;
  onConsumedInject?: () => void;
  /** Optional slot rendered at the top of the message scroll area (e.g. QuestionOfTheDay + toolbar) */
  toolbarSlot?: React.ReactNode;
}

export const VIPChatSystem = ({
  user,
  messages,
  isPremium,
  onSendMessage,
  onSendImage,
  onSendSuperLike,
  onReaction,
  onBack,
  injectInputText,
  onConsumedInject,
  toolbarSlot,
}: VIPChatSystemProps) => {
  const { hapticFeedback } = useTelegram();

  // Состояние реакций
  const [activeReactionId, setActiveReactionId] = useState<string | null>(null);
  const [reactingToMessageId, setReactingToMessageId] = useState<string | null>(null);

  // Состояние лайтбокса
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  /** Обработка выбора эмодзи в модальном пикере реакций */
  const handleReactionEmojiClick = (emojiData: EmojiClickData) => {
    if (reactingToMessageId && onReaction) {
      onReaction(reactingToMessageId, emojiData.emoji);
    }
    setReactingToMessageId(null);
    setActiveReactionId(null);
    hapticFeedback.selection();
  };

  return (
    <div className={`flex flex-col flex-1 min-h-0 bg-[#0F0F0F] font-sans ${isPremium ? 'text-white' : 'text-gray-900'}`}>

      {/* Модальное окно выбора реакции */}
      <VIPReactionPicker
        reactingToMessageId={reactingToMessageId}
        onEmojiClick={handleReactionEmojiClick}
        onClose={() => setReactingToMessageId(null)}
      />

      {/* Лайтбокс изображений */}
      <VIPImageLightbox
        imageUrl={viewingImage}
        onClose={() => setViewingImage(null)}
      />

      {/* Шапка чата */}
      <VIPChatHeader
        user={user}
        onBack={onBack}
        onSendSuperLike={onSendSuperLike}
      />

      {/* Список сообщений */}
      <VIPMessageList
        messages={messages}
        isTyping={user.isTyping}
        activeReactionId={activeReactionId}
        onSetActiveReactionId={setActiveReactionId}
        onReaction={onReaction}
        onOpenReactionPicker={(messageId) => {
          setReactingToMessageId(messageId);
          setActiveReactionId(null);
        }}
        onViewImage={setViewingImage}
        hapticFeedback={hapticFeedback}
        toolbarSlot={toolbarSlot}
      />

      {/* Поле ввода */}
      <VIPComposer
        onSendMessage={onSendMessage}
        onSendImage={onSendImage}
        injectInputText={injectInputText}
        onConsumedInject={onConsumedInject}
        hapticFeedback={hapticFeedback}
      />
    </div>
  );
};
