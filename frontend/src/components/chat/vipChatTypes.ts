/**
 * Общие типы и константы для VIP Chat System
 */

export interface Message {
  id: string;
  text?: string;
  image?: string;
  timestamp: Date;
  isOwn: boolean;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  type: 'text' | 'image' | 'gif' | 'super_like';
  reaction?: string;
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

export const REACTION_OPTIONS = ['👍', '👎', '❤️', '🔥', '🎉', '💩'];

export const QUICK_REACTIONS = ['👋', '😊', '😍', '🔥', '💯', '❤️'];

export const PREMIUM_GIFS = [
  'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif',
  'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
  'https://media.giphy.com/media/3o6Zt4HU9uwXmXSAuI/giphy.gif',
];

/** Форматирование "был(а) в сети" */
export const formatLastSeen = (lastSeen?: Date): string => {
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

/** Определение стиля отображения эмодзи (размер, стикер или нет) */
export const getEmojiDisplayStyle = (text: string) => {
  if (!text) return { isSticker: false, className: 'text-[15px]' };

  const hasText = /[\p{L}\p{N}]/u.test(text);
  const isOnlyEmoji = /^[\p{Extended_Pictographic}\p{S}\s]+$/u.test(text);

  if (hasText || !isOnlyEmoji) {
    return { isSticker: false, className: 'text-[17px]' };
  }

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

  if (emojiCount > 0 && !hasText) {
    if (emojiCount <= 3) return { isSticker: false, className: 'text-[28px] leading-normal tracking-widest' };
    return { isSticker: false, className: 'text-[24px] leading-normal tracking-widest' };
  }

  return { isSticker: false, className: 'text-[17px]' };
};
