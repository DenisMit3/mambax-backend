'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Ban,
  Shield,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Flag,
  User,
  Zap,
  RotateCcw,
} from 'lucide-react';
import { adminApi, ModerationQueueItem } from '@/services/adminApi';
import { GlassCard } from '@/components/ui/GlassCard';
import styles from '../../admin.module.css';

// --- Константы ---

const PAGE_SIZE = 10;

const PRIORITY_STYLES: Record<string, { bg: string; color: string }> = {
  high: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' },
  medium: { bg: 'rgba(249, 115, 22, 0.15)', color: '#f97316' },
  low: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
};

/** Цвет AI-скора по порогам */
function getScoreColor(score: number): string {
  if (score >= 80) return '#ef4444';
  if (score >= 50) return '#f97316';
  return '#10b981';
}

// --- Компонент карточки репорта ---

function ReportCard({
  report,
  actionLoading,
  onAction,
}: {
  report: ModerationQueueItem;
  actionLoading: string | null;
  onAction: (id: string, action: 'approve' | 'reject' | 'ban') => void;
}) {
  const priority = PRIORITY_STYLES[report.priority] ?? PRIORITY_STYLES.low;
  const scoreColor = getScoreColor(report.ai_score);
  const isLoading = actionLoading === report.id;

  return (
    <GlassCard
      className="p-0 overflow-hidden"
      hover={false}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      layout
    >
      <div className="p-5">
        {/* Верхняя строка: приоритет + дата */}
        <div className="flex items-center justify-between mb-3">
          <span
            className="text-[11px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wide"
            style={{ background: priority.bg, color: priority.color }}
          >
            {report.priority}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-[var(--admin-text-muted)]">
            <Clock size={12} />
            {new Date(report.created_at).toLocaleDateString('ru-RU', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>

        {/* Пользователь */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br from-orange-500 to-red-500 shrink-0">
            {report.user_name?.charAt(0)?.toUpperCase() || <User size={14} />}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-[var(--admin-text-primary)] truncate">
              {report.user_name || 'Unknown'}
            </span>
            <span className="text-[11px] text-[var(--admin-text-muted)] truncate">
              ID: {report.user_id}
            </span>
          </div>
        </div>

        {/* Причина жалобы */}
        <div className="mb-3 p-3 rounded-xl bg-slate-800/40 border border-[var(--admin-glass-border)]">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--admin-text-muted)] mb-1.5">
            <AlertTriangle size={12} className="text-orange-500" />
            Причина
          </div>
          <p className="text-sm text-[var(--admin-text-primary)] leading-relaxed">
            {report.reason || 'Не указана'}
          </p>
          {report.description && (
            <p className="text-xs text-[var(--admin-text-secondary)] mt-1.5 italic">
              {report.description}
            </p>
          )}
        </div>

        {/* AI Score */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full"
              style={{ background: `${scoreColor}20`, color: scoreColor }}
            >
              <Zap size={13} />
              AI: {report.ai_score}%
            </div>
          </div>
        </div>

        {/* AI Flags — маленькие бейджи */}
        {report.ai_flags && report.ai_flags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-1">
            {report.ai_flags.map((flag) => (
              <span
                key={flag}
                className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase bg-red-500/15 text-red-400"
              >
                <Flag size={9} />
                {flag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Кнопки действий */}
      <div className="flex gap-2 p-3 bg-slate-800/30 border-t border-[var(--admin-glass-border)]">
        <button
          disabled={isLoading}
          onClick={() => onAction(report.id, 'approve')}
          className="flex-1 flex items-center justify-center gap-1.5 p-2.5 rounded-xl text-[13px] font-medium transition-all bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading && actionLoading === report.id ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <CheckCircle size={16} />
          )}
          <span className="hidden sm:inline">Dismiss</span>
        </button>
        <button
          disabled={isLoading}
          onClick={() => onAction(report.id, 'reject')}
          className="flex-1 flex items-center justify-center gap-1.5 p-2.5 rounded-xl text-[13px] font-medium transition-all bg-orange-500/15 text-orange-400 hover:bg-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading && actionLoading === report.id ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <XCircle size={16} />
          )}
          <span className="hidden sm:inline">Warn</span>
        </button>
        <button
          disabled={isLoading}
          onClick={() => onAction(report.id, 'ban')}
          className="flex-1 flex items-center justify-center gap-1.5 p-2.5 rounded-xl text-[13px] font-medium transition-all bg-red-500/15 text-red-400 hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading && actionLoading === report.id ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Ban size={16} />
          )}
          <span className="hidden sm:inline">Ban</span>
        </button>
      </div>
    </GlassCard>
  );
}

// --- Основная страница ---

export default function ReportsPage() {
  const [reports, setReports] = useState<ModerationQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  /** Загрузка списка репортов */
  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.moderation.getQueue(
        'report',
        undefined,
        'pending',
        currentPage,
        PAGE_SIZE,
      );
      setReports(res.items);
      setTotalItems(res.total);
    } catch (err) {
      console.error('Ошибка загрузки репортов:', err);
      setError(err instanceof Error ? err.message : 'Не удалось загрузить жалобы');
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  /** Обработка действия модератора */
  const handleAction = async (itemId: string, action: 'approve' | 'reject' | 'ban') => {
    setActionLoading(itemId);
    try {
      await adminApi.moderation.review(itemId, action);
      // После успешного действия — перезагружаем список
      await fetchReports();
    } catch (err) {
      console.error(`Ошибка при действии "${action}":`, err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className={styles.pageContainer}>
      {/* Заголовок */}
      <div className={styles.headerSection}>
        <div className={styles.headerContent}>
          <h1 className={styles.headerTitle}>User Reports</h1>
          <p className={styles.headerDescription}>
            Review and manage reported content and users
          </p>
        </div>
        <button
          className={styles.secondaryButton}
          onClick={fetchReports}
          disabled={loading}
        >
          <RotateCcw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Состояние загрузки */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 text-[var(--admin-text-muted)]">
          <Loader2 className="animate-spin mb-4 text-[var(--neon-purple)]" size={32} />
          <span className="text-sm">Loading reports...</span>
        </div>
      )}

      {/* Ошибка с кнопкой повтора */}
      {error && !loading && (
        <GlassCard className="flex flex-col items-center justify-center py-20 text-center border-red-500/30">
          <AlertTriangle size={32} className="text-red-500 mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Failed to load reports</h3>
          <p className="text-sm text-[var(--admin-text-secondary)] mb-6 max-w-md">{error}</p>
          <button className={styles.primaryButton} onClick={fetchReports}>
            <RotateCcw size={16} />
            Retry
          </button>
        </GlassCard>
      )}

      {/* Пустое состояние */}
      {!loading && !error && reports.length === 0 && (
        <GlassCard className="flex flex-col items-center justify-center py-24 text-center border-dashed border-[var(--admin-glass-border)]">
          <Shield size={56} className="text-[var(--admin-text-muted)] opacity-40 mb-5" />
          <h3 className="text-xl font-bold text-white mb-2">All clear!</h3>
          <p className="text-[var(--admin-text-secondary)] text-sm">
            No pending reports to review
          </p>
        </GlassCard>
      )}

      {/* Список репортов */}
      {!loading && !error && reports.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mb-6">
            <AnimatePresence mode="popLayout">
              {reports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  actionLoading={actionLoading}
                  onAction={handleAction}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Пагинация */}
          {totalPages > 1 && (
            <GlassCard className="flex items-center justify-center gap-4 p-4" hover={false}>
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all bg-slate-800/50 border border-[var(--admin-glass-border)] text-[var(--admin-text-primary)] hover:bg-slate-700/50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
                Prev
              </button>

              <span className="text-sm text-[var(--admin-text-secondary)]">
                Page{' '}
                <span className="font-semibold text-[var(--admin-text-primary)]">
                  {currentPage}
                </span>{' '}
                of{' '}
                <span className="font-semibold text-[var(--admin-text-primary)]">
                  {totalPages}
                </span>
              </span>

              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all bg-slate-800/50 border border-[var(--admin-glass-border)] text-[var(--admin-text-primary)] hover:bg-slate-700/50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </GlassCard>
          )}
        </>
      )}
    </div>
  );
}
