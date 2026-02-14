'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Plus, AlertCircle, RefreshCw } from 'lucide-react';
import { adminApi } from '@/services/adminApi';
import styles from '../../admin.module.css';

import { PromoCode, PromoStats, PromoListResponse, PromoFilter } from './types';
import { PromoCodeStatsBar } from './PromoCodeStats';
import { PromoCodeCard, PromoCardSkeleton } from './PromoCodeCard';
import { PromoCodeFilters } from './PromoCodeFilters';
import { PromoCodeForm } from './PromoCodeForm';

export default function PromoCodesPage() {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [stats, setStats] = useState<PromoStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<PromoFilter>('all');

  // Загрузка данных с API
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.monetization.promoCodes.list(filter) as PromoListResponse;
      setPromoCodes(data.promo_codes);
      setStats(data.stats);
    } catch {
      setError('Не удалось загрузить промокоды');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    let cancelled = false;
    fetchData().then(() => {
      if (cancelled) return;
    });
    return () => { cancelled = true; };
  }, [fetchData]);

  // Переключение активности промокода
  const togglePromo = async (id: string) => {
    setToggling(id);
    try {
      await adminApi.monetization.promoCodes.toggle(id);
      await fetchData();
    } catch {
      // Откат не нужен — данные перезагрузятся
    } finally {
      setToggling(null);
    }
  };

  // Фильтрация на клиенте (дополнительно к серверной)
  const filteredPromos = promoCodes.filter(p => {
    if (filter === 'active') return p.is_active;
    if (filter === 'expired') return !p.is_active || new Date(p.valid_until) < new Date();
    return true;
  });

  return (
    <div className={styles.pageContainer}>
      {/* Header */}
      <div className={styles.headerSection}>
        <div className={styles.headerContent}>
          <h1 className={styles.headerTitle}>Promo Codes</h1>
          <p className={styles.headerDescription}>Create and manage discount campaigns</p>
        </div>
        <button className={styles.primaryButton} onClick={() => setShowCreateModal(true)}>
          <Plus size={16} />
          Create Code
        </button>
      </div>

      {/* Stats */}
      <PromoCodeStatsBar stats={stats} loading={loading} />

      {/* Filters */}
      <PromoCodeFilters filter={filter} onFilterChange={setFilter} />

      {/* Error state */}
      {error && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <AlertCircle size={48} className="text-red-400" />
          <p className="text-[var(--admin-text-muted)]">{error}</p>
          <button className={styles.secondaryButton} onClick={fetchData}>
            <RefreshCw size={14} />
            Повторить
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <PromoCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Promo Codes Grid */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredPromos.map((promo) => (
            <PromoCodeCard
              key={promo.id}
              promo={promo}
              onToggle={togglePromo}
              onEdit={() => { /* Promo code edit not yet implemented */ }}
              toggling={toggling}
            />
          ))}
          {filteredPromos.length === 0 && (
            <div className="col-span-full text-center py-16 text-[var(--admin-text-muted)]">
              Промокоды не найдены
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <PromoCodeForm
            onClose={() => setShowCreateModal(false)}
            onCreated={fetchData}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
