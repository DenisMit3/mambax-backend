'use client';

/**
 * Пузырь сообщения в стиле Telegram
 * Поддерживает группировку, хвосты, реакции и плавающий таймстамп
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Check, Clock } from 'lucide-react';

interface MessageBubbleProps {
  children: React.ReactNode;
  isOwn: boolean;
  isSticker?: boolean;
  timestamp?: Date | string;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  groupPosition?: 'single' | 'start' | 'middle' | 'end';
  reaction?: string;
}

/** Безопасное форматирование времени */
const formatTime = (ts: Date | string | undefined) => {
  try {
    const date = ts ? (ts instanceof Date ? ts : new Date(ts)) : new Date();
    if (isNaN(date.getTime())) return new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }
};

/** Динамический border-radius в зависимости от позиции в группе */
const getBorderRadius = (isOwn: boolean, groupPosition: string) => {
  const rL = '18px';
  const rS = '4px';

  if (isOwn) {
    if (groupPosition === 'start') return `${rL} ${rL} ${rS} ${rL}`;
    if (groupPosition === 'middle') return `${rL} ${rS} ${rS} ${rL}`;
    if (groupPosition === 'end') return `${rL} ${rS} ${rL} ${rL}`;
    return `${rL} ${rL} ${rL} ${rL}`;
  } else {
    if (groupPosition === 'start') return `${rL} ${rL} ${rL} ${rS}`;
    if (groupPosition === 'middle') return `${rS} ${rL} ${rL} ${rS}`;
    if (groupPosition === 'end') return `${rS} ${rL} ${rL} ${rL}`;
    return `${rL} ${rL} ${rL} ${rL}`;
  }
};

export const VIPMessageBubble = ({
  children,
  isOwn,
  isSticker = false,
  timestamp,
  status = 'read',
  groupPosition = 'single',
  reaction,
}: MessageBubbleProps) => {
  const timeString = formatTime(timestamp);
  const borderRadius = getBorderRadius(isOwn, groupPosition);
  const marginBottom = (groupPosition === 'start' || groupPosition === 'middle') ? 'mb-[2px]' : 'mb-1.5';
  const showTail = !isSticker && (groupPosition === 'single' || groupPosition === 'end');

  return (
    <div className={`flex w-full ${isOwn ? 'justify-end' : 'justify-start'} ${marginBottom}`}>
      <div className={`relative max-w-[98%] group ${isOwn ? 'mr-1' : 'ml-1'}`}>
        {/* Основной пузырь */}
        <div
          style={{ borderRadius }}
          className={`relative px-3 py-1.5 shadow-sm border border-white/5 transition-all ${isOwn
            ? 'bg-primary-red/90'
            : 'bg-[#2A2A2A]'
          }`}
        >
          {/* Контент с плавающим таймстампом */}
          <div className="text-white text-[16px] leading-[22px] break-words relative text-left whitespace-pre-wrap w-fit">
            {children}

            {/* Плавающий таймстамп */}
            <span className={`float-right ml-2 mt-1 -mr-1 flex items-center gap-0.5 select-none ${isOwn ? 'text-white/70' : 'text-gray-400'}`}>
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

        {/* Хвост пузыря — SVG */}
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

        {/* Реакция в стиле Telegram */}
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
