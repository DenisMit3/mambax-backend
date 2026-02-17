'use client';

/**
 * Шапка чата — компактная, как в Telegram
 * Аватар + Имя + статус + кнопки звонка/видео/меню
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Video, MoreVertical, Heart, Timer, ChevronLeft } from 'lucide-react';
import NextImage from 'next/image';
import { ChatUser, formatLastSeen } from './vipChatTypes';

interface VIPChatHeaderProps {
  user: ChatUser;
  onBack: () => void;
  onSendSuperLike: () => void;
  /** Звонки */
  onStartAudioCall?: () => void;
  onStartVideoCall?: () => void;
  /** Ephemeral mode — в меню три точки */
  ephemeralEnabled?: boolean;
  onToggleEphemeral?: (v: boolean) => void;
  ephemeralSeconds?: number;
  onChangeEphemeralSeconds?: (v: number) => void;
}

export const VIPChatHeader = ({
  user,
  onBack,
  onSendSuperLike,
  onStartAudioCall,
  onStartVideoCall,
  ephemeralEnabled = false,
  onToggleEphemeral,
  ephemeralSeconds = 10,
  onChangeEphemeralSeconds,
}: VIPChatHeaderProps) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="shrink-0 bg-[#0F0F0F] border-b border-white/10 z-30 relative">
      {/* Основная шапка — компактная, 56px */}
      <div className="flex items-center h-14 px-2 gap-1">
        {/* Кнопка назад */}
        <button
          type="button"
          onClick={onBack}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors shrink-0"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>

        {/* Аватар */}
        <div className="relative shrink-0">
          <NextImage
            src={user.photo}
            alt={user.name}
            className="w-10 h-10 rounded-full object-cover border border-white/10"
            width={40}
            height={40}
          />
          {user.isOnline && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0F0F0F]" />
          )}
        </div>

        {/* Имя + статус */}
        <div className="flex-1 min-w-0 ml-2">
          <h2 className="font-semibold text-white text-[15px] leading-tight truncate">
            {user.name}
            {user.isPremium && <span className="ml-1 text-yellow-400">👑</span>}
          </h2>
          <p className="text-xs text-white/50 leading-tight truncate">
            {user.isTyping ? 'печатает...' : user.isOnline ? 'в сети' : formatLastSeen(user.lastSeen)}
          </p>
        </div>

        {/* Кнопки справа: звонок, видео, меню */}
        <div className="flex items-center gap-0.5 shrink-0">
          {onStartAudioCall && (
            <button
              type="button"
              onClick={onStartAudioCall}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              title="Аудиозвонок"
            >
              <Phone className="w-[18px] h-[18px] text-white/70" />
            </button>
          )}
          {onStartVideoCall && (
            <button
              type="button"
              onClick={onStartVideoCall}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              title="Видеозвонок"
            >
              <Video className="w-[18px] h-[18px] text-white/70" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            title="Меню"
          >
            <MoreVertical className="w-[18px] h-[18px] text-white/70" />
          </button>
        </div>
      </div>

      {/* Выпадающее меню (три точки) */}
      <AnimatePresence>
        {showMenu && (
          <>
            {/* Оверлей для закрытия */}
            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute top-14 right-2 z-50 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden min-w-[200px]"
            >
              {/* Суперлайк */}
              <button
                type="button"
                onClick={() => { onSendSuperLike(); setShowMenu(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
              >
                <Heart className="w-4 h-4 text-red-400" />
                <span className="text-sm text-white">Суперлайк</span>
              </button>

              {/* Ephemeral mode */}
              {onToggleEphemeral && (
                <button
                  type="button"
                  onClick={() => { onToggleEphemeral(!ephemeralEnabled); setShowMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                >
                  <Timer className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-white">
                    {ephemeralEnabled ? `Исчезающие: ${ephemeralSeconds}с ✓` : 'Исчезающие сообщения'}
                  </span>
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
