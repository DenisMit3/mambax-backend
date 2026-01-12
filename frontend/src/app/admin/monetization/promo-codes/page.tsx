'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Tag,
    Percent,
    DollarSign,
    Calendar,
    Users,
    TrendingUp,
    Plus,
    Edit,
    Trash2,
    Copy,
    CheckCircle,
    XCircle,
    Clock,
    Gift,
    ToggleLeft,
    ToggleRight,
} from 'lucide-react';

interface PromoCode {
    id: string;
    code: string;
    name: string;
    discountType: 'percentage' | 'fixed_amount' | 'free_trial';
    discountValue: number;
    maxUses: number | null;
    currentUses: number;
    validFrom: string;
    validUntil: string;
    isActive: boolean;
    firstPurchaseOnly: boolean;
    applicablePlans: string[];
    revenueGenerated: number;
}

const mockPromoCodes: PromoCode[] = [
    {
        id: 'promo-1',
        code: 'VALENTINE24',
        name: "Valentine's Day 2024",
        discountType: 'percentage',
        discountValue: 20,
        maxUses: 1000,
        currentUses: 456,
        validFrom: '2024-02-01T00:00:00Z',
        validUntil: '2024-02-28T23:59:59Z',
        isActive: true,
        firstPurchaseOnly: false,
        applicablePlans: ['gold', 'platinum'],
        revenueGenerated: 13680.00
    },
    {
        id: 'promo-2',
        code: 'WELCOME50',
        name: 'New User Welcome',
        discountType: 'percentage',
        discountValue: 50,
        maxUses: null,
        currentUses: 2847,
        validFrom: '2024-01-01T00:00:00Z',
        validUntil: '2024-12-31T23:59:59Z',
        isActive: true,
        firstPurchaseOnly: true,
        applicablePlans: ['gold', 'platinum'],
        revenueGenerated: 42705.00
    },
    {
        id: 'promo-3',
        code: 'SPRING10',
        name: 'Spring Sale',
        discountType: 'fixed_amount',
        discountValue: 10,
        maxUses: 500,
        currentUses: 500,
        validFrom: '2024-03-01T00:00:00Z',
        validUntil: '2024-03-31T23:59:59Z',
        isActive: false,
        firstPurchaseOnly: false,
        applicablePlans: ['gold'],
        revenueGenerated: 9500.00
    },
    {
        id: 'promo-4',
        code: 'PLATINUM30',
        name: 'Platinum Upgrade',
        discountType: 'percentage',
        discountValue: 30,
        maxUses: 200,
        currentUses: 78,
        validFrom: '2024-02-15T00:00:00Z',
        validUntil: '2024-03-15T23:59:59Z',
        isActive: true,
        firstPurchaseOnly: false,
        applicablePlans: ['platinum'],
        revenueGenerated: 2730.00
    },
    {
        id: 'promo-5',
        code: 'FREETRIAL7',
        name: '7-Day Free Trial',
        discountType: 'free_trial',
        discountValue: 7,
        maxUses: 5000,
        currentUses: 1234,
        validFrom: '2024-01-01T00:00:00Z',
        validUntil: '2024-06-30T23:59:59Z',
        isActive: true,
        firstPurchaseOnly: true,
        applicablePlans: ['gold'],
        revenueGenerated: 18510.00
    }
];

function PromoStats() {
    const stats = [
        { label: 'Active Codes', value: 4, icon: <Tag size={18} />, color: '#10b981' },
        { label: 'Total Redemptions', value: '5.1K', icon: <Users size={18} />, color: '#3b82f6' },
        { label: 'Revenue Generated', value: '$87K', icon: <DollarSign size={18} />, color: '#a855f7' },
        { label: 'Avg. Conversion', value: '15.2%', icon: <TrendingUp size={18} />, color: '#f59e0b' },
    ];

    return (
        <div className="promo-stats">
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
        .promo-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        
        @media (max-width: 1000px) {
          .promo-stats {
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

function PromoCodeCard({ promo, onToggle, onEdit }: {
    promo: PromoCode;
    onToggle: (id: string) => void;
    onEdit: (promo: PromoCode) => void;
}) {
    const [copied, setCopied] = useState(false);

    const copyCode = () => {
        navigator.clipboard.writeText(promo.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const getDiscountDisplay = () => {
        if (promo.discountType === 'percentage') {
            return `${promo.discountValue}% OFF`;
        } else if (promo.discountType === 'fixed_amount') {
            return `$${promo.discountValue} OFF`;
        } else {
            return `${promo.discountValue} Days Free`;
        }
    };

    const usagePercent = promo.maxUses ? (promo.currentUses / promo.maxUses) * 100 : 0;
    const isExpired = new Date(promo.validUntil) < new Date();
    const isExhausted = promo.maxUses && promo.currentUses >= promo.maxUses;

    return (
        <motion.div
            className={`promo-card ${!promo.isActive ? 'inactive' : ''}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
        >
            <div className="card-header">
                <div className="code-badge" onClick={copyCode}>
                    <span className="code">{promo.code}</span>
                    {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
                </div>
                <div className="card-actions">
                    <button className="action-btn" onClick={() => onEdit(promo)}>
                        <Edit size={14} />
                    </button>
                    <button
                        className={`toggle-btn ${promo.isActive ? 'active' : ''}`}
                        onClick={() => onToggle(promo.id)}
                    >
                        {promo.isActive ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                    </button>
                </div>
            </div>

            <h3 className="promo-name">{promo.name}</h3>

            <div className="discount-display">
                {promo.discountType === 'percentage' && <Percent size={20} />}
                {promo.discountType === 'fixed_amount' && <DollarSign size={20} />}
                {promo.discountType === 'free_trial' && <Gift size={20} />}
                <span>{getDiscountDisplay()}</span>
            </div>

            <div className="promo-details">
                <div className="detail-row">
                    <span className="detail-label">Redemptions</span>
                    <span className="detail-value">
                        {promo.currentUses.toLocaleString()}
                        {promo.maxUses && ` / ${promo.maxUses.toLocaleString()}`}
                    </span>
                </div>

                {promo.maxUses && (
                    <div className="usage-bar">
                        <div
                            className="usage-fill"
                            style={{
                                width: `${usagePercent}%`,
                                background: usagePercent >= 90 ? '#ef4444' : usagePercent >= 70 ? '#f59e0b' : '#10b981'
                            }}
                        />
                    </div>
                )}

                <div className="detail-row">
                    <span className="detail-label">Valid Until</span>
                    <span className="detail-value">
                        {new Date(promo.validUntil).toLocaleDateString()}
                    </span>
                </div>

                <div className="detail-row">
                    <span className="detail-label">Revenue Generated</span>
                    <span className="detail-value revenue">${promo.revenueGenerated.toLocaleString()}</span>
                </div>
            </div>

            <div className="promo-tags">
                {promo.firstPurchaseOnly && <span className="tag">First Purchase</span>}
                {promo.applicablePlans.map(plan => (
                    <span key={plan} className={`tag ${plan}`}>{plan}</span>
                ))}
            </div>

            <div className="promo-status">
                {isExpired ? (
                    <span className="status expired"><Clock size={12} /> Expired</span>
                ) : isExhausted ? (
                    <span className="status exhausted"><XCircle size={12} /> Fully Used</span>
                ) : promo.isActive ? (
                    <span className="status active"><CheckCircle size={12} /> Active</span>
                ) : (
                    <span className="status paused"><Clock size={12} /> Paused</span>
                )}
            </div>

            <style jsx>{`
        .promo-card {
          padding: 24px;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 20px;
          transition: all 0.3s ease;
        }
        
        .promo-card.inactive {
          opacity: 0.7;
        }
        
        .promo-card:hover {
          border-color: rgba(168, 85, 247, 0.3);
        }
        
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        
        .code-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          background: rgba(168, 85, 247, 0.15);
          border: 1px dashed rgba(168, 85, 247, 0.4);
          border-radius: 10px;
          color: #a855f7;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .code-badge:hover {
          background: rgba(168, 85, 247, 0.25);
        }
        
        .code {
          font-family: monospace;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 1px;
        }
        
        .card-actions {
          display: flex;
          gap: 8px;
        }
        
        .action-btn {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 8px;
          color: #94a3b8;
          cursor: pointer;
        }
        
        .action-btn:hover {
          background: rgba(59, 130, 246, 0.2);
          color: #3b82f6;
        }
        
        .toggle-btn {
          background: transparent;
          border: none;
          color: #64748b;
          cursor: pointer;
        }
        
        .toggle-btn.active {
          color: #10b981;
        }
        
        .promo-name {
          font-size: 18px;
          font-weight: 600;
          color: #f1f5f9;
          margin-bottom: 12px;
        }
        
        .discount-display {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: rgba(16, 185, 129, 0.1);
          border-radius: 12px;
          color: #10b981;
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 16px;
        }
        
        .promo-details {
          margin-bottom: 16px;
        }
        
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid rgba(148, 163, 184, 0.1);
        }
        
        .detail-row:last-child {
          border-bottom: none;
        }
        
        .detail-label {
          font-size: 13px;
          color: #64748b;
        }
        
        .detail-value {
          font-size: 13px;
          font-weight: 500;
          color: #f1f5f9;
        }
        
        .detail-value.revenue {
          color: #10b981;
        }
        
        .usage-bar {
          height: 6px;
          background: rgba(148, 163, 184, 0.2);
          border-radius: 3px;
          overflow: hidden;
          margin: 8px 0;
        }
        
        .usage-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.3s;
        }
        
        .promo-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 16px;
        }
        
        .tag {
          font-size: 10px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 20px;
          text-transform: uppercase;
          background: rgba(148, 163, 184, 0.15);
          color: #94a3b8;
        }
        
        .tag.gold {
          background: rgba(245, 158, 11, 0.15);
          color: #f59e0b;
        }
        
        .tag.platinum {
          background: rgba(168, 85, 247, 0.15);
          color: #a855f7;
        }
        
        .promo-status {
          text-align: center;
        }
        
        .status {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 600;
          padding: 6px 14px;
          border-radius: 20px;
        }
        
        .status.active {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
        }
        
        .status.paused {
          background: rgba(249, 115, 22, 0.15);
          color: #f97316;
        }
        
        .status.expired,
        .status.exhausted {
          background: rgba(148, 163, 184, 0.15);
          color: #94a3b8;
        }
      `}</style>
        </motion.div>
    );
}

function CreatePromoModal({ onClose }: { onClose: () => void }) {
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        discountType: 'percentage',
        discountValue: 10,
        maxUses: '',
        validFrom: '',
        validUntil: '',
        firstPurchaseOnly: false,
        applicablePlans: ['gold', 'platinum']
    });

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
                    <h3>Create Promo Code</h3>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    <div className="form-row">
                        <div className="form-group">
                            <label>Promo Code</label>
                            <input
                                type="text"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                placeholder="SUMMER2024"
                            />
                        </div>
                        <div className="form-group">
                            <label>Campaign Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Summer Sale"
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Discount Type</label>
                            <select
                                value={formData.discountType}
                                onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                            >
                                <option value="percentage">Percentage</option>
                                <option value="fixed_amount">Fixed Amount</option>
                                <option value="free_trial">Free Trial (days)</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>
                                {formData.discountType === 'percentage' ? 'Percentage' :
                                    formData.discountType === 'fixed_amount' ? 'Amount ($)' : 'Days'}
                            </label>
                            <input
                                type="number"
                                value={formData.discountValue}
                                onChange={(e) => setFormData({ ...formData, discountValue: parseInt(e.target.value) })}
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Valid From</label>
                            <input
                                type="date"
                                value={formData.validFrom}
                                onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label>Valid Until</label>
                            <input
                                type="date"
                                value={formData.validUntil}
                                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Max Uses (leave empty for unlimited)</label>
                            <input
                                type="number"
                                value={formData.maxUses}
                                onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                                placeholder="Unlimited"
                            />
                        </div>
                    </div>

                    <div className="form-checkbox">
                        <input
                            type="checkbox"
                            id="firstPurchaseOnly"
                            checked={formData.firstPurchaseOnly}
                            onChange={(e) => setFormData({ ...formData, firstPurchaseOnly: e.target.checked })}
                        />
                        <label htmlFor="firstPurchaseOnly">First purchase only</label>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn-primary">Create Promo Code</button>
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
          max-width: 500px;
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
        
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
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
        .form-group select {
          padding: 12px 16px;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 10px;
          color: #f1f5f9;
          font-size: 14px;
          outline: none;
        }
        
        .form-checkbox {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 8px;
        }
        
        .form-checkbox input[type="checkbox"] {
          width: 18px;
          height: 18px;
          accent-color: #a855f7;
        }
        
        .form-checkbox label {
          font-size: 14px;
          color: #94a3b8;
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

export default function PromoCodesPage() {
    const [promoCodes, setPromoCodes] = useState(mockPromoCodes);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [filter, setFilter] = useState<'all' | 'active' | 'expired'>('all');

    const togglePromo = (id: string) => {
        setPromoCodes(prev => prev.map(p =>
            p.id === id ? { ...p, isActive: !p.isActive } : p
        ));
    };

    const filteredPromos = promoCodes.filter(p => {
        if (filter === 'active') return p.isActive;
        if (filter === 'expired') return !p.isActive || new Date(p.validUntil) < new Date();
        return true;
    });

    return (
        <div className="promo-codes-page">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1>Promo Codes</h1>
                    <p>Create and manage discount campaigns</p>
                </div>
                <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                    <Plus size={16} />
                    Create Code
                </button>
            </div>

            {/* Stats */}
            <PromoStats />

            {/* Filters */}
            <div className="filters">
                {(['all', 'active', 'expired'] as const).map((f) => (
                    <button
                        key={f}
                        className={`filter-btn ${filter === f ? 'active' : ''}`}
                        onClick={() => setFilter(f)}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            {/* Promo Codes Grid */}
            <div className="promo-grid">
                {filteredPromos.map((promo) => (
                    <PromoCodeCard
                        key={promo.id}
                        promo={promo}
                        onToggle={togglePromo}
                        onEdit={() => { }}
                    />
                ))}
            </div>

            {/* Create Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <CreatePromoModal onClose={() => setShowCreateModal(false)} />
                )}
            </AnimatePresence>

            <style jsx>{`
        .promo-codes-page {
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
          gap: 8px;
          margin-bottom: 24px;
        }
        
        .filter-btn {
          padding: 10px 20px;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 10px;
          color: #94a3b8;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .filter-btn.active {
          background: rgba(168, 85, 247, 0.2);
          border-color: rgba(168, 85, 247, 0.4);
          color: #a855f7;
        }
        
        .promo-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 20px;
        }
      `}</style>
        </div>
    );
}
