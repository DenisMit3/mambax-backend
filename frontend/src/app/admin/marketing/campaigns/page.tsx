'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Megaphone,
    Mail,
    Bell,
    MessageSquare,
    TrendingUp,
    Users,
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
    AlertCircle,
} from 'lucide-react';

interface Campaign {
    id: string;
    name: string;
    type: 'push' | 'email' | 'sms' | 'in_app';
    status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed';
    targetSegment: string;
    sent?: number;
    delivered?: number;
    opened?: number;
    clicked?: number;
    converted?: number;
    openRate?: number;
    ctr?: number;
    conversionRate?: number;
    createdAt: string;
    scheduledAt?: string;
    completedAt?: string;
}

const mockCampaigns: Campaign[] = [
    {
        id: 'camp-1',
        name: "Valentine's Day Push",
        type: 'push',
        status: 'completed',
        targetSegment: 'all_users',
        sent: 45892,
        delivered: 43247,
        opened: 12456,
        clicked: 3421,
        converted: 892,
        openRate: 28.8,
        ctr: 7.9,
        conversionRate: 2.1,
        createdAt: '2024-02-10T10:00:00Z',
        completedAt: '2024-02-14T18:00:00Z'
    },
    {
        id: 'camp-2',
        name: 'Win-Back Email Series',
        type: 'email',
        status: 'active',
        targetSegment: 'churned_30d',
        sent: 8934,
        delivered: 8756,
        opened: 2847,
        clicked: 723,
        converted: 156,
        openRate: 32.5,
        ctr: 8.3,
        conversionRate: 1.8,
        createdAt: '2024-02-01T09:00:00Z'
    },
    {
        id: 'camp-3',
        name: 'Premium Upgrade Push',
        type: 'push',
        status: 'active',
        targetSegment: 'high_activity_free',
        sent: 12456,
        delivered: 11892,
        opened: 4521,
        clicked: 1234,
        converted: 423,
        openRate: 38.0,
        ctr: 10.4,
        conversionRate: 3.6,
        createdAt: '2024-02-05T14:00:00Z'
    },
    {
        id: 'camp-4',
        name: 'Weekend Match Boost',
        type: 'in_app',
        status: 'scheduled',
        targetSegment: 'active_users',
        scheduledAt: '2024-02-10T18:00:00Z',
        createdAt: '2024-02-08T11:00:00Z'
    },
    {
        id: 'camp-5',
        name: 'New Feature Announcement',
        type: 'email',
        status: 'draft',
        targetSegment: 'all_users',
        createdAt: '2024-02-07T16:00:00Z'
    }
];

function CampaignStats() {
    const stats = [
        { label: 'Active Campaigns', value: 3, icon: <Megaphone size={18} />, color: '#10b981' },
        { label: 'Total Sent (Week)', value: '67.3K', icon: <Send size={18} />, color: '#3b82f6' },
        { label: 'Avg Open Rate', value: '32.4%', icon: <MousePointerClick size={18} />, color: '#a855f7' },
        { label: 'Conversions', value: '1.5K', icon: <Target size={18} />, color: '#f59e0b' },
    ];

    return (
        <div className="campaign-stats">
            {stats.map((stat, index) => (
                <motion.div
                    key={stat.label}
                    className="stat-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                >
                    <div className="stat-icon" style={{ background: `${stat.color}20`, color: stat.color }}>
                        {stat.icon}
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{stat.value}</span>
                        <span className="stat-label">{stat.label}</span>
                    </div>
                </motion.div>
            ))}

            <style jsx>{`
        .campaign-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        
        @media (max-width: 1000px) {
          .campaign-stats {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        .stat-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 20px;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 16px;
        }
        
        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .stat-content {
          display: flex;
          flex-direction: column;
        }
        
        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: #f1f5f9;
        }
        
        .stat-label {
          font-size: 12px;
          color: #94a3b8;
        }
      `}</style>
        </div>
    );
}

function CampaignCard({ campaign, onAction }: { campaign: Campaign; onAction: (id: string, action: string) => void }) {
    const typeConfig = {
        push: { icon: <Bell size={16} />, label: 'Push', color: '#a855f7' },
        email: { icon: <Mail size={16} />, label: 'Email', color: '#3b82f6' },
        sms: { icon: <MessageSquare size={16} />, label: 'SMS', color: '#10b981' },
        in_app: { icon: <Megaphone size={16} />, label: 'In-App', color: '#f59e0b' }
    };

    const statusConfig = {
        draft: { color: '#64748b', bg: 'rgba(100, 116, 139, 0.15)' },
        scheduled: { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
        active: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
        paused: { color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)' },
        completed: { color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)' }
    };

    const type = typeConfig[campaign.type];
    const status = statusConfig[campaign.status];

    return (
        <motion.div
            className="campaign-card"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
        >
            <div className="card-header">
                <div className="type-badge" style={{ background: `${type.color}20`, color: type.color }}>
                    {type.icon}
                    {type.label}
                </div>
                <div className="status-badge" style={{ background: status.bg, color: status.color }}>
                    {campaign.status === 'active' && <span className="pulse" />}
                    {campaign.status}
                </div>
            </div>

            <h3 className="campaign-name">{campaign.name}</h3>

            <div className="segment-info">
                <Users size={14} />
                <span>{campaign.targetSegment.replace(/_/g, ' ')}</span>
            </div>

            {campaign.sent && (
                <div className="campaign-metrics">
                    <div className="metric">
                        <span className="metric-value">{(campaign.sent / 1000).toFixed(1)}K</span>
                        <span className="metric-label">Sent</span>
                    </div>
                    <div className="metric">
                        <span className="metric-value">{campaign.openRate}%</span>
                        <span className="metric-label">Open Rate</span>
                    </div>
                    <div className="metric">
                        <span className="metric-value">{campaign.ctr}%</span>
                        <span className="metric-label">CTR</span>
                    </div>
                    <div className="metric">
                        <span className="metric-value">{campaign.converted}</span>
                        <span className="metric-label">Converted</span>
                    </div>
                </div>
            )}

            {campaign.scheduledAt && (
                <div className="scheduled-info">
                    <Calendar size={14} />
                    <span>Scheduled: {new Date(campaign.scheduledAt).toLocaleString()}</span>
                </div>
            )}

            <div className="card-actions">
                {campaign.status === 'draft' && (
                    <>
                        <button className="action-btn primary" onClick={() => onAction(campaign.id, 'schedule')}>
                            <Calendar size={14} /> Schedule
                        </button>
                        <button className="action-btn" onClick={() => onAction(campaign.id, 'send')}>
                            <Send size={14} /> Send Now
                        </button>
                    </>
                )}
                {campaign.status === 'active' && (
                    <button className="action-btn warning" onClick={() => onAction(campaign.id, 'pause')}>
                        <Pause size={14} /> Pause
                    </button>
                )}
                {campaign.status === 'paused' && (
                    <button className="action-btn success" onClick={() => onAction(campaign.id, 'resume')}>
                        <Play size={14} /> Resume
                    </button>
                )}
                {campaign.status === 'completed' && (
                    <button className="action-btn" onClick={() => onAction(campaign.id, 'duplicate')}>
                        <Copy size={14} /> Duplicate
                    </button>
                )}
                <button className="action-btn" onClick={() => onAction(campaign.id, 'view')}>
                    <BarChart3 size={14} /> Analytics
                </button>
            </div>

            <style jsx>{`
        .campaign-card {
          padding: 24px;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 20px;
          transition: all 0.3s ease;
        }
        
        .campaign-card:hover {
          border-color: rgba(168, 85, 247, 0.3);
        }
        
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        
        .type-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }
        
        .status-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          text-transform: capitalize;
        }
        
        .pulse {
          width: 6px;
          height: 6px;
          background: currentColor;
          border-radius: 50%;
          animation: pulse 1.5s ease-in-out infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
        
        .campaign-name {
          font-size: 18px;
          font-weight: 600;
          color: #f1f5f9;
          margin-bottom: 8px;
        }
        
        .segment-info {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #64748b;
          text-transform: capitalize;
          margin-bottom: 16px;
        }
        
        .campaign-metrics {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          padding: 16px 0;
          border-top: 1px solid rgba(148, 163, 184, 0.1);
          border-bottom: 1px solid rgba(148, 163, 184, 0.1);
          margin-bottom: 16px;
        }
        
        .metric {
          text-align: center;
        }
        
        .metric-value {
          display: block;
          font-size: 16px;
          font-weight: 700;
          color: #f1f5f9;
        }
        
        .metric-label {
          font-size: 10px;
          color: #64748b;
        }
        
        .scheduled-info {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          background: rgba(59, 130, 246, 0.1);
          border-radius: 10px;
          color: #3b82f6;
          font-size: 13px;
          margin-bottom: 16px;
        }
        
        .card-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        
        .action-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 8px;
          color: #94a3b8;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .action-btn:hover {
          background: rgba(148, 163, 184, 0.15);
          color: #f1f5f9;
        }
        
        .action-btn.primary {
          background: rgba(168, 85, 247, 0.15);
          border-color: rgba(168, 85, 247, 0.3);
          color: #a855f7;
        }
        
        .action-btn.success {
          background: rgba(16, 185, 129, 0.15);
          border-color: rgba(16, 185, 129, 0.3);
          color: #10b981;
        }
        
        .action-btn.warning {
          background: rgba(249, 115, 22, 0.15);
          border-color: rgba(249, 115, 22, 0.3);
          color: #f97316;
        }
      `}</style>
        </motion.div>
    );
}

function CreateCampaignModal({ onClose }: { onClose: () => void }) {
    const [step, setStep] = useState(1);
    const [campaignType, setCampaignType] = useState<string>('');

    const types = [
        { id: 'push', label: 'Push Notification', icon: <Bell size={24} />, desc: 'Send instant mobile notifications' },
        { id: 'email', label: 'Email Campaign', icon: <Mail size={24} />, desc: 'Create email marketing campaigns' },
        { id: 'in_app', label: 'In-App Message', icon: <Megaphone size={24} />, desc: 'Display messages within the app' },
        { id: 'sms', label: 'SMS Campaign', icon: <MessageSquare size={24} />, desc: 'Send text message campaigns' }
    ];

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
                    <h3>Create New Campaign</h3>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    {step === 1 && (
                        <div className="type-selection">
                            <h4>Select Campaign Type</h4>
                            <div className="type-grid">
                                {types.map((type) => (
                                    <div
                                        key={type.id}
                                        className={`type-option ${campaignType === type.id ? 'selected' : ''}`}
                                        onClick={() => setCampaignType(type.id)}
                                    >
                                        <div className="type-icon">{type.icon}</div>
                                        <span className="type-label">{type.label}</span>
                                        <span className="type-desc">{type.desc}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="campaign-form">
                            <div className="form-group">
                                <label>Campaign Name</label>
                                <input type="text" placeholder="e.g. Spring Sale Push" />
                            </div>

                            {campaignType === 'push' && (
                                <>
                                    <div className="form-group">
                                        <label>Notification Title</label>
                                        <input type="text" placeholder="You have a new match! 💕" />
                                    </div>
                                    <div className="form-group">
                                        <label>Message Body</label>
                                        <textarea placeholder="Someone special is waiting..." rows={3} />
                                    </div>
                                </>
                            )}

                            {campaignType === 'email' && (
                                <>
                                    <div className="form-group">
                                        <label>Email Subject</label>
                                        <input type="text" placeholder="Don't miss out!" />
                                    </div>
                                    <div className="form-group">
                                        <label>Preview Text</label>
                                        <input type="text" placeholder="Special offer inside..." />
                                    </div>
                                </>
                            )}

                            <div className="form-group">
                                <label>Target Segment</label>
                                <select>
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

                <div className="modal-footer">
                    {step > 1 && (
                        <button className="btn-secondary" onClick={() => setStep(step - 1)}>
                            Back
                        </button>
                    )}
                    {step < 2 && campaignType && (
                        <button className="btn-primary" onClick={() => setStep(2)}>
                            Continue <ChevronRight size={16} />
                        </button>
                    )}
                    {step === 2 && (
                        <button className="btn-primary">
                            Create Campaign
                        </button>
                    )}
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
          max-height: 90vh;
          overflow-y: auto;
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(148, 163, 184, 0.3);
          border-radius: 20px;
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.2);
        }
        
        .modal-header h3 {
          font-size: 20px;
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
        }
        
        .modal-body {
          padding: 24px;
        }
        
        .type-selection h4 {
          font-size: 16px;
          color: #94a3b8;
          margin-bottom: 16px;
        }
        
        .type-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        
        .type-option {
          padding: 20px;
          background: rgba(30, 41, 59, 0.4);
          border: 2px solid transparent;
          border-radius: 14px;
          cursor: pointer;
          text-align: center;
          transition: all 0.2s;
        }
        
        .type-option:hover {
          background: rgba(30, 41, 59, 0.6);
        }
        
        .type-option.selected {
          border-color: #a855f7;
          background: rgba(168, 85, 247, 0.1);
        }
        
        .type-icon {
          width: 48px;
          height: 48px;
          background: rgba(168, 85, 247, 0.2);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 12px;
          color: #a855f7;
        }
        
        .type-label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #f1f5f9;
          margin-bottom: 4px;
        }
        
        .type-desc {
          font-size: 12px;
          color: #64748b;
        }
        
        .campaign-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .form-group label {
          font-size: 13px;
          color: #94a3b8;
        }
        
        .form-group input,
        .form-group textarea,
        .form-group select {
          padding: 12px 16px;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 10px;
          color: #f1f5f9;
          font-size: 14px;
          outline: none;
          resize: none;
        }
        
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 20px 24px;
          border-top: 1px solid rgba(148, 163, 184, 0.2);
        }
        
        .btn-secondary,
        .btn-primary {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }
        
        .btn-secondary {
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.2);
          color: #f1f5f9;
        }
        
        .btn-primary {
          background: linear-gradient(135deg, #a855f7, #7c3aed);
          border: none;
          color: white;
        }
      `}</style>
        </motion.div>
    );
}

export default function CampaignsPage() {
    const [campaigns] = useState(mockCampaigns);
    const [showCreate, setShowCreate] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterType, setFilterType] = useState<string>('all');

    const handleAction = (id: string, action: string) => {
        console.log(`Action ${action} on campaign ${id}`);
    };

    const filteredCampaigns = campaigns.filter(c => {
        if (filterStatus !== 'all' && c.status !== filterStatus) return false;
        if (filterType !== 'all' && c.type !== filterType) return false;
        return true;
    });

    return (
        <div className="campaigns-page">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1>Campaign Manager</h1>
                    <p>Create and manage marketing campaigns</p>
                </div>
                <button className="btn-primary" onClick={() => setShowCreate(true)}>
                    <Plus size={16} />
                    New Campaign
                </button>
            </div>

            {/* Stats */}
            <CampaignStats />

            {/* Filters */}
            <div className="filters">
                <div className="filter-group">
                    <label>Status:</label>
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                        <option value="all">All</option>
                        <option value="draft">Draft</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                    </select>
                </div>
                <div className="filter-group">
                    <label>Type:</label>
                    <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                        <option value="all">All Types</option>
                        <option value="push">Push</option>
                        <option value="email">Email</option>
                        <option value="in_app">In-App</option>
                        <option value="sms">SMS</option>
                    </select>
                </div>
            </div>

            {/* Campaigns Grid */}
            <div className="campaigns-grid">
                {filteredCampaigns.map((campaign) => (
                    <CampaignCard
                        key={campaign.id}
                        campaign={campaign}
                        onAction={handleAction}
                    />
                ))}
            </div>

            {/* Create Modal */}
            <AnimatePresence>
                {showCreate && <CreateCampaignModal onClose={() => setShowCreate(false)} />}
            </AnimatePresence>

            <style jsx>{`
        .campaigns-page {
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
        
        .btn-primary {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: linear-gradient(135deg, #a855f7, #7c3aed);
          border: none;
          border-radius: 12px;
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }
        
        .filters {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
        }
        
        .filter-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .filter-group label {
          font-size: 13px;
          color: #94a3b8;
        }
        
        .filter-group select {
          padding: 8px 14px;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 8px;
          color: #f1f5f9;
          font-size: 13px;
          cursor: pointer;
        }
        
        .campaigns-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
          gap: 20px;
        }
      `}</style>
        </div>
    );
}
