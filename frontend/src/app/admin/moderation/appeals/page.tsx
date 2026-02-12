'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  User,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { adminApi, ModerationQueueItem } from '@/services/adminApi';
import { GlassCard } from '@/components/ui/GlassCard';
import styles from '../../admin.module.css';

// Цвета приоритетов
const priorityConfig: Record<string, { bg: string; color: string; label: string }> = {
  high: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', label: 'High' },
  medium: { bg: 'rgba(249, 115, 22, 0.15)', color: '#f97316', label: 'Medium' },
  low: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', label: 'Low' },
};

// Скелетон загрузки
function AppealSkeleton() {
  return (
    <GlassCard className="p-5" hover={false}>
      <div className="animate-pulse flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-700/50" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 bg-slate-700/50 rounded" />
            <div className="h-3 w-20 bg-slate-700/50 rounded" />
          </div>
          <div className="h-5 w-16 bg-slate-700/50 rounded-full" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-full bg-slate-700/50 rounded" />
          <div className="h-3 w-3/4 bg-slate-700/50 rounded" />
        </div>
        <div className="flex gap-2 pt-2">
          <div className="flex-1 h-10 bg-slate-700/50 rounded-xl" />
          <div className="flex-1 h-10 bg-slate-700/50 rounded-xl" />
        </div>
      </div>
    </GlassCard>
  );
}

// Карточка апелляции
function AppealCard({
  item,
  onAction,
  actionLoading,
}: {
  item: ModerationQueueItem;
  onAction: (id: string, action: 'approve' | 'reject') => void;
  actionLoading: string | null;
}) {
  const priority = priorityConfig[item.priority] || priorityConfig.low;
  const isLoading = actionLoading === item.id;

  return (
    <GlassCard
      className="p-0 overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      layout
    >
      {/* Шапка карточки */}
      <div className="p-5 pb-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-semibold text-white bg-gradient-to-br from-neon-blue to-neon-purple shrink-0">
            {item.user_name?.charAt(0)?.toUpperCase() || <User size={16} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--admin-text-primary)] truncate">
              {item.user_name || 'Unknown User'}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-[var(--admin-text-muted)]">
              <Clock size={12} />
              {new Date(item.created_at).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
          {/* Бейдж приоритета */}
          <span
            className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide shrink-0"
            style={{ background: priority.bg, color: priority.color }}
          >
            {priority.label}
          </span>
        </div>

        {/* Причина апелляции */}
        {item.reason && (
          <div className="mb-2">
            <p className="text-xs font-medium text-[var(--admin-text-muted)] uppercase tracking-wide mb-1">
              Причина
            </p>
            <p className="text-sm text-[var(--admin-text-primary)]">{item.reason}</p>
          </div>
        )}

        {/* Описание */}
        {item.description && (
          <div>
            <p className="text-xs font-medium text-[var(--admin-text-muted)] uppercase tracking-wide mb-1">
              Описание
            </p>
            <p className="text-sm text-[var(--admin-text-secondary)] line-clamp-3">
              {item.description}
            </p>
          </div>
        )}

        {/* Если нет ни причины, ни описания */}
        {!item.reason && !item.description && (
          <p className="text-sm text-[var(--admin-text-muted)] italic">
            Нет дополнительной информации
          </p>
        )}
      </div>

      {/* Кнопки действий */}
      <div className="flex gap-2 p-3 bg-slate-800/30 border-t border-[var(--admin-glass-border)]">
        <button
          className="flex-1 flex items-center justify-center gap-1.5 p-2.5 rounded-xl text-[13px] font-medium transition-all bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => onAction(item.id, 'approve')}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
          Одобрить
        </button>
        <button
          className="flex-1 flex items-center justify-center gap-1.5 p-2.5 rounded-xl text-[13px] font-medium transition-all bg-red-500/15 text-red-400 hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => onAction(item.id, 'reject')}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
          Отклонить
        </button>
      </div>
    </GlassCard>
  );
}

export default function AppealsPage() {
  const [appeals, setAppeals] = useState<ModerationQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Загрузка апелляций
  const fetchAppeals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminApi.moderation.getQueue('appeal', undefined, 'pending');
      setAppeals(response.items);
    } catch (err) {
      console.error('Ошибка загрузки апелляций:', err);
      setError(err instanceof Error ? err.message : 'Не удалось загрузить апелляции');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppeals();
  }, [fetchAppeals]);

  // Обработка действия (одобрить / отклонить)
  const handleAction = async (itemId: string, action: 'approve' | 'reject') => {
    setActionLoading(itemId);
    try {
      await adminApi.moderation.review(itemId, action);
      // Убираем из списка после успешного действия
      setAppeals((prev) => prev.filter((a) => a.id !== itemId));
    } catch (err) {
      console.error(`Ошибка при выполнении действия ${action}:`, err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className={styles.pageContainer}>
      {/* Заголовок */}
      <div className={styles.headerSection}>
        <div className={styles.headerContent}>
          <h1 className={styles.headerTitle}>Ban Appeals</h1>
          <p className={styles.headerDescription}>
            Рассмотрение апелляций пользователей на блокировку
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-blue-500/15 text-blue-400">
            {loading ? '...' : `${appeals.length} Pending`}
          </span>
          <button className={styles.secondaryButton} onClick={fetchAppeals} disabled={loading}>
            <RotateCcw size={16} className={loading ? 'animate-spin' : ''} />
            Обновить
          </button>
        </div>
      </div>

      {/* Состояние загрузки */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <AppealSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Ошибка */}
      {!loading && error && (
        <GlassCard className="flex flex-col items-center justify-center py-20 text-center border-red-500/30" hover={false}>
          <AlertTriangle size={40} className="text-red-500 mb-4" />
          <h3 className="text-lg font-bold text-[var(--admin-text-primary)] mb-2">
            Ошибка загрузки
          </h3>
          <p className="text-sm text-[var(--admin-text-secondary)] mb-6 max-w-md">{error}</p>
          <button className={styles.primaryButton} onClick={fetchAppeals}>
            <RotateCcw size={16} />
            Повторить
          </button>
        </GlassCard>
      )}

      {/* Список апелляций */}
      {!loading && !error && appeals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          <AnimatePresence mode="popLayout">
            {appeals.map((item) => (
              <AppealCard
                key={item.id}
                item={item}
                onAction={handleAction}
                actionLoading={actionLoading}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Пустое состояние */}
      {!loading && !error && appeals.length === 0 && (
        <GlassCard
          className="flex flex-col items-center justify-center py-24 text-center border-dashed border-[var(--admin-glass-border)]"
          hover={false}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Shield size={56} className="text-[var(--admin-text-muted)] opacity-40 mb-5" />
          <h3 className="text-xl font-bold text-[var(--admin-text-primary)] mb-2">
            Нет активных апелляций
          </h3>
          <p className="text-sm text-[var(--admin-text-secondary)] max-w-sm">
            На данный момент нет апелляций, требующих рассмотрения
          </p>
        </GlassCard>
      )}
    </div>
  );
}
