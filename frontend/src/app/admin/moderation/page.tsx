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
    <div className="queue-stats">
      {displayStats.map((stat, index) => (
        <motion.div
          key={stat.label}
          className="stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <div className="stat-icon" style={{ background: `${stat.color}20`, color: stat.color }}>
            {loading ? <Loader2 className="spinner" size={18} /> : stat.icon}
          </div>
          <div className="stat-content">
            <span className="stat-value">{loading ? '...' : stat.value}</span>
            <span className="stat-label">{stat.label}</span>
          </div>
        </motion.div>
      ))}

      <style jsx>{`
        .queue-stats {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        
        @media (max-width: 1400px) {
          .queue-stats {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        
        @media (max-width: 800px) {
          .queue-stats {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        .stat-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px 20px;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 14px;
        }
        
        .stat-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .stat-content {
          display: flex;
          flex-direction: column;
        }
        
        .stat-value {
          font-size: 22px;
          font-weight: 700;
          color: #f1f5f9;
        }
        
        .stat-label {
          font-size: 12px;
          color: #94a3b8;
        }
        
        .spinner {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function ContentCard({ item, onAction }: { item: QueueItem; onAction: (action: string, item: QueueItem) => void }) {
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
    <motion.div
      className="content-card"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4 }}
      layout
    >
      {/* Content Preview */}
      <div className="content-preview">
        {item.type === 'photo' && (
          <div className="photo-placeholder">
            <Image size={32} />
            <span>Photo Content</span>
          </div>
        )}
        {item.type === 'chat' && (
          <div className="chat-preview">
            <MessageCircle size={24} />
            <p>"{item.description || 'Chat message...'}"</p>
          </div>
        )}
        {item.type === 'report' && (
          <div className="report-preview">
            <AlertTriangle size={24} />
            <p>{item.reason || 'Report submitted'}</p>
          </div>
        )}

        {/* AI Score Badge */}
        <div
          className="ai-score"
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
      <div className="content-info">
        <div className="info-header">
          <div className="type-badge" style={{ background: `${priorityColors[item.priority]?.bg || priorityColors.low.bg}`, color: priorityColors[item.priority]?.color || priorityColors.low.color }}>
            {typeIcons[item.type] || typeIcons.report}
            <span>{item.type}</span>
          </div>
          <span className="priority" style={priorityColors[item.priority] || priorityColors.low}>
            {item.priority}
          </span>
        </div>

        <div className="user-info">
          <div className="user-avatar">{item.user_name?.charAt(0) || 'U'}</div>
          <span>{item.user_name || 'Unknown'}</span>
        </div>

        {item.ai_flags && item.ai_flags.length > 0 && (
          <div className="ai-flags">
            {item.ai_flags.map(flag => (
              <span key={flag} className="flag-badge">
                <Flag size={10} /> {flag}
              </span>
            ))}
          </div>
        )}

        <div className="content-time">
          <Clock size={12} />
          {new Date(item.created_at).toLocaleTimeString()}
        </div>
      </div>

      {/* Actions */}
      <div className="content-actions">
        <button className="action-btn approve" onClick={() => onAction('approve', item)}>
          <ThumbsUp size={18} />
          <span>Approve</span>
        </button>
        <button className="action-btn reject" onClick={() => onAction('reject', item)}>
          <ThumbsDown size={18} />
          <span>Reject</span>
        </button>
        <button className="action-btn skip" onClick={() => onAction('skip', item)}>
          <SkipForward size={16} />
        </button>
      </div>

      <style jsx>{`
        .content-card {
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 16px;
          overflow: hidden;
          transition: all 0.3s ease;
        }
        
        .content-card:hover {
          border-color: rgba(168, 85, 247, 0.3);
          box-shadow: 0 0 30px rgba(168, 85, 247, 0.15);
        }
        
        .content-preview {
          position: relative;
          height: 180px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(30, 41, 59, 0.5);
          border-bottom: 1px solid rgba(148, 163, 184, 0.1);
        }
        
        .photo-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          color: #64748b;
        }
        
        .photo-placeholder span {
          font-size: 12px;
        }
        
        .chat-preview,
        .report-preview {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 20px;
          text-align: center;
        }
        
        .chat-preview svg {
          color: #3b82f6;
        }
        
        .report-preview svg {
          color: #f97316;
        }
        
        .chat-preview p,
        .report-preview p {
          font-size: 13px;
          color: #94a3b8;
          font-style: italic;
        }
        
        .ai-score {
          position: absolute;
          top: 12px;
          right: 12px;
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 600;
          padding: 6px 10px;
          border-radius: 20px;
        }
        
        .content-info {
          padding: 16px;
        }
        
        .info-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        
        .type-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 20px;
          text-transform: uppercase;
        }
        
        .priority {
          font-size: 10px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 12px;
          text-transform: uppercase;
        }
        
        .user-info {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }
        
        .user-avatar {
          width: 28px;
          height: 28px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
          color: white;
        }
        
        .user-info span {
          font-size: 14px;
          color: #f1f5f9;
        }
        
        .ai-flags {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-bottom: 10px;
        }
        
        .flag-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          font-weight: 600;
          padding: 3px 8px;
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
          border-radius: 10px;
          text-transform: uppercase;
        }
        
        .content-time {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #64748b;
        }
        
        .content-actions {
          display: flex;
          gap: 8px;
          padding: 12px 16px;
          background: rgba(30, 41, 59, 0.3);
          border-top: 1px solid rgba(148, 163, 184, 0.1);
        }
        
        .action-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px;
          border-radius: 10px;
          border: none;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .action-btn span {
          display: none;
        }
        
        @media (min-width: 400px) {
          .action-btn span {
            display: inline;
          }
        }
        
        .action-btn.approve {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
        }
        
        .action-btn.approve:hover {
          background: rgba(16, 185, 129, 0.3);
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.3);
        }
        
        .action-btn.reject {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
        }
        
        .action-btn.reject:hover {
          background: rgba(239, 68, 68, 0.3);
          box-shadow: 0 0 20px rgba(239, 68, 68, 0.3);
        }
        
        .action-btn.skip {
          flex: 0;
          background: rgba(148, 163, 184, 0.15);
          color: #94a3b8;
          padding: 10px 14px;
        }
        
        .action-btn.skip:hover {
          background: rgba(148, 163, 184, 0.3);
        }
      `}</style>
    </motion.div>
  );
}

function ReviewModal({ item, onClose, onAction }: {
  item: QueueItem;
  onClose: () => void;
  onAction: (action: string, item: QueueItem) => void;
}) {
  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal-content"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>Content Review</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="review-preview">
            {item.type === 'photo' && (
              <div className="large-placeholder">
                <Image size={64} />
                <span>Photo Content Preview</span>
              </div>
            )}
          </div>

          <div className="review-details">
            <div className="detail-row">
              <span className="label">Type:</span>
              <span className="value">{item.type}</span>
            </div>
            <div className="detail-row">
              <span className="label">User:</span>
              <span className="value">{item.user_name}</span>
            </div>
            <div className="detail-row">
              <span className="label">AI Score:</span>
              <span className="value">{item.ai_score}%</span>
            </div>
            <div className="detail-row">
              <span className="label">Flags:</span>
              <span className="value">{item.ai_flags?.join(', ') || 'None'}</span>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button className="modal-btn approve" onClick={() => { onAction('approve', item); onClose(); }}>
            <CheckCircle size={18} /> Approve
          </button>
          <button className="modal-btn reject" onClick={() => { onAction('reject', item); onClose(); }}>
            <XCircle size={18} /> Reject
          </button>
          <button className="modal-btn ban" onClick={() => { onAction('ban', item); onClose(); }}>
            <Ban size={18} /> Ban User
          </button>
        </div>
      </motion.div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        
        .modal-content {
          width: 100%;
          max-width: 600px;
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(148, 163, 184, 0.3);
          border-radius: 20px;
          overflow: hidden;
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.2);
        }
        
        .modal-header h3 {
          font-size: 18px;
          font-weight: 600;
          color: #f1f5f9;
        }
        
        .close-btn {
          width: 36px;
          height: 36px;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 10px;
          color: #94a3b8;
          font-size: 24px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .close-btn:hover {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }
        
        .modal-body {
          padding: 24px;
        }
        
        .review-preview {
          height: 300px;
          background: rgba(30, 41, 59, 0.5);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }
        
        .large-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          color: #64748b;
        }
        
        .large-placeholder span {
          font-size: 14px;
        }
        
        .review-details {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid rgba(148, 163, 184, 0.1);
        }
        
        .detail-row .label {
          font-size: 14px;
          color: #94a3b8;
        }
        
        .detail-row .value {
          font-size: 14px;
          color: #f1f5f9;
          font-weight: 500;
        }
        
        .modal-actions {
          display: flex;
          gap: 12px;
          padding: 20px 24px;
          background: rgba(30, 41, 59, 0.3);
          border-top: 1px solid rgba(148, 163, 184, 0.2);
        }
        
        .modal-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px;
          border-radius: 12px;
          border: none;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .modal-btn.approve {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
        }
        
        .modal-btn.approve:hover {
          background: #10b981;
          color: white;
        }
        
        .modal-btn.reject {
          background: rgba(249, 115, 22, 0.2);
          color: #f97316;
        }
        
        .modal-btn.reject:hover {
          background: #f97316;
          color: white;
        }
        
        .modal-btn.ban {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }
        
        .modal-btn.ban:hover {
          background: #ef4444;
          color: white;
        }
      `}</style>
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
    <div className="moderation-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Content Moderation</h1>
          <p>Review and moderate user-submitted content</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={handleRefresh}>
            <RotateCcw size={16} />
            Refresh
          </button>
          <button className="btn-primary">
            <Zap size={16} />
            AI Batch Process
          </button>
        </div>
      </div>

      {/* Stats */}
      <QueueStats stats={stats} loading={statsLoading} />

      {/* Filters */}
      <div className="filters-bar">
        <div className="filter-tabs">
          {(['all', 'photo', 'chat', 'report'] as const).map((type) => (
            <button
              key={type}
              className={`filter-tab ${filter === type ? 'active' : ''}`}
              onClick={() => { setFilter(type); setCurrentPage(1); }}
            >
              {type === 'all' && 'All'}
              {type === 'photo' && <><Image size={14} /> Photos</>}
              {type === 'chat' && <><MessageCircle size={14} /> Chat</>}
              {type === 'report' && <><AlertTriangle size={14} /> Reports</>}
              <span className="tab-count">
                {type === 'all'
                  ? queue.length
                  : queue.filter(i => i.type === type).length}
              </span>
            </button>
          ))}
        </div>

        <div className="priority-filter">
          <select value={priority} onChange={(e) => { setPriority(e.target.value as any); setCurrentPage(1); }}>
            <option value="all">All Priority</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="loading-state">
          <Loader2 className="spinner" size={32} />
          <span>Loading moderation queue...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="error-state">
          <AlertTriangle size={24} />
          <span>{error}</span>
          <button onClick={handleRefresh}>Retry</button>
        </div>
      )}

      {/* Queue Grid */}
      {!loading && !error && (
        <div className="queue-grid">
          <AnimatePresence>
            {filteredQueue.map((item) => (
              <ContentCard
                key={item.id}
                item={item}
                onAction={handleAction}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {!loading && !error && filteredQueue.length === 0 && (
        <div className="empty-state">
          <CheckCircle size={64} />
          <h3>All caught up!</h3>
          <p>No items in the moderation queue</p>
        </div>
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

      <style jsx>{`
        .moderation-page {
          max-width: 1600px;
          margin: 0 auto;
        }
        
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
        }
        
        .page-header h1 {
          font-size: 28px;
          font-weight: 700;
          color: #f1f5f9;
          margin-bottom: 4px;
        }
        
        .page-header p {
          font-size: 15px;
          color: #94a3b8;
        }
        
        .header-actions {
          display: flex;
          gap: 12px;
        }
        
        .btn-secondary,
        .btn-primary {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn-secondary {
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.2);
          color: #f1f5f9;
        }
        
        .btn-secondary:hover {
          background: rgba(30, 41, 59, 0.8);
        }
        
        .btn-primary {
          background: linear-gradient(135deg, #a855f7, #7c3aed);
          border: none;
          color: white;
          box-shadow: 0 4px 15px rgba(168, 85, 247, 0.4);
        }
        
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(168, 85, 247, 0.5);
        }
        
        .filters-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
        }
        
        .filter-tabs {
          display: flex;
          gap: 8px;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 14px;
          padding: 6px;
        }
        
        .filter-tab {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px;
          background: transparent;
          border: none;
          border-radius: 10px;
          color: #94a3b8;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .filter-tab:hover {
          background: rgba(148, 163, 184, 0.1);
          color: #f1f5f9;
        }
        
        .filter-tab.active {
          background: rgba(168, 85, 247, 0.2);
          color: #a855f7;
        }
        
        .tab-count {
          background: rgba(148, 163, 184, 0.2);
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 11px;
        }
        
        .filter-tab.active .tab-count {
          background: rgba(168, 85, 247, 0.3);
        }
        
        .priority-filter select {
          padding: 10px 16px;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 10px;
          color: #f1f5f9;
          font-size: 14px;
          cursor: pointer;
          outline: none;
        }
        
        .loading-state,
        .error-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: #94a3b8;
          gap: 16px;
        }
        
        .spinner {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .error-state {
          color: #ef4444;
        }
        
        .error-state button {
          padding: 8px 16px;
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          color: #ef4444;
          cursor: pointer;
        }
        
        .queue-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
        }
        
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 20px;
          color: #64748b;
        }
        
        .empty-state h3 {
          font-size: 24px;
          font-weight: 600;
          color: #f1f5f9;
          margin: 20px 0 8px;
        }
        
        .empty-state p {
          font-size: 15px;
        }
      `}</style>
    </div>
  );
}
