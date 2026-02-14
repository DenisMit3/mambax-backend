'use client';

import { useRouter } from 'next/navigation';
import {
  Eye, Edit, UserCheck, UserX, Ban, Trash2,
  MapPin, Calendar, Heart, MessageCircle,
  Shield, Crown, CheckCircle,
} from 'lucide-react';
import { UserListItem } from '@/services/adminApi';
import { GlassCard } from '@/components/ui/GlassCard';
import {
  STATUS_COLORS, SUBSCRIPTION_COLORS,
  FRAUD_COLORS, getFraudLevel,
} from './types';

interface UserCardProps {
  user: UserListItem;
  onAction: (action: string, user: UserListItem) => void;
}

// Карточка пользователя для grid-режима
export function UserCard({ user, onAction }: UserCardProps) {
  const router = useRouter();
  const fraudLevel = getFraudLevel(user.fraud_score);

  return (
    <GlassCard className="p-5 flex flex-col h-full bg-[var(--admin-glass-bg)] hover:bg-[var(--admin-glass-bg-hover)] border-[var(--admin-glass-border)]">
      {/* Шапка: аватар + имя + статус + подписка */}
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-semibold text-white relative shrink-0 bg-gradient-to-br from-neon-blue to-neon-purple">
          {user.name?.charAt(0) || 'U'}
          {user.verified && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-[var(--admin-bg)] rounded-full flex items-center justify-center text-white">
              <CheckCircle size={12} />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-[15px] font-semibold text-[var(--admin-text-primary)] truncate">{user.name}, {user.age || '?'}</h4>
            <span
              className="px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide"
              style={STATUS_COLORS[user.status] || STATUS_COLORS.pending}
            >
              {user.status}
            </span>
          </div>
          <div className="flex gap-3">
            <span className="flex items-center gap-1 text-xs text-[var(--admin-text-muted)]">
              <MapPin size={12} /> {user.location || 'Неизвестно'}
            </span>
            <span className="flex items-center gap-1 text-xs text-[var(--admin-text-muted)]">
              <Calendar size={12} /> {new Date(user.registered_at).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase whitespace-nowrap"
          style={SUBSCRIPTION_COLORS[user.subscription] || SUBSCRIPTION_COLORS.free}
        >
          {user.subscription === 'platinum' && <Crown size={12} />}
          {SUBSCRIPTION_COLORS[user.subscription]?.label || 'Бесплатный'}
        </div>
      </div>

      {/* Статистика: матчи, сообщения, фрод-скор */}
      <div className="flex gap-4 py-3 border-y border-[var(--admin-glass-border)] mb-3">
        <div className="flex items-center gap-1.5 text-[13px] text-[var(--admin-text-muted)]">
          <Heart size={14} className="text-pink-500" />
          <span>{user.matches}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[13px] text-[var(--admin-text-muted)]">
          <MessageCircle size={14} className="text-blue-500" />
          <span>{user.messages}</span>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: FRAUD_COLORS[fraudLevel] }}>
          <Shield size={14} />
          <span>{user.fraud_score}%</span>
        </div>
      </div>

      {/* Кнопки действий */}
      <div className="flex gap-2 mt-auto">
        <button className="flex-1 h-9 flex items-center justify-center rounded-lg bg-slate-800/50 border border-slate-700/50 text-[var(--admin-text-muted)] hover:bg-blue-500/20 hover:text-blue-500 hover:border-blue-500/30 transition-all" onClick={() => router.push(`/admin/users/${user.id}`)}>
          <Eye size={16} />
        </button>
        <button className="flex-1 h-9 flex items-center justify-center rounded-lg bg-slate-800/50 border border-slate-700/50 text-[var(--admin-text-muted)] hover:bg-blue-500/20 hover:text-blue-500 hover:border-blue-500/30 transition-all" onClick={() => onAction('edit', user)}>
          <Edit size={16} />
        </button>
        {user.status === 'active' ? (
          <button className="flex-1 h-9 flex items-center justify-center rounded-lg bg-slate-800/50 border border-slate-700/50 text-[var(--admin-text-muted)] hover:bg-orange-500/20 hover:text-orange-500 hover:border-orange-500/30 transition-all" onClick={() => onAction('suspend', user)}>
            <UserX size={16} />
          </button>
        ) : (
          <button className="flex-1 h-9 flex items-center justify-center rounded-lg bg-slate-800/50 border border-slate-700/50 text-[var(--admin-text-muted)] hover:bg-emerald-500/20 hover:text-emerald-500 hover:border-emerald-500/30 transition-all" onClick={() => onAction('activate', user)}>
            <UserCheck size={16} />
          </button>
        )}
        <button className="flex-1 h-9 flex items-center justify-center rounded-lg bg-slate-800/50 border border-slate-700/50 text-[var(--admin-text-muted)] hover:bg-red-500/20 hover:text-red-500 hover:border-red-500/30 transition-all" onClick={() => onAction('ban', user)} title="Забанить">
          <Ban size={16} />
        </button>
        <button className="flex-1 h-9 flex items-center justify-center rounded-lg bg-slate-800/50 border border-slate-700/50 text-[var(--admin-text-muted)] hover:bg-red-500/20 hover:text-red-500 hover:border-red-500/30 transition-all" onClick={() => onAction('delete', user)} title="Удалить из базы">
          <Trash2 size={16} />
        </button>
      </div>
    </GlassCard>
  );
}
