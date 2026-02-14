'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, Edit, Ban } from 'lucide-react';
import { UserListItem } from '@/services/adminApi';
import { GlassCard } from '@/components/ui/GlassCard';
import { STATUS_COLORS } from './types';

interface UsersTableProps {
  users: UserListItem[];
  onAction: (action: string, user: UserListItem) => void;
  selectedUsers: Set<string>;
  onSelectUser: (userId: string) => void;
  onSelectAll: () => void;
}

// Таблица пользователей для table-режима
export function UsersTable({ users, onAction, selectedUsers, onSelectUser, onSelectAll }: UsersTableProps) {
  const router = useRouter();

  return (
    <GlassCard className="overflow-hidden border-[var(--admin-glass-border)]">
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left border-b border-[var(--admin-glass-border)]">
            <th className="p-4 w-10 bg-slate-800/50">
              <input
                type="checkbox"
                onChange={onSelectAll}
                checked={selectedUsers.size === users.length && users.length > 0}
                className="w-4 h-4 cursor-pointer accent-blue-500 rounded bg-slate-700 border-slate-600"
              />
            </th>
            <th className="p-4 text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wider bg-slate-800/50">Пользователь</th>
            <th className="p-4 text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wider bg-slate-800/50">Статус</th>
            <th className="p-4 text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wider bg-slate-800/50">Подписка</th>
            <th className="p-4 text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wider bg-slate-800/50">Локация</th>
            <th className="p-4 text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wider bg-slate-800/50">Фрод-скор</th>
            <th className="p-4 text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wider bg-slate-800/50">Последняя активность</th>
            <th className="p-4 text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wider bg-slate-800/50">Действия</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <motion.tr
              key={user.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`hover:bg-slate-800/30 border-b border-[var(--admin-glass-border)] last:border-0 ${selectedUsers.has(user.id) ? 'bg-blue-500/10' : ''}`}
            >
              <td className="p-4">
                <input
                  type="checkbox"
                  checked={selectedUsers.has(user.id)}
                  onChange={() => onSelectUser(user.id)}
                  className="w-4 h-4 cursor-pointer accent-blue-500 rounded bg-slate-700 border-slate-600"
                />
              </td>
              <td className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-semibold text-white relative shrink-0 bg-gradient-to-br from-neon-blue to-neon-purple">
                    {user.name?.charAt(0) || 'U'}
                    {user.verified && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-[var(--admin-bg)] rounded-full" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-[var(--admin-text-primary)]">{user.name}, {user.age || '?'}</span>
                    <span className="text-xs text-[var(--admin-text-muted)]">{user.email || 'Нет email'}</span>
                  </div>
                </div>
              </td>
              <td className="p-4">
                <span
                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize"
                  style={STATUS_COLORS[user.status] || STATUS_COLORS.pending}
                >
                  {user.status}
                </span>
              </td>
              <td className="p-4">
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${user.subscription === 'free' ? 'bg-slate-500/15 text-slate-400' :
                  user.subscription === 'gold' ? 'bg-orange-500/15 text-orange-500' :
                    'bg-purple-500/15 text-purple-500'
                  }`}>
                  {user.subscription}
                </span>
              </td>
              <td className="p-4 text-sm text-[var(--admin-text-secondary)]">{user.location || 'Неизвестно'}</td>
              <td className="p-4">
                <div className="flex items-center gap-2 w-[100px]">
                  <div className="h-1.5 flex-1 rounded-full bg-slate-700 overflow-hidden">
                    <div className="h-full rounded-full" style={{
                      width: `${user.fraud_score}%`,
                      background: user.fraud_score < 30 ? '#10b981' : user.fraud_score < 70 ? '#f97316' : '#ef4444'
                    }} />
                  </div>
                  <span className="text-xs text-[var(--admin-text-muted)] w-8 text-right">{user.fraud_score}%</span>
                </div>
              </td>
              <td className="p-4 text-sm text-[var(--admin-text-secondary)]">{user.last_active ? new Date(user.last_active).toLocaleDateString() : 'Никогда'}</td>
              <td className="p-4">
                <div className="flex gap-1.5">
                  <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800/50 border border-slate-700/50 text-[var(--admin-text-muted)] hover:bg-blue-500/20 hover:text-blue-500 transition-colors" onClick={() => router.push(`/admin/users/${user.id}`)}><Eye size={14} /></button>
                  <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800/50 border border-slate-700/50 text-[var(--admin-text-muted)] hover:bg-blue-500/20 hover:text-blue-500 transition-colors" onClick={() => onAction('edit', user)}><Edit size={14} /></button>
                  <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800/50 border border-slate-700/50 text-[var(--admin-text-muted)] hover:bg-red-500/20 hover:text-red-500 transition-colors" onClick={() => onAction('ban', user)}><Ban size={14} /></button>
                </div>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </GlassCard>
  );
}
