'use client';

/**
 * Шапка VIP чата — аватар, имя, статус, кнопка суперлайка
 */

import { motion } from 'framer-motion';
import { Heart, Crown } from 'lucide-react';
import NextImage from 'next/image';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { ChatUser, formatLastSeen } from './vipChatTypes';

interface VIPChatHeaderProps {
  user: ChatUser;
  onBack: () => void;
  onSendSuperLike: () => void;
}

export const VIPChatHeader = ({ user, onBack, onSendSuperLike }: VIPChatHeaderProps) => {
  return (
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
          <NextImage src={user.photo} alt={user.name} className="w-16 h-16 rounded-full object-cover border-2 border-white/10" width={64} height={64} unoptimized />
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
  );
};
