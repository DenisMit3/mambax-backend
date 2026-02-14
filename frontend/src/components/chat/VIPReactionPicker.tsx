'use client';

/**
 * Модальное окно выбора реакции через EmojiPicker
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Theme } from 'emoji-picker-react';
import type { EmojiClickData } from 'emoji-picker-react';

// Ленивая загрузка EmojiPicker (~100KB)
const EmojiPicker = dynamic(
  () => import('emoji-picker-react'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[350px] bg-zinc-900">
        <Loader2 className="w-6 h-6 animate-spin text-white/50" />
      </div>
    ),
  }
);

interface VIPReactionPickerProps {
  /** ID сообщения, к которому выбирается реакция */
  reactingToMessageId: string | null;
  onEmojiClick: (emojiData: EmojiClickData) => void;
  onClose: () => void;
}

export const VIPReactionPicker = ({ reactingToMessageId, onEmojiClick, onClose }: VIPReactionPickerProps) => {
  return (
    <AnimatePresence>
      {reactingToMessageId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-[#1a1a1a] rounded-3xl overflow-hidden w-full max-w-sm shadow-2xl border border-white/10 [&_*::-webkit-scrollbar]:hidden"
            onClick={e => e.stopPropagation()}
          >
            <EmojiPicker
              onEmojiClick={onEmojiClick}
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
  );
};
