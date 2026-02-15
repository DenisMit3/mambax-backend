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
  /** Inject text into input (e.g. from icebreakers or prompts) */
  injectInputText?: string;
  onConsumedInject?: () => void;
  /** Звонки — кнопки в шапке */
  onStartAudioCall?: () => void;
  onStartVideoCall?: () => void;
  /** Ephemeral mode — в меню шапки */
  ephemeralEnabled?: boolean;
  onToggleEphemeral?: (v: boolean) => void;
  ephemeralSeconds?: number;
  onChangeEphemeralSeconds?: (v: number) => void;
  /** GIF и Идеи — кнопки в composer */
  onOpenGifPicker?: () => void;
  onOpenIcebreakers?: () => void;
  /** Вопрос дня — компактная карточка над composer */
  questionOfDaySlot?: React.ReactNode;
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
  onStartAudioCall,
  onStartVideoCall,
  ephemeralEnabled,
  onToggleEphemeral,
  ephemeralSeconds,
  onChangeEphemeralSeconds,
  onOpenGifPicker,
  onOpenIcebreakers,
  questionOfDaySlot,
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
    <div className={`flex flex-col h-full min-h-0 bg-[#0F0F0F] font-sans ${isPremium ? 'text-white' : 'text-gray-900'}`}>

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

      {/* Шапка чата — звонки и ephemeral в шапке */}
      <VIPChatHeader
        user={user}
        onBack={onBack}
        onSendSuperLike={onSendSuperLike}
        onStartAudioCall={onStartAudioCall}
        onStartVideoCall={onStartVideoCall}
        ephemeralEnabled={ephemeralEnabled}
        onToggleEphemeral={onToggleEphemeral}
        ephemeralSeconds={ephemeralSeconds}
        onChangeEphemeralSeconds={onChangeEphemeralSeconds}
      />

      {/* Область сообщений — чистая, без toolbar */}
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
      />

      {/* Вопрос дня — компактная карточка НАД полем ввода */}
      {questionOfDaySlot}

      {/* Поле ввода + кнопки GIF/Идеи */}
      <VIPComposer
        onSendMessage={onSendMessage}
        onSendImage={onSendImage}
        injectInputText={injectInputText}
        onConsumedInject={onConsumedInject}
        hapticFeedback={hapticFeedback}
        onOpenGifPicker={onOpenGifPicker}
        onOpenIcebreakers={onOpenIcebreakers}
      />
    </div>
  );
};
