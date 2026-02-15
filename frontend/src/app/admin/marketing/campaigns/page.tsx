'use client';

// === Главная страница управления кампаниями ===

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Plus, AlertCircle, RefreshCw } from 'lucide-react';
import { adminApi } from '@/services/admin';
import styles from '../../admin.module.css';

import type { Campaign, CampaignStatsData, CampaignsResponse } from './types';
import { CampaignStats } from './CampaignStats';
import { CampaignCardSkeleton } from './CampaignStats';
import { CampaignCard } from './CampaignCard';
import { CampaignFilters } from './CampaignFilters';
import { CreateCampaignModal } from './CampaignForm';
import { CampaignDetailModal } from './CampaignDetail';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<CampaignStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  // Загрузка данных
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = (await adminApi.marketing.getCampaigns()) as CampaignsResponse;
      setCampaigns(data.campaigns);
      setStats(data.stats);
    } catch {
      setError('Не удалось загрузить кампании');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Действие над кампанией (pause/resume/send/duplicate/view)
  const handleAction = async (id: string, action: string) => {
    if (action === 'view') {
      const campaign = campaigns.find((c) => c.id === id) || null;
      setSelectedCampaign(campaign);
      return;
    }
    setActionLoading(id);
    try {
      await adminApi.marketing.updateCampaign(id, action);
      await fetchData();
    } catch {
      // Ошибка — данные перезагрузятся
    } finally {
      setActionLoading(null);
    }
  };

  // Фильтрация на клиенте
  const filteredCampaigns = campaigns.filter((c) => {
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    if (filterType !== 'all' && c.type !== filterType) return false;
    return true;
  });

  return (
    <div className={styles.pageContainer}>
      {/* Заголовок */}
      <div className={styles.headerSection}>
        <div className={styles.headerContent}>
          <h1 className={styles.headerTitle}>Campaign Manager</h1>
          <p className={styles.headerDescription}>Create and manage marketing campaigns</p>
        </div>
        <button className={styles.primaryButton} onClick={() => setShowCreate(true)}>
          <Plus size={16} />
          New Campaign
        </button>
      </div>

      {/* Статистика */}
      <CampaignStats stats={stats} loading={loading} />

      {/* Фильтры */}
      <CampaignFilters
        filterStatus={filterStatus}
        filterType={filterType}
        onStatusChange={setFilterStatus}
        onTypeChange={setFilterType}
      />

      {/* Ошибка */}
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

      {/* Скелетон загрузки */}
      {loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <CampaignCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Сетка кампаний */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredCampaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onAction={handleAction}
              actionLoading={actionLoading}
            />
          ))}
          {filteredCampaigns.length === 0 && (
            <div className="col-span-full text-center py-16 text-[var(--admin-text-muted)]">
              Кампании не найдены
            </div>
          )}
        </div>
      )}

      {/* Модалки */}
      <AnimatePresence>
        {showCreate && (
          <CreateCampaignModal
            onClose={() => setShowCreate(false)}
            onCreated={fetchData}
          />
        )}
        {selectedCampaign && (
          <CampaignDetailModal
            campaign={selectedCampaign}
            onClose={() => setSelectedCampaign(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
