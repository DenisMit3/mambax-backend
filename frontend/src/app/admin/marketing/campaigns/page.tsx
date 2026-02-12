'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Megaphone,
  Mail,
  Bell,
  MessageSquare,
  MousePointerClick,
  Target,
  Calendar,
  Plus,
  Play,
  Pause,
  Copy,
  BarChart3,
  ChevronRight,
  Send,
  Clock,
  CheckCircle,
  Users,
  X,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { adminApi } from '@/services/adminApi';
import styles from '../../admin.module.css';

// === Интерфейсы (snake_case от API) ===

interface Campaign {
  id: string;
  name: string;
  type: 'push' | 'email' | 'sms' | 'in_app';
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed';
  target_segment: string;
  sent?: number;
  delivered?: number;
  opened?: number;
  clicked?: number;
  converted?: number;
  open_rate?: number;
  ctr?: number;
  conversion_rate?: number;
  created_at: string;
  scheduled_at?: string;
  completed_at?: string;
}

interface CampaignStatsData {
  active: number;
  total_sent_week: number;
  avg_open_rate: number;
  conversions: number;
}

interface CampaignsResponse {
  campaigns: Campaign[];
  stats: CampaignStatsData;
}

// === Утилиты ===

function formatNumber(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toString();
}

// === Скелетон загрузки ===

function CampaignCardSkeleton() {
  return (
    <GlassCard className="p-6 animate-pulse">
      <div className="flex justify-between items-center mb-4">
        <div className="h-7 w-20 bg-slate-700/40 rounded-full" />
        <div className="h-6 w-16 bg-slate-700/40 rounded-full" />
      </div>
      <div className="h-5 w-48 bg-slate-700/40 rounded mb-2" />
      <div className="h-4 w-32 bg-slate-700/40 rounded mb-4" />
      <div className="grid grid-cols-4 gap-3 py-4 border-t border-b border-slate-700/20 mb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="h-5 w-10 bg-slate-700/40 rounded" />
            <div className="h-3 w-8 bg-slate-700/40 rounded" />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <div className="h-8 w-20 bg-slate-700/40 rounded-lg" />
        <div className="h-8 w-24 bg-slate-700/40 rounded-lg" />
      </div>
    </GlassCard>
  );
}

// === Компонент статистики ===

function CampaignStats({ stats, loading }: { stats: CampaignStatsData | null; loading: boolean }) {
  const items = [
    { label: 'Active Campaigns', value: stats ? stats.active.toString() : '—', icon: <Megaphone size={18} />, color: '#10b981' },
    { label: 'Total Sent (Week)', value: stats ? formatNumber(stats.total_sent_week) : '—', icon: <Send size={18} />, color: '#3b82f6' },
    { label: 'Avg Open Rate', value: stats ? `${stats.avg_open_rate}%` : '—', icon: <MousePointerClick size={18} />, color: '#a855f7' },
    { label: 'Conversions', value: stats ? formatNumber(stats.conversions) : '—', icon: <Target size={18} />, color: '#f59e0b' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {items.map((stat) => (
        <GlassCard
          key={stat.label}
          className={`p-5 flex items-center gap-4 ${loading ? 'animate-pulse' : ''}`}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${stat.color}20`, color: stat.color }}
          >
            {stat.icon}
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-[var(--admin-text-primary)]">{stat.value}</span>
            <span className="text-xs text-[var(--admin-text-muted)]">{stat.label}</span>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

// === Карточка кампании ===

const typeConfig = {
  push: { icon: <Bell size={16} />, label: 'Push', color: '#a855f7' },
  email: { icon: <Mail size={16} />, label: 'Email', color: '#3b82f6' },
  sms: { icon: <MessageSquare size={16} />, label: 'SMS', color: '#10b981' },
  in_app: { icon: <Megaphone size={16} />, label: 'In-App', color: '#f59e0b' },
};

const statusConfig: Record<string, { color: string; bg: string }> = {
  draft: { color: '#64748b', bg: 'rgba(100, 116, 139, 0.15)' },
  scheduled: { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  active: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  paused: { color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)' },
  completed: { color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)' },
};

function CampaignCard({
  campaign,
  onAction,
  actionLoading,
}: {
  campaign: Campaign;
  onAction: (id: string, action: string) => void;
  actionLoading: string | null;
}) {
  const type = typeConfig[campaign.type];
  const status = statusConfig[campaign.status];
  const isLoading = actionLoading === campaign.id;

  return (
    <GlassCard className={`p-6 ${isLoading ? 'opacity-60 pointer-events-none' : ''}`} hover>
      {/* Тип + статус */}
      <div className="flex justify-between items-center mb-4">
        <span
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{ backgroundColor: `${type.color}20`, color: type.color }}
        >
          {type.icon}
          {type.label}
        </span>
        <span
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold capitalize"
          style={{ backgroundColor: status.bg, color: status.color }}
        >
          {campaign.status === 'active' && (
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          )}
          {campaign.status}
        </span>
      </div>

      {/* Название */}
      <h3 className="text-lg font-semibold text-[var(--admin-text-primary)] mb-2">{campaign.name}</h3>

      {/* Сегмент */}
      <div className="flex items-center gap-2 text-sm text-slate-500 capitalize mb-4">
        <Users size={14} />
        <span>{campaign.target_segment.replace(/_/g, ' ')}</span>
      </div>

      {/* Метрики */}
      {campaign.sent != null && (
        <div className="grid grid-cols-4 gap-3 py-4 border-t border-b border-[var(--admin-glass-border)] mb-4">
          <div className="text-center">
            <span className="block text-base font-bold text-[var(--admin-text-primary)]">
              {formatNumber(campaign.sent)}
            </span>
            <span className="text-[10px] text-slate-500">Sent</span>
          </div>
          <div className="text-center">
            <span className="block text-base font-bold text-[var(--admin-text-primary)]">
              {campaign.open_rate ?? 0}%
            </span>
            <span className="text-[10px] text-slate-500">Open Rate</span>
          </div>
          <div className="text-center">
            <span className="block text-base font-bold text-[var(--admin-text-primary)]">
              {campaign.ctr ?? 0}%
            </span>
            <span className="text-[10px] text-slate-500">CTR</span>
          </div>
          <div className="text-center">
            <span className="block text-base font-bold text-[var(--admin-text-primary)]">
              {campaign.converted ?? 0}
            </span>
            <span className="text-[10px] text-slate-500">Converted</span>
          </div>
        </div>
      )}

      {/* Запланировано */}
      {campaign.scheduled_at && (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-blue-500/10 rounded-xl text-blue-400 text-sm mb-4">
          <Calendar size={14} />
          <span>Scheduled: {new Date(campaign.scheduled_at).toLocaleString()}</span>
        </div>
      )}

      {/* Действия */}
      <div className="flex gap-2 flex-wrap">
        {campaign.status === 'draft' && (
          <button
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:bg-slate-700/50 transition-colors"
            onClick={() => onAction(campaign.id, 'send')}
          >
            <Send size={14} /> Send Now
          </button>
        )}
        {campaign.status === 'active' && (
          <button
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-orange-500/15 border border-orange-500/30 text-orange-400 hover:bg-orange-500/25 transition-colors"
            onClick={() => onAction(campaign.id, 'pause')}
          >
            <Pause size={14} /> Pause
          </button>
        )}
        {campaign.status === 'paused' && (
          <button
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition-colors"
            onClick={() => onAction(campaign.id, 'resume')}
          >
            <Play size={14} /> Resume
          </button>
        )}
        {campaign.status === 'completed' && (
          <button
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-purple-500/15 border border-purple-500/30 text-purple-400 hover:bg-purple-500/25 transition-colors"
            onClick={() => onAction(campaign.id, 'duplicate')}
          >
            <Copy size={14} /> Duplicate
          </button>
        )}
        <button
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:bg-slate-700/50 hover:text-slate-200 transition-colors"
          onClick={() => onAction(campaign.id, 'view')}
        >
          <BarChart3 size={14} /> Analytics
        </button>
      </div>
    </GlassCard>
  );
}

// === Модалка создания кампании (2-step wizard) ===

const campaignTypes = [
  { id: 'push' as const, label: 'Push Notification', icon: <Bell size={24} />, desc: 'Send instant mobile notifications' },
  { id: 'email' as const, label: 'Email Campaign', icon: <Mail size={24} />, desc: 'Create email marketing campaigns' },
  { id: 'in_app' as const, label: 'In-App Message', icon: <Megaphone size={24} />, desc: 'Display messages within the app' },
  { id: 'sms' as const, label: 'SMS Campaign', icon: <MessageSquare size={24} />, desc: 'Send text message campaigns' },
];

function CreateCampaignModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    type: '' as '' | 'push' | 'email' | 'sms' | 'in_app',
    name: '',
    title: '',
    body: '',
    subject: '',
    preview_text: '',
    target_segment: 'all',
  });

  const update = (patch: Partial<typeof formData>) => setFormData(prev => ({ ...prev, ...patch }));

  // Отправка формы
  const handleSubmit = async () => {
    if (!formData.name || !formData.type) return;
    setSubmitting(true);
    setError(null);
    try {
      await adminApi.marketing.createCampaign({
        type: formData.type,
        name: formData.name,
        target_segment: formData.target_segment,
        // Дополнительные поля в зависимости от типа
        ...(formData.type === 'push' && { title: formData.title, body: formData.body }),
        ...(formData.type === 'email' && { subject: formData.subject, preview_text: formData.preview_text }),
        ...(formData.type === 'in_app' && { body: formData.body }),
        ...(formData.type === 'sms' && { body: formData.body }),
      });
      onCreated();
      onClose();
    } catch {
      setError('Не удалось создать кампанию. Попробуйте ещё раз.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = 'w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-sm text-[var(--admin-text-primary)] focus:outline-none focus:border-purple-500 placeholder:text-slate-600';

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/80 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[600px]"
      >
        <GlassCard className="w-full max-h-[90vh] overflow-y-auto">
          {/* Заголовок */}
          <div className="flex justify-between items-center p-5 border-b border-[var(--admin-glass-border)]">
            <h3 className="text-xl font-semibold text-[var(--admin-text-primary)]">Create New Campaign</h3>
            <button className={styles.iconButton} onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          {/* Тело */}
          <div className="p-6">
            {error && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {/* Шаг 1: Выбор типа */}
            {step === 1 && (
              <div>
                <h4 className="text-base text-slate-400 mb-4">Select Campaign Type</h4>
                <div className="grid grid-cols-2 gap-3">
                  {campaignTypes.map((t) => (
                    <div
                      key={t.id}
                      className={`p-5 rounded-2xl cursor-pointer text-center transition-all duration-200 border-2 ${
                        formData.type === t.id
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-transparent bg-slate-800/40 hover:bg-slate-800/60'
                      }`}
                      onClick={() => update({ type: t.id })}
                    >
                      <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                        {t.icon}
                      </div>
                      <span className="block text-sm font-semibold text-[var(--admin-text-primary)] mb-1">{t.label}</span>
                      <span className="text-xs text-slate-500">{t.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Шаг 2: Детали кампании */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs text-[var(--admin-text-muted)]">Campaign Name</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={formData.name}
                    onChange={(e) => update({ name: e.target.value })}
                    placeholder="e.g. Spring Sale Push"
                  />
                </div>

                {formData.type === 'push' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs text-[var(--admin-text-muted)]">Notification Title</label>
                      <input
                        type="text"
                        className={inputClass}
                        value={formData.title}
                        onChange={(e) => update({ title: e.target.value })}
                        placeholder="You have a new match! 💕"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-[var(--admin-text-muted)]">Message Body</label>
                      <textarea
                        className={`${inputClass} resize-none`}
                        rows={3}
                        value={formData.body}
                        onChange={(e) => update({ body: e.target.value })}
                        placeholder="Someone special is waiting..."
                      />
                    </div>
                  </>
                )}

                {formData.type === 'email' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs text-[var(--admin-text-muted)]">Email Subject</label>
                      <input
                        type="text"
                        className={inputClass}
                        value={formData.subject}
                        onChange={(e) => update({ subject: e.target.value })}
                        placeholder="Don't miss out!"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-[var(--admin-text-muted)]">Preview Text</label>
                      <input
                        type="text"
                        className={inputClass}
                        value={formData.preview_text}
                        onChange={(e) => update({ preview_text: e.target.value })}
                        placeholder="Special offer inside..."
                      />
                    </div>
                  </>
                )}

                {(formData.type === 'sms' || formData.type === 'in_app') && (
                  <div className="space-y-2">
                    <label className="text-xs text-[var(--admin-text-muted)]">Message Body</label>
                    <textarea
                      className={`${inputClass} resize-none`}
                      rows={3}
                      value={formData.body}
                      onChange={(e) => update({ body: e.target.value })}
                      placeholder="Your message..."
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs text-[var(--admin-text-muted)]">Target Segment</label>
                  <select
                    className={inputClass}
                    value={formData.target_segment}
                    onChange={(e) => update({ target_segment: e.target.value })}
                  >
                    <option value="all">All Users</option>
                    <option value="active">Active Users (7d)</option>
                    <option value="inactive">Inactive Users (30d+)</option>
                    <option value="premium">Premium Users</option>
                    <option value="free">Free Users</option>
                    <option value="high_activity">High Activity Free Users</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Футер */}
          <div className="flex justify-end gap-3 p-5 border-t border-[var(--admin-glass-border)]">
            {step > 1 && (
              <button className={styles.secondaryButton} onClick={() => setStep(1)} disabled={submitting}>
                Back
              </button>
            )}
            {step === 1 && formData.type && (
              <button className={styles.primaryButton} onClick={() => setStep(2)}>
                Continue <ChevronRight size={16} />
              </button>
            )}
            {step === 2 && (
              <button
                className={styles.primaryButton}
                onClick={handleSubmit}
                disabled={submitting || !formData.name}
              >
                {submitting ? 'Creating...' : 'Create Campaign'}
              </button>
            )}
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}

// === Главная страница ===

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<CampaignStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');

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

  // Действие над кампанией (pause/resume/send/duplicate)
  const handleAction = async (id: string, action: string) => {
    if (action === 'view') return; // TODO: навигация на аналитику
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
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-400">Status:</label>
          <select
            className="px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-[var(--admin-text-primary)] focus:outline-none focus:border-purple-500"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-400">Type:</label>
          <select
            className="px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-[var(--admin-text-primary)] focus:outline-none focus:border-purple-500"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="push">Push</option>
            <option value="email">Email</option>
            <option value="in_app">In-App</option>
            <option value="sms">SMS</option>
          </select>
        </div>
      </div>

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

      {/* Модалка создания */}
      <AnimatePresence>
        {showCreate && (
          <CreateCampaignModal
            onClose={() => setShowCreate(false)}
            onCreated={fetchData}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
