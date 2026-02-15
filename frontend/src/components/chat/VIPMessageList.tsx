'use client';

/**
 * Список сообщений чата с типинг-индикатором
 * Включает реакции, группировку и отображение медиа
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star } from 'lucide-react';
import NextImage from 'next/image';
import { useRef, useEffect } from 'react';
import { FALLBACK_AVATAR } from '@/lib/constants';
import { Message, REACTION_OPTIONS, getEmojiDisplayStyle } from './vipChatTypes';
import { VIPMessageBubble } from './VIPMessageBubble';

interface VIPMessageListProps {
  messages: Message[];
  isTyping: boolean;
  activeReactionId: string | null;
  onSetActiveReactionId: (id: string | null) => void;
  onReaction?: (id: string, reaction: string) => void;
  onOpenReactionPicker: (messageId: string) => void;
  onViewImage: (url: string) => void;
  hapticFeedback: {
    impactOccurred: (style: string) => void;
    selection: () => void;
  };
  /** Optional slot rendered at the top of the scroll area */
  toolbarSlot?: React.ReactNode;
}

export const VIPMessageList = ({
  messages,
  isTyping,
  activeReactionId,
  onSetActiveReactionId,
  onReaction,
  onOpenReactionPicker,
  onViewImage,
  hapticFeedback,
  toolbarSlot,
}: VIPMessageListProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Автоскролл при новых сообщениях / печати
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 min-h-0 scrollbar-hide">
      {/* Toolbar slot (QuestionOfTheDay + ChatToolbar) — scrolls with messages */}
      {toolbarSlot}

      <AnimatePresence>
        {messages.map((message, index) => {
          // Стиль эмодзи
          const emojiStyle = message.type !== 'super_like' && !message.image
            ? getEmojiDisplayStyle(message.text || '')
            : { isSticker: false, className: 'text-[15px]' };

          // Позиция в группе
          const prev = messages[index - 1];
          const next = messages[index + 1];
          const isStart = !prev || prev.isOwn !== message.isOwn;
          const isEnd = !next || next.isOwn !== message.isOwn;

          let groupPosition: 'single' | 'start' | 'middle' | 'end' = 'single';
          if (isStart && !isEnd) groupPosition = 'start';
          else if (!isStart && !isEnd) groupPosition = 'middle';
          else if (!isStart && isEnd) groupPosition = 'end';

          return (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, delay: index * 0.05, ease: 'easeOut' }}
              className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'} cursor-pointer`}
              onClick={() => {
                if (activeReactionId === message.id) onSetActiveReactionId(null);
                else {
                  onSetActiveReactionId(message.id);
                  hapticFeedback.selection();
                }
              }}
            >
              <div
                className="max-w-[80%] select-none relative"
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  if (onReaction) {
                    const newReaction = message.reaction === '❤️' ? '' : '❤️';
                    onReaction(message.id, newReaction);
                    hapticFeedback.impactOccurred('medium');
                  }
                }}
              >
                {/* Меню реакций */}
                <AnimatePresence>
                  {activeReactionId === message.id && (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0, y: 10 }}
                      animate={{ scale: 1, opacity: 1, y: -45 }}
                      exit={{ scale: 0.8, opacity: 0, y: 10 }}
                      className={`absolute top-0 ${message.isOwn ? 'right-0' : 'left-0'} z-50 flex items-center bg-[#212121]/90 backdrop-blur-xl border border-white/10 rounded-full p-1 shadow-2xl gap-1`}
                      onClick={e => e.stopPropagation()}
                    >
                      {REACTION_OPTIONS.map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => {
                            if (onReaction) onReaction(message.id, emoji === message.reaction ? '' : emoji);
                            onSetActiveReactionId(null);
                            hapticFeedback.selection();
                          }}
                          className={`w-9 h-9 flex items-center justify-center text-xl hover:bg-white/10 rounded-full transition-transform active:scale-90 ${message.reaction === emoji ? 'bg-white/10' : ''}`}
                        >
                          {emoji}
                        </button>
                      ))}
                      {/* Кнопка "+" — открыть полный пикер */}
                      <button
                        onClick={() => {
                          onOpenReactionPicker(message.id);
                          onSetActiveReactionId(null);
                        }}
                        className="w-9 h-9 flex items-center justify-center text-white hover:bg-white/10 rounded-full transition-transform active:scale-90"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19"></line>
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Пузырь сообщения */}
                <VIPMessageBubble
                  isOwn={message.isOwn}
                  isSticker={emojiStyle.isSticker}
                  timestamp={message.timestamp}
                  status={message.status || 'read'}
                  groupPosition={groupPosition}
                  reaction={message.reaction}
                >
                  {message.type === 'super_like' ? (
                    <div className="flex items-center space-x-2 text-blue-400">
                      <Star className="w-5 h-5 fill-blue-400" />
                      <span className="font-bold text-base">СУПЕРЛАЙК!</span>
                    </div>
                  ) : message.image ? (
                    <NextImage
                      src={message.image}
                      alt="Media"
                      className="max-w-full h-auto rounded-2xl cursor-zoom-in"
                      width={300}
                      height={400}
                      unoptimized
                      onLoad={() => scrollToBottom()}
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewImage(message.image || '');
                      }}
                      onError={(e) => {
                        console.error("Image load error:", message.image);
                        e.currentTarget.src = FALLBACK_AVATAR;
                      }}
                    />
                  ) : (
                    <p className={`leading-relaxed whitespace-pre-wrap ${emojiStyle.className}`}>{message.text}</p>
                  )}
                </VIPMessageBubble>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Индикатор печати */}
      <AnimatePresence>
        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex justify-start"
          >
            <div className="p-4 rounded-3xl backdrop-blur-xl border border-white/10 bg-gradient-to-r from-purple-500/20 to-pink-500/20">
              <div className="flex space-x-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 bg-white rounded-full"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div ref={messagesEndRef} />
    </div>
  );
};
