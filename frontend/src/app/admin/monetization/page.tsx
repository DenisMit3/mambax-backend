'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  TrendingUp,
  RefreshCw,
  Calendar,
  Download,
  Target,
  BarChart3,
  AlertTriangle,
} from 'lucide-react';
import { adminApi, RevenueMetrics } from '@/services/adminApi';
import { GlassCard } from '@/components/ui/GlassCard';
import styles from '../admin.module.css';

import { MonetizationMetricCard } from './MonetizationMetricCard';
import { MonetizationRevenueChart } from './MonetizationRevenueChart';
import { MonetizationSubscriptionDistribution } from './MonetizationSubscriptionDistribution';
import { MonetizationRevenueSources } from './MonetizationRevenueSources';
import { MonetizationTransactionsTable } from './MonetizationTransactionsTable';
import { MonetizationKeyMetrics } from './MonetizationKeyMetrics';

export default function MonetizationPage() {
  const [revenueMetrics, setRevenueMetrics] = useState<RevenueMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trendData, setTrendData] = useState<{ date: string; revenue: number }[]>([]);
  const [period, setPeriod] = useState("30d");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [metrics, trend] = await Promise.all([
        adminApi.monetization.getRevenue(),
        adminApi.monetization.getTrend(period)
      ]);
      setRevenueMetrics(metrics);
      setTrendData(trend.trend);
    } catch (err) {
      console.error('Error fetching monetization data:', err);
      setError(err instanceof Error ? err.message : 'Не удалось загрузить данные монетизации');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    let cancelled = false;
    fetchData().then(() => {
      if (cancelled) return;
    });
    return () => { cancelled = true; };
  }, [fetchData]);

  // Данные для графика из тренда
  const chartData = trendData.length > 0
    ? trendData.map(d => ({
      day: new Date(d.date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      value: d.revenue
    })).slice(-7)
    : [
      { day: 'Mon', value: 0 },
      { day: 'Tue', value: 0 },
      { day: 'Wed', value: 0 },
      { day: 'Thu', value: 0 },
      { day: 'Fri', value: 0 },
      { day: 'Sat', value: 0 },
      { day: 'Sun', value: 0 },
    ];

  return (
    <div className={styles.pageContainer}>
      {/* Заголовок */}
      <div className={styles.headerSection}>
        <div className={styles.headerContent}>
          <h1 className={styles.headerTitle}>Панель доходов</h1>
          <p className={styles.headerDescription}>Отслеживайте финансовые показатели платформы</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/50 border border-[var(--admin-glass-border)] rounded-xl text-[var(--admin-text-primary)]">
            <Calendar size={16} className="text-[var(--admin-text-muted)]" />
            <select
              className="bg-transparent border-none text-sm outline-none cursor-pointer"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="7d">Последние 7 дней</option>
              <option value="30d">Последние 30 дней</option>
              <option value="90d">Последние 90 дней</option>
            </select>
          </div>
          <button className={styles.secondaryButton} onClick={fetchData}>
            <RefreshCw size={16} />
            Обновить
          </button>
          <button className={styles.secondaryButton}>
            <Download size={16} />
            Экспорт
          </button>
        </div>
      </div>

      {/* Ошибка */}
      {error && (
        <GlassCard className="flex items-center gap-3 p-4 mb-6 border-primary-red/30 text-primary-red">
          <AlertTriangle size={20} />
          <span>{error}</span>
          <button
            onClick={fetchData}
            className="ml-auto px-3 py-1.5 bg-primary-red/10 border border-primary-red/20 rounded-lg text-sm hover:bg-primary-red/20 transition-colors"
          >
            Повторить
          </button>
        </GlassCard>
      )}

      {/* Карточки метрик */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <MonetizationMetricCard
          title="Доход за сегодня"
          value={`$${(revenueMetrics?.today || 0).toLocaleString()}`}
          change={18.7}
          icon={<DollarSign size={20} />}
          color="#10b981"
          loading={loading}
        />
        <MonetizationMetricCard
          title="Доход за неделю"
          value={`$${(revenueMetrics?.week || 0).toLocaleString()}`}
          change={12.3}
          icon={<TrendingUp size={20} />}
          color="#3b82f6"
          loading={loading}
        />
        <MonetizationMetricCard
          title="Доход за месяц"
          value={`$${(revenueMetrics?.month || 0).toLocaleString()}`}
          change={8.5}
          icon={<BarChart3 size={20} />}
          color="#a855f7"
          loading={loading}
        />
        <MonetizationMetricCard
          title="Доход за год"
          value={`$${(revenueMetrics?.year || 0).toLocaleString()}`}
          change={24.2}
          icon={<Target size={20} />}
          color="#ec4899"
          loading={loading}
        />
      </div>

      {/* Графики */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        <div className="xl:col-span-2 h-[350px]">
          <MonetizationRevenueChart data={chartData} />
        </div>
        <div className="h-[350px]">
          <MonetizationSubscriptionDistribution
            subscriptions={revenueMetrics?.subscription_breakdown || null}
            loading={loading}
          />
        </div>
      </div>

      {/* Источники дохода + Ключевые метрики */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MonetizationRevenueSources
          sources={revenueMetrics?.revenue_sources || []}
          loading={loading}
        />
        <MonetizationKeyMetrics revenueMetrics={revenueMetrics} />
      </div>

      {/* Таблица транзакций */}
      <MonetizationTransactionsTable />
    </div>
  );
}
