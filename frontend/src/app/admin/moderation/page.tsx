'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Eye,
  Image,
  MessageCircle,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Zap,
  TrendingUp,
  User,
  Ban,
  Flag,
  SkipForward,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { adminApi, ModerationQueueItem, ModerationStats } from '@/services/adminApi';
import { GlassCard } from '@/components/ui/GlassCard';
import styles from '../admin.module.css';

interface QueueItem {
  id: string;
  type: 'photo' | 'chat' | 'report';
  user_id: string;
  user_name: string;
  ai_score: number;
  ai_flags: string[];
  priority: 'high' | 'medium' | 'low';
  status: string;
  created_at: string;
  reason?: string;
  description?: string;
}

function QueueStats({ stats, loading }: { stats: ModerationStats | null; loading: boolean }) {
  const displayStats = [
    { label: 'Pending', value: stats?.pending ?? 0, icon: <Clock size={18} />, color: '#f97316' },
    { label: 'Today Reviewed', value: stats?.today_reviewed ?? 0, icon: <Eye size={18} />, color: '#3b82f6' },
    { label: 'Approved', value: stats?.approved ?? 0, icon: <CheckCircle size={18} />, color: '#10b981' },
    { label: 'Rejected', value: stats?.rejected ?? 0, icon: <XCircle size={18} />, color: '#ef4444' },
    { label: 'AI Processed', value: stats?.ai_processed ?? 0, icon: <Zap size={18} />, color: '#a855f7' },
    { label: 'Accuracy', value: stats ? `${stats.accuracy}%` : '0%', icon: <TrendingUp size={18} />, color: '#10b981' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
      {displayStats.map((stat, index) => (
        <GlassCard
          key={stat.label}
          className="flex items-center gap-3.5 p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${stat.color}20`, color: stat.color }}
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : stat.icon}
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold text-[var(--admin-text-primary)]">{loading ? '...' : stat.value}</span>
            <span className="text-xs text-[var(--admin-text-muted)]">{stat.label}</span>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

function ContentCard({ item, onAction, onSelect }: { item: QueueItem; onAction: (action: string, item: QueueItem) => void; onSelect: (item: QueueItem) => void }) {
  const priorityColors = {
    high: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' },
    medium: { bg: 'rgba(249, 115, 22, 0.15)', color: '#f97316' },
    low: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
  };

  const typeIcons = {
    photo: <Image size={16} />,
    chat: <MessageCircle size={16} />,
    report: <AlertTriangle size={16} />,
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#ef4444';
    if (score >= 50) return '#f97316';
    return '#10b981';
  };

  return (
    <GlassCard
      className="p-0 overflow-hidden group hover:border-neon-purple/30 hover:shadow-neon-purple/15 transition-all duration-300"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4 }}
      layout
    >
      {/* Content Preview */}
      <div className="relative h-[180px] flex items-center justify-center bg-slate-800/50 border-b border-[var(--admin-glass-border)] cursor-pointer" onClick={() => onSelect(item)}>
        {item.type === 'photo' && (
          <div className="flex flex-col items-center gap-2 text-[var(--admin-text-muted)]">
            <Image size={32} />
            <span className="text-xs">Photo Content</span>
          </div>
        )}
        {item.type === 'chat' && (
          <div className="flex flex-col items-center gap-3 p-5 text-center">
            <MessageCircle size={24} className="text-blue-500" />
            <p className="text-[13px] text-[var(--admin-text-muted)] italic">"{item.description || 'Chat message...'}"</p>
          </div>
        )}
        {item.type === 'report' && (
          <div className="flex flex-col items-center gap-3 p-5 text-center">
            <AlertTriangle size={24} className="text-orange-500" />
            <p className="text-[13px] text-[var(--admin-text-muted)] italic">{item.reason || 'Report submitted'}</p>
          </div>
        )}

        {/* AI Score Badge */}
        <div
          className="absolute top-3 right-3 flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-full"
          style={{
            background: `${getScoreColor(item.ai_score)}20`,
            color: getScoreColor(item.ai_score)
          }}
        >
          <Zap size={14} />
          {item.ai_score}%
        </div>
      </div>

      {/* Content Info */}
      <div className="p-4">
        <div className="flex justify-between items-center mb-3">
          <div
            className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full uppercase"
            style={{ background: `${priorityColors[item.priority]?.bg || priorityColors.low.bg}`, color: priorityColors[item.priority]?.color || priorityColors.low.color }}
          >
            {typeIcons[item.type] || typeIcons.report}
            <span>{item.type}</span>
          </div>
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-xl uppercase"
            style={priorityColors[item.priority] || priorityColors.low}
          >
            {item.priority}
          </span>
        </div>

        <div className="flex items-center gap-2.5 mb-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold text-white bg-gradient-to-br from-neon-blue to-neon-purple">
            {item.user_name?.charAt(0) || 'U'}
          </div>
          <span className="text-sm text-[var(--admin-text-primary)]">{item.user_name || 'Unknown'}</span>
        </div>

        {item.ai_flags && item.ai_flags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {item.ai_flags.map(flag => (
              <span key={flag} className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase bg-red-500/15 text-red-500">
                <Flag size={10} /> {flag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1.5 text-xs text-[var(--admin-text-secondary)]">
          <Clock size={12} />
          {new Date(item.created_at).toLocaleTimeString()}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 p-3 bg-slate-800/30 border-t border-[var(--admin-glass-border)]">
        <button
          className="flex-1 flex items-center justify-center gap-1.5 p-2.5 rounded-xl text-[13px] font-medium transition-all bg-neon-green/15 text-neon-green hover:bg-neon-green/30 hover:shadow-neon-green/30"
          onClick={() => onAction('approve', item)}
        >
          <ThumbsUp size={18} />
          <span className="hidden sm:inline">Approve</span>
        </button>
        <button
          className="flex-1 flex items-center justify-center gap-1.5 p-2.5 rounded-xl text-[13px] font-medium transition-all bg-primary-red/15 text-primary-red hover:bg-primary-red/30 hover:shadow-primary-red/30"
          onClick={() => onAction('reject', item)}
        >
          <ThumbsDown size={18} />
          <span className="hidden sm:inline">Reject</span>
        </button>
        <button
          className="flex-none p-2.5 rounded-xl text-[var(--admin-text-muted)] bg-slate-500/15 hover:bg-slate-500/30 transition-all"
          onClick={() => onAction('skip', item)}
        >
          <SkipForward size={16} />
        </button>
      </div>
    </GlassCard>
  );
}

function ReviewModal({ item, onClose, onAction }: {
  item: QueueItem;
  onClose: () => void;
  onAction: (action: string, item: QueueItem) => void;
}) {
  return (
    <motion.div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-2xl bg-[#0f172a]/95 backdrop-blur-xl border border-slate-700/30 rounded-3xl overflow-hidden"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b border-slate-700/20">
          <h3 className="text-lg font-semibold text-[var(--admin-text-primary)]">Content Review</h3>
          <button
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800/50 border border-slate-700/20 text-[var(--admin-text-muted)] hover:bg-red-500/20 hover:text-red-500 transition-all"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="p-6">
          <div className="h-[300px] flex items-center justify-center bg-slate-800/50 rounded-xl mb-5">
            {item.type === 'photo' && (
              <div className="flex flex-col items-center gap-3 text-[var(--admin-text-muted)]">
                <Image size={64} />
                <span className="text-sm">Photo Content Preview</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex justify-between py-2.5 border-b border-slate-700/10">
              <span className="text-sm text-[var(--admin-text-muted)]">Type:</span>
              <span className="text-sm font-medium text-[var(--admin-text-primary)]">{item.type}</span>
            </div>
            <div className="flex justify-between py-2.5 border-b border-slate-700/10">
              <span className="text-sm text-[var(--admin-text-muted)]">User:</span>
              <span className="text-sm font-medium text-[var(--admin-text-primary)]">{item.user_name}</span>
            </div>
            <div className="flex justify-between py-2.5 border-b border-slate-700/10">
              <span className="text-sm text-[var(--admin-text-muted)]">AI Score:</span>
              <span className="text-sm font-medium text-[var(--admin-text-primary)]">{item.ai_score}%</span>
            </div>
            <div className="flex justify-between py-2.5 border-b border-slate-700/10">
              <span className="text-sm text-[var(--admin-text-muted)]">Flags:</span>
              <span className="text-sm font-medium text-[var(--admin-text-primary)]">{item.ai_flags?.join(', ') || 'None'}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-6 bg-slate-800/30 border-t border-slate-700/20">
          <button
            className="flex-1 flex items-center justify-center gap-2 p-3.5 rounded-xl text-sm font-semibold bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all"
            onClick={() => { onAction('approve', item); onClose(); }}
          >
            <CheckCircle size={18} /> Approve
          </button>
          <button
            className="flex-1 flex items-center justify-center gap-2 p-3.5 rounded-xl text-sm font-semibold bg-orange-500/20 text-orange-500 hover:bg-orange-500 hover:text-white transition-all"
            onClick={() => { onAction('reject', item); onClose(); }}
          >
            <XCircle size={18} /> Reject
          </button>
          <button
            className="flex-1 flex items-center justify-center gap-2 p-3.5 rounded-xl text-sm font-semibold bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all"
            onClick={() => { onAction('ban', item); onClose(); }}
          >
            <Ban size={18} /> Ban User
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function ModerationPage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [filter, setFilter] = useState<'all' | 'photo' | 'chat' | 'report'>('all');
  const [priority, setPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all');
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
      setError(err instanceof Error ? err.message : 'Failed to load queue');
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
    fetchQueue();
    fetchStats();
  }, [fetchQueue, fetchStats]);

  const handleAction = async (action: string, item: QueueItem) => {
    if (action === 'skip') {
      // Just remove from local view
      setQueue(prev => prev.filter(i => i.id !== item.id));
      return;
    }

    try {
      await adminApi.moderation.review(item.id, action as 'approve' | 'reject' | 'ban');
      setQueue(prev => prev.filter(i => i.id !== item.id));
      // Refresh stats
      fetchStats();
    } catch (err) {
      console.error(`Failed to ${action} item:`, err);
    }
  };

  const handleRefresh = () => {
    fetchQueue();
    fetchStats();
  };

  const filteredQueue = queue.filter(item => {
    if (filter !== 'all' && item.type !== filter) return false;
    if (priority !== 'all' && item.priority !== priority) return false;
    return true;
  });

  return (
    <div className={styles.pageContainer}>
      {/* Header */}
      <div className={styles.headerSection}>
        <div className={styles.headerContent}>
          <h1 className={styles.headerTitle}>Content Moderation</h1>
          <p className={styles.headerDescription}>Review and moderate user-submitted content</p>
        </div>
        <div className="flex gap-3">
          <button className={styles.secondaryButton} onClick={handleRefresh}>
            <RotateCcw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <QueueStats stats={stats} loading={statsLoading} />

      {/* Filters */}
      <GlassCard className="flex flex-wrap items-center justify-between gap-4 p-4 mb-6">
        <div className="flex gap-2 p-1.5 bg-slate-800/50 rounded-xl border border-[var(--admin-glass-border)]">
          {(['all', 'photo', 'chat', 'report'] as const).map((type) => (
            <button
              key={type}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all ${filter === type
                ? 'bg-purple-500/20 text-purple-500'
                : 'text-[var(--admin-text-muted)] hover:bg-slate-700/30 hover:text-[var(--admin-text-primary)]'
                }`}
              onClick={() => { setFilter(type); setCurrentPage(1); }}
            >
              {type === 'all' && 'All'}
              {type === 'photo' && <><Image size={14} /> Photos</>}
              {type === 'chat' && <><MessageCircle size={14} /> Chat</>}
              {type === 'report' && <><AlertTriangle size={14} /> Reports</>}
              <span className={`px-2 py-0.5 rounded-md text-[11px] ${filter === type ? 'bg-purple-500/30' : 'bg-slate-700/50'}`}>
                {type === 'all'
                  ? queue.length
                  : queue.filter(i => i.type === type).length}
              </span>
            </button>
          ))}
        </div>

        <div className="relative">
          <select
            value={priority}
            onChange={(e) => { setPriority(e.target.value as any); setCurrentPage(1); }}
            className="pl-4 pr-10 py-2.5 bg-slate-800/50 border border-[var(--admin-glass-border)] rounded-xl text-sm text-[var(--admin-text-primary)] outline-none cursor-pointer hover:border-[var(--admin-glass-border-hover)] transition-colors appearance-none"
          >
            <option value="all">All Priority</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>
          <Filter size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-muted)] pointer-events-none" />
        </div>
      </GlassCard>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 text-[var(--admin-text-muted)]">
          <Loader2 className="animate-spin mb-4 text-[var(--neon-purple)]" size={32} />
          <span>Loading moderation queue...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <GlassCard className="flex flex-col items-center justify-center py-20 text-center border-red-500/30">
          <AlertTriangle size={32} className="text-red-500 mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Failed to load queue</h3>
          <p className="text-[var(--admin-text-secondary)] mb-6">{error}</p>
          <button className={styles.primaryButton} onClick={handleRefresh}>Retry</button>
        </GlassCard>
      )}

      {/* Queue Grid */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          <AnimatePresence>
            {filteredQueue.map((item) => (
              <ContentCard
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
          <h3 className="text-xl font-bold text-white mb-2">All caught up!</h3>
          <p className="text-[var(--admin-text-secondary)]">No items in the moderation queue</p>
        </GlassCard>
      )}

      {/* Review Modal */}
      <AnimatePresence>
        {selectedItem && (
          <ReviewModal
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onAction={handleAction}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
