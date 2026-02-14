'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { adminApi, ModerationStats as ModerationStatsType } from '@/services/adminApi';
import { GlassCard } from '@/components/ui/GlassCard';
import styles from '../admin.module.css';

import type { QueueItem, ContentFilter, PriorityFilter } from './types';
import { ModerationStats } from './ModerationStats';
import { ModerationContentCard } from './ModerationContentCard';
import { ModerationReviewModal } from './ModerationReviewModal';
import { ModerationFilters } from './ModerationFilters';

export default function ModerationPage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<ModerationStatsType | null>(null);
  const [filter, setFilter] = useState<ContentFilter>('all');
  const [priority, setPriority] = useState<PriorityFilter>('all');
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 20;

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminApi.moderation.getQueue(
        filter !== 'all' ? filter : undefined,
        priority !== 'all' ? priority : undefined,
        'pending',
        currentPage,
        pageSize
      );

      const mappedItems: QueueItem[] = response.items.map(item => ({
        id: item.id,
        type: item.type as 'photo' | 'chat' | 'report',
        user_id: item.user_id,
        user_name: item.user_name,
        ai_score: item.ai_score,
        ai_flags: item.ai_flags,
        priority: item.priority as 'high' | 'medium' | 'low',
        status: item.status,
        created_at: item.created_at,
        reason: item.reason,
        description: item.description,
      }));

      setQueue(mappedItems);
      setTotalItems(response.total);
    } catch (err) {
      console.error('Error fetching moderation queue:', err);
      setError(err instanceof Error ? err.message : 'Не удалось загрузить очередь');
    } finally {
      setLoading(false);
    }
  }, [filter, priority, currentPage, pageSize]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const statsData = await adminApi.moderation.getStats();
      setStats(statsData);
    } catch (err) {
      console.error('Error fetching moderation stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchQueue(), fetchStats()]).then(() => {
      if (cancelled) return;
    });
    return () => { cancelled = true; };
  }, [fetchQueue, fetchStats]);

  const handleAction = async (action: string, item: QueueItem) => {
    if (action === 'skip') {
      setQueue(prev => prev.filter(i => i.id !== item.id));
      return;
    }

    try {
      await adminApi.moderation.review(item.id, action as 'approve' | 'reject' | 'ban');
      setQueue(prev => prev.filter(i => i.id !== item.id));
      fetchStats();
    } catch (err) {
      console.error(`Failed to ${action} item:`, err);
    }
  };

  const handleRefresh = () => {
    fetchQueue();
    fetchStats();
  };

  const handleFilterChange = (newFilter: ContentFilter) => {
    setFilter(newFilter);
    setCurrentPage(1);
  };

  const handlePriorityChange = (newPriority: PriorityFilter) => {
    setPriority(newPriority);
    setCurrentPage(1);
  };

  const filteredQueue = queue.filter(item => {
    if (filter !== 'all' && item.type !== filter) return false;
    if (priority !== 'all' && item.priority !== priority) return false;
    return true;
  });

  return (
    <div className={styles.pageContainer}>
      {/* Заголовок */}
      <div className={styles.headerSection}>
        <div className={styles.headerContent}>
          <h1 className={styles.headerTitle}>Модерация контента</h1>
          <p className={styles.headerDescription}>Проверка и модерация пользовательского контента</p>
        </div>
        <div className="flex gap-3">
          <button className={styles.secondaryButton} onClick={handleRefresh}>
            <RotateCcw size={16} />
            Обновить
          </button>
        </div>
      </div>

      {/* Статистика */}
      <ModerationStats stats={stats} loading={statsLoading} />

      {/* Фильтры */}
      <ModerationFilters
        filter={filter}
        priority={priority}
        queue={queue}
        onFilterChange={handleFilterChange}
        onPriorityChange={handlePriorityChange}
      />

      {/* Загрузка */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 text-[var(--admin-text-muted)]">
          <Loader2 className="animate-spin mb-4 text-[var(--neon-purple)]" size={32} />
          <span>Загрузка очереди модерации...</span>
        </div>
      )}

      {/* Ошибка */}
      {error && (
        <GlassCard className="flex flex-col items-center justify-center py-20 text-center border-red-500/30">
          <AlertTriangle size={32} className="text-red-500 mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Не удалось загрузить очередь</h3>
          <p className="text-[var(--admin-text-secondary)] mb-6">{error}</p>
          <button className={styles.primaryButton} onClick={handleRefresh}>Повторить</button>
        </GlassCard>
      )}

      {/* Сетка очереди */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          <AnimatePresence>
            {filteredQueue.map((item) => (
              <ModerationContentCard
                key={item.id}
                item={item}
                onAction={handleAction}
                onSelect={setSelectedItem}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {!loading && !error && filteredQueue.length === 0 && (
        <GlassCard className="flex flex-col items-center justify-center py-24 text-center border-dashed border-[var(--admin-glass-border)]">
          <CheckCircle size={64} className="text-[var(--admin-text-muted)] opacity-50 mb-6" />
          <h3 className="text-xl font-bold text-white mb-2">Всё проверено!</h3>
          <p className="text-[var(--admin-text-secondary)]">Нет элементов в очереди модерации</p>
        </GlassCard>
      )}

      {/* Модалка ревью */}
      <AnimatePresence>
        {selectedItem && (
          <ModerationReviewModal
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onAction={handleAction}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
