'use client';

/**
 * Поле ввода сообщения с EmojiPicker и загрузкой изображений
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, Smile, Loader2, Lightbulb } from 'lucide-react';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import dynamic from 'next/dynamic';
import { Theme, Categories } from 'emoji-picker-react';
import type { EmojiClickData } from 'emoji-picker-react';

// Ленивая загрузка EmojiPicker (~100KB)
const EmojiPicker = dynamic(
  () => import('emoji-picker-react'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center max-h-[min(350px,40dvh)] h-[350px] bg-zinc-900">
        <Loader2 className="w-6 h-6 animate-spin text-white/50" />
      </div>
    ),
  }
);

interface VIPComposerProps {
  onSendMessage: (text: string) => void;
  onSendImage: (file: File) => void;
  /** Внешний текст для вставки (например, из icebreakers) */
  injectInputText?: string;
  onConsumedInject?: () => void;
  /** Callback при выборе эмодзи в режиме реакции */
  onReactionEmojiClick?: (emojiData: EmojiClickData) => void;
  /** Если true — эмодзи-пикер работает в режиме реакции */
  isReactionMode?: boolean;
  hapticFeedback: {
    impactOccurred: (style: string) => void;
    selection: () => void;
  };
  /** Открыть GIF-пикер */
  onOpenGifPicker?: () => void;
  /** Открыть модалку Идеи для разговора */
  onOpenIcebreakers?: () => void;
}

export const VIPComposer = ({
  onSendMessage,
  onSendImage,
  injectInputText,
  onConsumedInject,
  onReactionEmojiClick,
  isReactionMode = false,
  hapticFeedback,
  onOpenGifPicker,
  onOpenIcebreakers,
}: VIPComposerProps) => {
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Инъекция текста извне
  useEffect(() => {
    if (injectInputText && injectInputText.trim()) {
      setInputText(injectInputText);
      onConsumedInject?.();
    }
  }, [injectInputText, onConsumedInject]);

  // Авторесайз textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [inputText]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
    setShowEmojiPicker(false);

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
      event.target.value = '';
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    if (isReactionMode && onReactionEmojiClick) {
      onReactionEmojiClick(emojiData);
    } else {
      setInputText(prev => prev + emojiData.emoji);
      hapticFeedback.impactOccurred('light');
    }
  };

  return (
    <div className="relative shrink-0 z-50 bg-[#0F0F0F]">
      {/* Панель EmojiPicker */}
      <AnimatePresence>
        {showEmojiPicker && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-full left-0 right-0 mb-2 mx-2"
          >
            <div className="relative bg-[#1a1a1a] rounded-2xl overflow-hidden border border-white/10 shadow-2xl [&_*::-webkit-scrollbar]:hidden">
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                theme={Theme.DARK}
                width="100%"
                height="min(350px,40dvh)"
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

      {/* Поле ввода */}
      <div className="p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] border-t border-white/5">
        <div className="flex items-end gap-2">
          <div className="flex-1 min-w-0 bg-[#212121] rounded-[22px] px-1 py-1 flex items-end border border-white/5 focus-within:border-primary-red/30 transition-all min-h-[36px]">
            <AnimatedButton variant="ghost" size="sm" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="w-11 h-11 hover:bg-white/5 rounded-full shrink-0 mb-0.5">
              <Smile className="w-5 h-5 text-gray-400" />
            </AnimatedButton>
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => {
                e.target.style.height = 'auto';
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
                    autoComplete="off"
                    autoCapitalize="sentences"
                    enterKeyHint="send"
              rows={1}
              className="flex-1 bg-transparent border-none outline-none text-white text-[16px] leading-[20px] px-2 py-2 min-w-0 resize-none overflow-y-hidden scrollbar-hide placeholder:text-gray-500"
            />
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleImageUpload} accept="image/*" multiple />
            <AnimatedButton variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} className="w-9 h-9 hover:bg-white/5 rounded-full shrink-0 mb-0.5">
              <ImageIcon className="w-5 h-5 text-gray-400" />
            </AnimatedButton>
            {onOpenGifPicker && (
              <button
                type="button"
                onClick={onOpenGifPicker}
                className="w-9 h-9 flex items-center justify-center hover:bg-white/5 rounded-full shrink-0 mb-0.5 text-xs font-bold text-gray-400"
                title="GIF"
              >
                GIF
              </button>
            )}
            {onOpenIcebreakers && (
              <button
                type="button"
                onClick={onOpenIcebreakers}
                className="w-9 h-9 flex items-center justify-center hover:bg-white/5 rounded-full shrink-0 mb-0.5"
                title="Идеи для разговора"
              >
                <Lightbulb className="w-4 h-4 text-amber-400" />
              </button>
            )}
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
  );
};
