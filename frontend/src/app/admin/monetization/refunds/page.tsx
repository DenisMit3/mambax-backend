'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    RefreshCw,
    DollarSign,
    Clock,
    CheckCircle,
    XCircle,
    AlertTriangle,
    User,
    CreditCard,
    Calendar,
    MessageSquare,
    ChevronRight,
    Search,
    Filter,
} from 'lucide-react';

interface RefundRequest {
    id: string;
    transactionId: string;
    userId: string;
    userName: string;
    userEmail: string;
    amount: number;
    reason: string;
    status: 'pending' | 'approved' | 'rejected' | 'processed';
    plan: string;
    originalPurchaseDate: string;
    requestDate: string;
    daysSincePurchase: number;
    reviewedAt?: string;
    adminNotes?: string;
}

const mockRefunds: RefundRequest[] = [
    {
        id: 'refund-1',
        transactionId: 'txn-12345',
        userId: 'user-101',
        userName: 'John Smith',
        userEmail: 'john@example.com',
        amount: 29.99,
        reason: 'Accidental purchase - I meant to look at the features but accidentally confirmed',
        status: 'pending',
        plan: 'gold',
        originalPurchaseDate: '2024-02-01T10:30:00Z',
        requestDate: '2024-02-05T14:20:00Z',
        daysSincePurchase: 4
    },
    {
        id: 'refund-2',
        transactionId: 'txn-12346',
        userId: 'user-102',
        userName: 'Sarah Johnson',
        userEmail: 'sarah@example.com',
        amount: 49.99,
        reason: 'Not satisfied with Platinum features, expected more from the premium tier',
        status: 'pending',
        plan: 'platinum',
        originalPurchaseDate: '2024-02-03T08:15:00Z',
        requestDate: '2024-02-06T11:45:00Z',
        daysSincePurchase: 3
    },
    {
        id: 'refund-3',
        transactionId: 'txn-12347',
        userId: 'user-103',
        userName: 'Mike Williams',
        userEmail: 'mike@example.com',
        amount: 29.99,
        reason: 'Duplicate charge - was charged twice for same subscription',
        status: 'approved',
        plan: 'gold',
        originalPurchaseDate: '2024-01-28T16:00:00Z',
        requestDate: '2024-01-28T16:05:00Z',
        daysSincePurchase: 0,
        reviewedAt: '2024-01-28T18:00:00Z',
        adminNotes: 'Confirmed duplicate charge in payment logs'
    },
    {
        id: 'refund-4',
        transactionId: 'txn-12348',
        userId: 'user-104',
        userName: 'Emma Davis',
        userEmail: 'emma@example.com',
        amount: 29.99,
        reason: 'Requested refund after 45 days of use',
        status: 'rejected',
        plan: 'gold',
        originalPurchaseDate: '2023-12-15T09:00:00Z',
        requestDate: '2024-01-30T10:00:00Z',
        daysSincePurchase: 46,
        reviewedAt: '2024-01-30T14:00:00Z',
        adminNotes: 'Outside 30-day refund window, user had significant activity'
    }
];

function RefundStats() {
    const stats = [
        { label: 'Pending', value: 15, icon: <Clock size={18} />, color: '#f97316' },
        { label: 'Approved (Month)', value: 47, icon: <CheckCircle size={18} />, color: '#10b981' },
        { label: 'Rejected (Month)', value: 12, icon: <XCircle size={18} />, color: '#ef4444' },
        { label: 'Total Refunded', value: '$1.9K', icon: <DollarSign size={18} />, color: '#3b82f6' },
        { label: 'Refund Rate', value: '2.3%', icon: <RefreshCw size={18} />, color: '#a855f7' },
        { label: 'Avg Processing', value: '1.5 days', icon: <Calendar size={18} />, color: '#10b981' },
    ];

    return (
        <div className="refund-stats">
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
        .refund-stats {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        
        @media (max-width: 1400px) {
          .refund-stats {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        
        @media (max-width: 800px) {
          .refund-stats {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        .stat-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 18px;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 14px;
        }
        
        .stat-icon {
          width: 42px;
          height: 42px;
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
          font-size: 20px;
          font-weight: 700;
          color: #f1f5f9;
        }
        
        .stat-label {
          font-size: 11px;
          color: #94a3b8;
        }
      `}</style>
        </div>
    );
}

function RefundCard({ refund, onAction }: {
    refund: RefundRequest;
    onAction: (id: string, action: 'approve' | 'reject') => void
}) {
    const [showDetails, setShowDetails] = useState(false);

    const statusColors = {
        pending: { bg: 'rgba(249, 115, 22, 0.15)', color: '#f97316' },
        approved: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
        rejected: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' },
        processed: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' },
    };

    const planColors = {
        gold: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' },
        platinum: { bg: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' },
    };

    const getEligibility = () => {
        if (refund.daysSincePurchase <= 7) {
            return { label: 'Full Refund Eligible', color: '#10b981' };
        } else if (refund.daysSincePurchase <= 30) {
            return { label: 'Partial Refund Eligible', color: '#f59e0b' };
        } else {
            return { label: 'Outside Refund Window', color: '#ef4444' };
        }
    };

    const eligibility = getEligibility();

    return (
        <motion.div
            className={`refund-card ${refund.status}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <div className="card-main" onClick={() => setShowDetails(!showDetails)}>
                <div className="user-info">
                    <div className="user-avatar">{refund.userName.charAt(0)}</div>
                    <div className="user-details">
                        <span className="user-name">{refund.userName}</span>
                        <span className="user-email">{refund.userEmail}</span>
                    </div>
                </div>

                <div className="refund-amount">
                    <span className="amount">${refund.amount.toFixed(2)}</span>
                    <span
                        className="plan-badge"
                        style={planColors[refund.plan as keyof typeof planColors]}
                    >
                        {refund.plan}
                    </span>
                </div>

                <div className="refund-meta">
                    <div className="meta-item">
                        <Calendar size={14} />
                        <span>{refund.daysSincePurchase} days ago</span>
                    </div>
                    <span className="eligibility" style={{ color: eligibility.color }}>
                        {eligibility.label}
                    </span>
                </div>

                <span
                    className="status-badge"
                    style={statusColors[refund.status]}
                >
                    {refund.status === 'pending' && <Clock size={12} />}
                    {refund.status === 'approved' && <CheckCircle size={12} />}
                    {refund.status === 'rejected' && <XCircle size={12} />}
                    {refund.status}
                </span>

                <ChevronRight
                    size={18}
                    className={`expand-icon ${showDetails ? 'expanded' : ''}`}
                />
            </div>

            {showDetails && (
                <motion.div
                    className="card-details"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                >
                    <div className="details-grid">
                        <div className="detail-item">
                            <span className="detail-label">Transaction ID</span>
                            <span className="detail-value">{refund.transactionId}</span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label">Purchase Date</span>
                            <span className="detail-value">
                                {new Date(refund.originalPurchaseDate).toLocaleDateString()}
                            </span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label">Request Date</span>
                            <span className="detail-value">
                                {new Date(refund.requestDate).toLocaleDateString()}
                            </span>
                        </div>
                        {refund.reviewedAt && (
                            <div className="detail-item">
                                <span className="detail-label">Reviewed At</span>
                                <span className="detail-value">
                                    {new Date(refund.reviewedAt).toLocaleDateString()}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="reason-section">
                        <span className="reason-label">
                            <MessageSquare size={14} /> Reason
                        </span>
                        <p className="reason-text">{refund.reason}</p>
                    </div>

                    {refund.adminNotes && (
                        <div className="notes-section">
                            <span className="notes-label">Admin Notes</span>
                            <p className="notes-text">{refund.adminNotes}</p>
                        </div>
                    )}

                    {refund.status === 'pending' && (
                        <div className="action-buttons">
                            <button
                                className="btn-approve"
                                onClick={(e) => { e.stopPropagation(); onAction(refund.id, 'approve'); }}
                            >
                                <CheckCircle size={16} />
                                Approve Refund
                            </button>
                            <button
                                className="btn-reject"
                                onClick={(e) => { e.stopPropagation(); onAction(refund.id, 'reject'); }}
                            >
                                <XCircle size={16} />
                                Reject
                            </button>
                        </div>
                    )}
                </motion.div>
            )}

            <style jsx>{`
        .refund-card {
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 16px;
          overflow: hidden;
          margin-bottom: 12px;
          transition: all 0.2s;
        }
        
        .refund-card:hover {
          border-color: rgba(148, 163, 184, 0.4);
        }
        
        .refund-card.pending {
          border-left: 3px solid #f97316;
        }
        
        .refund-card.approved {
          border-left: 3px solid #10b981;
        }
        
        .refund-card.rejected {
          border-left: 3px solid #ef4444;
        }
        
        .card-main {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 16px 20px;
          cursor: pointer;
        }
        
        .user-info {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 200px;
        }
        
        .user-avatar {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 600;
          color: white;
        }
        
        .user-details {
          display: flex;
          flex-direction: column;
        }
        
        .user-name {
          font-size: 14px;
          font-weight: 600;
          color: #f1f5f9;
        }
        
        .user-email {
          font-size: 12px;
          color: #64748b;
        }
        
        .refund-amount {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          min-width: 100px;
        }
        
        .amount {
          font-size: 18px;
          font-weight: 700;
          color: #f1f5f9;
        }
        
        .plan-badge {
          font-size: 10px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 10px;
          text-transform: uppercase;
        }
        
        .refund-meta {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .meta-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #94a3b8;
        }
        
        .eligibility {
          font-size: 11px;
          font-weight: 600;
        }
        
        .status-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 600;
          padding: 6px 12px;
          border-radius: 20px;
          text-transform: capitalize;
        }
        
        :global(.expand-icon) {
          color: #64748b;
          transition: transform 0.2s;
        }
        
        :global(.expand-icon.expanded) {
          transform: rotate(90deg);
        }
        
        .card-details {
          padding: 0 20px 20px;
          border-top: 1px solid rgba(148, 163, 184, 0.1);
        }
        
        .details-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          padding: 16px 0;
        }
        
        .detail-item {
          display: flex;
          flex-direction: column;
        }
        
        .detail-label {
          font-size: 11px;
          color: #64748b;
          margin-bottom: 4px;
        }
        
        .detail-value {
          font-size: 13px;
          font-weight: 500;
          color: #f1f5f9;
        }
        
        .reason-section,
        .notes-section {
          padding: 12px 16px;
          background: rgba(30, 41, 59, 0.4);
          border-radius: 10px;
          margin-bottom: 12px;
        }
        
        .reason-label,
        .notes-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          color: #94a3b8;
          margin-bottom: 8px;
        }
        
        .reason-text,
        .notes-text {
          font-size: 13px;
          color: #f1f5f9;
          line-height: 1.5;
        }
        
        .notes-section {
          background: rgba(249, 115, 22, 0.1);
        }
        
        .action-buttons {
          display: flex;
          gap: 12px;
          padding-top: 12px;
        }
        
        .btn-approve,
        .btn-reject {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 20px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn-approve {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #10b981;
        }
        
        .btn-approve:hover {
          background: #10b981;
          color: white;
        }
        
        .btn-reject {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
        }
        
        .btn-reject:hover {
          background: #ef4444;
          color: white;
        }
      `}</style>
        </motion.div>
    );
}

export default function RefundsPage() {
    const [refunds, setRefunds] = useState(mockRefunds);
    const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
    const [search, setSearch] = useState('');

    const handleAction = (id: string, action: 'approve' | 'reject') => {
        setRefunds(prev => prev.map(r =>
            r.id === id
                ? { ...r, status: action === 'approve' ? 'approved' : 'rejected', reviewedAt: new Date().toISOString() }
                : r
        ));
    };

    const filteredRefunds = refunds.filter(r => {
        if (filter !== 'all' && r.status !== filter) return false;
        if (search && !r.userName.toLowerCase().includes(search.toLowerCase()) &&
            !r.userEmail.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    return (
        <div className="refunds-page">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1>Refund Processing</h1>
                    <p>Review and process refund requests</p>
                </div>
            </div>

            {/* Stats */}
            <RefundStats />

            {/* Filters */}
            <div className="filters-bar">
                <div className="filter-tabs">
                    {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
                        <button
                            key={f}
                            className={`filter-tab ${filter === f ? 'active' : ''}`}
                            onClick={() => setFilter(f)}
                        >
                            {f === 'pending' && <Clock size={14} />}
                            {f === 'approved' && <CheckCircle size={14} />}
                            {f === 'rejected' && <XCircle size={14} />}
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                            <span className="count">
                                {f === 'all'
                                    ? refunds.length
                                    : refunds.filter(r => r.status === f).length}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="search-box">
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Refund List */}
            <div className="refunds-list">
                {filteredRefunds.map((refund) => (
                    <RefundCard
                        key={refund.id}
                        refund={refund}
                        onAction={handleAction}
                    />
                ))}

                {filteredRefunds.length === 0 && (
                    <div className="empty-state">
                        <CheckCircle size={48} />
                        <h3>All caught up!</h3>
                        <p>No refund requests matching your filters</p>
                    </div>
                )}
            </div>

            <style jsx>{`
        .refunds-page {
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .page-header {
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
        }
        
        .filter-tab {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 10px;
          color: #94a3b8;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .filter-tab.active {
          background: rgba(168, 85, 247, 0.2);
          border-color: rgba(168, 85, 247, 0.4);
          color: #a855f7;
        }
        
        .filter-tab .count {
          padding: 2px 8px;
          background: rgba(148, 163, 184, 0.2);
          border-radius: 10px;
          font-size: 11px;
        }
        
        .search-box {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 10px;
          min-width: 300px;
        }
        
        .search-box svg {
          color: #64748b;
        }
        
        .search-box input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: #f1f5f9;
          font-size: 14px;
        }
        
        .refunds-list {
          display: flex;
          flex-direction: column;
        }
        
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #64748b;
        }
        
        .empty-state h3 {
          font-size: 20px;
          font-weight: 600;
          color: #f1f5f9;
          margin: 16px 0 8px;
        }
      `}</style>
        </div>
    );
}
