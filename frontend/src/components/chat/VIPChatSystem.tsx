'use client';

/**
 * VIP Chat System Component
 * 
 * TODO (PERF): For chats with 1000+ messages, implement virtualization
 * using react-window or @tanstack/virtual to prevent DOM overload.
 * Currently renders all messages which can cause scroll lag.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect, Suspense } from 'react';
import { Send, Image, Smile, Heart, Star, Crown, Check, CheckCheck, Clock, X, Loader2 } from 'lucide-react';
import { useTelegram } from '@/lib/telegram';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { GlassCard } from '@/components/ui/GlassCard';
import dynamic from 'next/dynamic';

// FIX (BUNDLE): Lazy load EmojiPicker (~100KB) - only loads when emoji panel opens
const EmojiPicker = dynamic(
  () => import('emoji-picker-react'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[350px] bg-zinc-900">
        <Loader2 className="w-6 h-6 animate-spin text-white/50" />
      </div>
    )
  }
);
import { Theme, Categories } from 'emoji-picker-react';
import type { EmojiClickData } from 'emoji-picker-react';

export interface Message {
  id: string;
  text?: string;
  image?: string;
  timestamp: Date;
  isOwn: boolean;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  type: 'text' | 'image' | 'gif' | 'super_like';
  reaction?: string; // Emoji reaction
}

export interface ChatUser {
  id: string;
  name: string;
  photo: string;
  isOnline: boolean;
  lastSeen?: Date;
  isTyping: boolean;
  isPremium: boolean;
}

interface VIPChatSystemProps {
  user: ChatUser;
  messages: Message[];
  isPremium: boolean;
  onSendMessage: (text: string) => void;
  onSendImage: (file: File) => void;
  onSendSuperLike: () => void;
  onReaction?: (id: string, reaction: string) => void;
  onBack: () => void;
}

const REACTION_OPTIONS = ['👍', '👎', '❤️', '🔥', '🎉', '💩'];

const QUICK_REACTIONS = ['👋', '😊', '😍', '🔥', '💯', '❤️'];
const PREMIUM_GIFS = [
  'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif',
  'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
  'https://media.giphy.com/media/3o6Zt4HU9uwXmXSAuI/giphy.gif'
];

// Format last seen timestamp to human-readable string
const formatLastSeen = (lastSeen?: Date): string => {
  if (!lastSeen) return 'был(а) недавно';

  const now = new Date();
  const date = lastSeen instanceof Date ? lastSeen : new Date(lastSeen);

  if (isNaN(date.getTime())) return 'был(а) недавно';

  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'только что';
  if (diffMins < 5) return 'был(а) только что';
  if (diffMins < 60) return `был(а) ${diffMins} мин. назад`;
  if (diffHours < 24) return `был(а) ${diffHours} ч. назад`;
  if (diffDays === 1) return 'был(а) вчера';
  if (diffDays < 7) return `был(а) ${diffDays} дн. назад`;

  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
};

// Telegram-style message bubble component
const MessageBubble = ({
  children,
  isOwn,
  isSticker = false,
  timestamp,
  status = 'read',
  groupPosition = 'single',
  reaction
}: {
  children: React.ReactNode,
  isOwn: boolean,
  isSticker?: boolean,
  timestamp?: Date | string,
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed',
  groupPosition?: 'single' | 'start' | 'middle' | 'end',
  reaction?: string
}) => {
  // Format timestamp safely with fallback
  const formatTime = (ts: Date | string | undefined) => {
    try {
      const date = ts ? (ts instanceof Date ? ts : new Date(ts)) : new Date();
      if (isNaN(date.getTime())) return new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }
  };

  const timeString = formatTime(timestamp);

  // Dynamic Border Radius based on group position
  const borderRadius = (() => {
    const rL = '18px'; // Large Radius
    const rS = '4px';  // Small Radius

    if (isOwn) {
      if (groupPosition === 'start') return `${rL} ${rL} ${rS} ${rL}`;
      if (groupPosition === 'middle') return `${rL} ${rS} ${rS} ${rL}`;
      if (groupPosition === 'end') return `${rL} ${rS} ${rL} ${rL}`;
      return `${rL} ${rL} ${rL} ${rL}`; // Single
    } else {
      if (groupPosition === 'start') return `${rL} ${rL} ${rL} ${rS}`;
      if (groupPosition === 'middle') return `${rS} ${rL} ${rL} ${rS}`;
      if (groupPosition === 'end') return `${rS} ${rL} ${rL} ${rL}`;
      return `${rL} ${rL} ${rL} ${rL}`; // Single
    }
  })();

  const marginBottom = (groupPosition === 'start' || groupPosition === 'middle') ? 'mb-[2px]' : 'mb-1.5';
  const showTail = !isSticker && (groupPosition === 'single' || groupPosition === 'end');

  // ... (omitted) ...

  // Premium Glass design with "Float" timestamp (Telegram Style)
  return (
    <div className={`flex w-full ${isOwn ? 'justify-end' : 'justify-start'} ${marginBottom}`}>
      <div className={`relative max-w-[98%] group ${isOwn ? 'mr-1' : 'ml-1'}`}>
        {/* Main bubble */}
        <div
          style={{ borderRadius }}
          className={`relative px-3 py-1.5 shadow-sm border border-white/5 transition-all ${isOwn
            ? 'bg-primary-red/90'
            : 'bg-[#2A2A2A]'
            }`}
        >
          {/* Content with Floating Timestamp */}
          <div
            className="text-white text-[16px] leading-[22px] break-words relative text-left whitespace-pre-wrap w-fit"
          >
            {children}

            {/* Floating Timestamp - sits on the last line if possible */}
            <span className={`float-right ml-2 mt-1 -mr-1 flex items-center gap-0.5 select-none ${isOwn ? 'text-white/70' : 'text-gray-400'
              }`}>
              <span className="text-[11px] font-medium tracking-tight flex items-center">{timeString}</span>
              {isOwn && (
                <span className="flex items-center ml-0.5 h-[14px]">
                  {(status === 'delivered' || status === 'read') ? (
                    <span className="flex">
                      <Check className="w-3 h-3 -mr-1" />
                      <Check className="w-3 h-3" />
                    </span>
                  ) : (
                    status === 'sent' ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />
                  )}
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Tail - SVG for organic look (Only if showTail) */}
        {showTail && (
          isOwn ? (
            <svg className="absolute bottom-0 right-[-6px] w-[9px] h-[16px] fill-primary-red/90" viewBox="0 0 11 20">
              <path d="M0 20C2.5 16 5 10 5 0L5 20H0Z" />
            </svg>
          ) : (
            <svg className="absolute bottom-0 left-[-6px] w-[9px] h-[16px] fill-[#2A2A2A] -scale-x-100" viewBox="0 0 11 20">
              <path d="M0 20C2.5 16 5 10 5 0L5 20H0Z" />
            </svg>
          )
        )}

        {/* Visual Reaction - Telegram Style */}
        <AnimatePresence>
          {reaction && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className={`absolute -bottom-2 ${isOwn ? '-left-2' : '-right-2'} z-20 bg-[#212121] rounded-full px-1.5 py-0.5 border border-white/10 shadow-sm flex items-center justify-center min-w-[24px]`}
            >
              <span className="text-[14px] leading-none">{reaction}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export const VIPChatSystem = ({
  user,
  messages,
  isPremium,
  onSendMessage,
  onSendImage,
  onSendSuperLike,
  onReaction,
  onBack
}: VIPChatSystemProps) => {
  const { hapticFeedback } = useTelegram();
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeReactionId, setActiveReactionId] = useState<string | null>(null);
  const [reactingToMessageId, setReactingToMessageId] = useState<string | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, user?.isTyping]);

  // Auto-resize textarea when input text changes (handles typing AND emoji picker)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      // No height restriction as requested - Infinite expansion
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [inputText]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
    setShowEmojiPicker(false); // Close picker on send

    // Reset textarea height manually
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    hapticFeedback.impactOccurred('light');
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        onSendImage(file);
      });
      hapticFeedback.impactOccurred('medium');
      // Clear input so same files can be selected again if needed
      event.target.value = '';
    }
  };

  // Handle emoji picker selection (Keep open for multiple selection)
  const handleEmojiClick = (emojiData: EmojiClickData) => {
    if (reactingToMessageId) {
      if (onReaction) onReaction(reactingToMessageId, emojiData.emoji);
      setReactingToMessageId(null);
      setActiveReactionId(null);
      hapticFeedback.selection();
    } else {
      setInputText(prev => prev + emojiData.emoji);
      hapticFeedback.impactOccurred('light');
    }
  };

  // Telegram emoji size rules:
  // 1 emoji = HUGE (no bubble)
  // 2 emojis = Large (no bubble)  
  // 3 emojis = Big (no bubble)
  // 4+ emojis or emoji+text = Normal with bubble
  const getEmojiDisplayStyle = (text: string) => {
    if (!text) return { isSticker: false, className: 'text-[15px]' };

    // Check if text contains any letters or numbers (not emoji-only)
    const hasText = /[\p{L}\p{N}]/u.test(text);
    // Check if text is only emojis and whitespace
    const isOnlyEmoji = /^[\p{Extended_Pictographic}\p{S}\s]+$/u.test(text);

    if (hasText || !isOnlyEmoji) {
      return { isSticker: false, className: 'text-[17px]' };
    }

    // Count actual emoji characters (not whitespace)
    let emojiCount = 0;
    try {
      if (typeof Intl !== 'undefined' && Intl.Segmenter) {
        const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
        const segments = [...segmenter.segment(text)];
        emojiCount = segments.filter(s => s.segment.trim().length > 0).length;
      } else {
        emojiCount = [...text.replace(/\s/g, '')].length;
      }
    } catch {
      emojiCount = text.replace(/\s/g, '').length;
    }

    // Standardized Emoji Sizing (Always in bubble, consistent)
    // "Make it as it should be" -> Uniform look
    if (emojiCount > 0 && !hasText) {
      if (emojiCount <= 3) return { isSticker: false, className: 'text-[28px] leading-normal tracking-widest' };
      return { isSticker: false, className: 'text-[24px] leading-normal tracking-widest' };
    }

    // Default text size
    return { isSticker: false, className: 'text-[17px]' };
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: Message['status']) => {
    switch (status) {
      case 'sending': return <Clock className="w-3 h-3 text-gray-400" />;
      case 'sent': return <Check className="w-3 h-3 text-gray-400" />;
      case 'delivered': return <CheckCheck className="w-3 h-3 text-gray-400" />;
      case 'read': return <CheckCheck className="w-3 h-3 text-blue-400" />;
    }
  };

  return (
    <div className={`flex flex-col h-full bg-[#0F0F0F] font-sans ${isPremium ? 'text-white' : 'text-gray-900'}`}>

      {/* Custom Reaction Picker Modal */}
      <AnimatePresence>
        {reactingToMessageId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setReactingToMessageId(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#1a1a1a] rounded-3xl overflow-hidden w-full max-w-sm shadow-2xl border border-white/10 [&_*::-webkit-scrollbar]:hidden"
              onClick={e => e.stopPropagation()}
            >
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                theme={Theme.DARK}
                width="100%"
                height={400}
                searchPlaceHolder="Поиск реакции..."
                previewConfig={{ showPreview: false }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {viewingImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[150] bg-black/95 backdrop-blur-md flex items-center justify-center p-1"
            onClick={() => setViewingImage(null)}
          >
            <motion.img
              src={viewingImage}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="max-w-full max-h-[90vh] object-contain rounded-md shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              onClick={() => setViewingImage(null)}
            >
              <X className="w-8 h-8" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header - Plus 30 Percent Size */}
      <motion.div
        className="flex items-center justify-between p-5 border-b border-white/10 shrink-0 bg-[#0F0F0F]"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center space-x-4">
          <AnimatedButton variant="ghost" size="sm" onClick={onBack} className="mr-0 -ml-1">
            <span className="text-3xl text-gray-300 pb-1">‹</span>
          </AnimatedButton>
          <div className="relative">
            <img src={user.photo} alt={user.name} className="w-16 h-16 rounded-full object-cover border-2 border-white/10" />
            {user.isOnline && (
              <div className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-green-500 rounded-full border-[3px] border-black" />
            )}
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center space-x-2">
              <h2 className="font-bold text-white text-2xl leading-none">{user.name}</h2>
              {user.isPremium && <Crown className="w-6 h-6 text-yellow-400" />}
            </div>
            <p className="text-[16px] text-blue-400/90 font-medium leading-tight">
              {user.isTyping ? 'печатает...' : user.isOnline ? 'в сети' : formatLastSeen(user.lastSeen)}
            </p>
          </div>
        </div>
        <AnimatedButton variant="ghost" size="sm" onClick={onSendSuperLike} className="bg-red-500/10 text-red-500 w-12 h-12 rounded-2xl flex items-center justify-center">
          <Heart className="w-7 h-7 fill-red-500" />
        </AnimatedButton>
      </motion.div>

      {/* Messages - Like AI Chat */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0 scrollbar-hide">
        <AnimatePresence>
          {messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, delay: index * 0.05, ease: 'easeOut' }}
              className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'} cursor-pointer`}
              onClick={(e) => {
                // "Tap to the right" - User wants tap ANYWHERE on the row to toggle menu?
                // Or just on the bubble? Let's enabling toggling on the row for ease
                if (activeReactionId === message.id) setActiveReactionId(null);
                else {
                  setActiveReactionId(message.id);
                  hapticFeedback.selection();
                }
              }}
            >
              <div
                className="max-w-[80%] select-none relative"
                onDoubleClick={(e) => {
                  e.stopPropagation(); // Prevent toggling menu on double click if possible
                  if (onReaction) {
                    const newReaction = message.reaction === '❤️' ? '' : '❤️';
                    onReaction(message.id, newReaction);
                    hapticFeedback.impactOccurred('medium');
                  }
                }}
              >
                {/* Reaction Menu */}
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
                            setActiveReactionId(null);
                            hapticFeedback.selection();
                          }}
                          className={`w-9 h-9 flex items-center justify-center text-xl hover:bg-white/10 rounded-full transition-transform active:scale-90 ${message.reaction === emoji ? 'bg-white/10' : ''}`}
                        >
                          {emoji}
                        </button>
                      ))}
                      {/* Plus Button */}
                      <button
                        onClick={() => {
                          setReactingToMessageId(message.id);
                          // Keep activeReactionId open? No, close menu, open modal
                          setActiveReactionId(null);
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

                {/* Message Bubble - Telegram Style */}
                {(() => {
                  // Use the centralized emoji display style function
                  const emojiStyle = message.type !== 'super_like' && !message.image
                    ? getEmojiDisplayStyle(message.text || '')
                    : { isSticker: false, className: 'text-[15px]' };

                  // Calculate group position
                  let groupPosition: 'single' | 'start' | 'middle' | 'end' = 'single';
                  const prev = messages[index - 1];
                  const next = messages[index + 1];
                  const isStart = !prev || prev.isOwn !== message.isOwn;
                  const isEnd = !next || next.isOwn !== message.isOwn;

                  if (isStart && isEnd) groupPosition = 'single';
                  else if (isStart && !isEnd) groupPosition = 'start';
                  else if (!isStart && !isEnd) groupPosition = 'middle';
                  else if (!isStart && isEnd) groupPosition = 'end';

                  return (
                    <MessageBubble
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
                        <img
                          src={message.image}
                          alt="Media"
                          className="max-w-full h-auto rounded-2xl cursor-zoom-in"
                          onLoad={() => scrollToBottom()}
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingImage(message.image || null);
                          }}
                          onError={(e) => {
                            console.error("Image load error:", message.image);
                            e.currentTarget.src = "https://placehold.co/400x400/red?text=Load+Error";
                          }}
                        />
                      ) : (
                        <p className={`leading-relaxed whitespace-pre-wrap ${emojiStyle.className}`}>{message.text}</p>
                      )}
                    </MessageBubble>
                  );
                })()}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing Indicator */}
        <AnimatePresence>
          {user.isTyping && (
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

      {/* Input Area Wrapper with Emoji Picker Anchored */}
      <div className="relative shrink-0 z-50 bg-[#0F0F0F]">
        {/* Emoji Picker Panel (Now relative to input wrapper) */}
        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-full left-0 right-0 mb-2 mx-2"
            >
              {/* Added [&_*::-webkit-scrollbar]:hidden to hide inner scrollbars */}
              <div className="relative bg-[#1a1a1a] rounded-2xl overflow-hidden border border-white/10 shadow-2xl [&_*::-webkit-scrollbar]:hidden">
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  theme={Theme.DARK}
                  width="100%"
                  height={350}
                  searchPlaceHolder="Поиск эмодзи..."
                  skinTonesDisabled={false}
                  lazyLoadEmojis={true}
                  previewConfig={{ showPreview: false }}
                  categories={[
                    { category: Categories.SUGGESTED, name: 'Недавние' },
                    { category: Categories.SMILEYS_PEOPLE, name: 'Смайлы' },
                    { category: Categories.ANIMALS_NATURE, name: 'Животные' },
                    { category: Categories.FOOD_DRINK, name: 'Еда' },
                    { category: Categories.TRAVEL_PLACES, name: 'Путешествия' },
                    { category: Categories.ACTIVITIES, name: 'Активности' },
                    { category: Categories.OBJECTS, name: 'Объекты' },
                    { category: Categories.SYMBOLS, name: 'Символы' },
                    { category: Categories.FLAGS, name: 'Флаги' },
                  ]}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Area - Compact & Premium */}
        <div className="p-2 pb-6 border-t border-white/5">
          <div className="flex items-end gap-2">
            <div className="flex-1 bg-[#212121] rounded-[22px] px-1 py-1 flex items-end border border-white/5 focus-within:border-primary-red/30 transition-all min-h-[36px]">
              <AnimatedButton variant="ghost" size="sm" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="w-8 h-8 hover:bg-white/5 rounded-full shrink-0 mb-0.5">
                <Smile className="w-5 h-5 text-gray-400" />
              </AnimatedButton>
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => {
                  e.target.style.height = 'auto';
                  // No height restriction as requested
                  e.target.style.height = e.target.scrollHeight + 'px';
                  setInputText(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Сообщение..."
                rows={1}
                className="flex-1 bg-transparent border-none outline-none text-white text-[16px] leading-[20px] px-2 py-2 min-w-0 resize-none overflow-y-hidden scrollbar-hide placeholder:text-gray-500"
              />
              <input type="file" ref={fileInputRef} className="hidden" onChange={handleImageUpload} accept="image/*" multiple />
              <AnimatedButton variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} className="w-8 h-8 hover:bg-white/5 rounded-full shrink-0 mb-0.5">
                <Image className="w-5 h-5 text-gray-400" />
              </AnimatedButton>
            </div>
            <AnimatedButton
              className={`w-12 h-12 rounded-[1.25rem] flex items-center justify-center flex-shrink-0 transition-all ${inputText.trim() ? 'bg-primary-red shadow-lg shadow-primary-red/20' : 'bg-white/5'}`}
              onClick={handleSend}
            >
              <Send className={`w-5 h-5 text-white transition-all ${inputText.trim() ? 'scale-110' : 'opacity-40'}`} />
            </AnimatedButton>
          </div>
        </div>
      </div>
    </div>
  );
};

