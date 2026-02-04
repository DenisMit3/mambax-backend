'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Tag,
  Percent,
  DollarSign,
  Users,
  TrendingUp,
  Plus,
  Edit,
  Copy,
  CheckCircle,
  XCircle,
  Clock,
  Gift,
  ToggleLeft,
  ToggleRight,
  X
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import styles from '../../admin.module.css';

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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat) => (
        <GlassCard
          key={stat.label}
          className="p-5 flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-opacity-20" style={{ backgroundColor: `${stat.color}33`, color: stat.color }}>
            {stat.icon}
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold text-[var(--admin-text-primary)]">{stat.value}</span>
            <span className="text-xs text-[var(--admin-text-muted)]">{stat.label}</span>
          </div>
        </GlassCard>
      ))}
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
    <GlassCard
      className={`p-6 transition-opacity duration-300 ${!promo.isActive ? 'opacity-75' : ''}`}
      hover={true}
    >
      <div className="flex justify-between items-center mb-4">
        <div
          className="flex items-center gap-2 px-3 py-2 bg-purple-500/15 border border-purple-500/30 rounded-lg text-purple-400 cursor-pointer hover:bg-purple-500/25 transition-colors group"
          onClick={copyCode}
        >
          <span className="font-mono font-bold text-sm tracking-widest">{promo.code}</span>
          {copied ? <CheckCircle size={14} /> : <Copy size={14} className="opacity-70 group-hover:opacity-100" />}
        </div>
        <div className="flex gap-2">
          <button className={styles.iconButton} onClick={() => onEdit(promo)}>
            <Edit size={14} />
          </button>
          <button
            className={`bg-transparent border-none cursor-pointer transition-colors ${promo.isActive ? 'text-emerald-500' : 'text-slate-500'}`}
            onClick={() => onToggle(promo.id)}
          >
            {promo.isActive ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
          </button>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-[var(--admin-text-primary)] mb-3">{promo.name}</h3>

      <div className="flex items-center gap-2 px-4 py-3 bg-emerald-500/10 rounded-xl text-emerald-500 text-xl font-bold mb-4">
        {promo.discountType === 'percentage' && <Percent size={20} />}
        {promo.discountType === 'fixed_amount' && <DollarSign size={20} />}
        {promo.discountType === 'free_trial' && <Gift size={20} />}
        <span>{getDiscountDisplay()}</span>
      </div>

      <div className="flex flex-col gap-3 mb-4">
        <div className="flex justify-between py-2 border-b border-[var(--admin-glass-border)]">
          <span className="text-sm text-[var(--admin-text-muted)]">Redemptions</span>
          <span className="text-sm font-medium text-[var(--admin-text-primary)]">
            {promo.currentUses.toLocaleString()}
            {promo.maxUses && ` / ${promo.maxUses.toLocaleString()}`}
          </span>
        </div>

        {promo.maxUses && (
          <div className="h-1.5 bg-slate-700/30 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${usagePercent}%`,
                background: usagePercent >= 90 ? '#ef4444' : usagePercent >= 70 ? '#f59e0b' : '#10b981'
              }}
            />
          </div>
        )}

        <div className="flex justify-between py-2 border-b border-[var(--admin-glass-border)]">
          <span className="text-sm text-[var(--admin-text-muted)]">Valid Until</span>
          <span className="text-sm font-medium text-[var(--admin-text-primary)]">
            {new Date(promo.validUntil).toLocaleDateString()}
          </span>
        </div>

        <div className="flex justify-between py-2">
          <span className="text-sm text-[var(--admin-text-muted)]">Revenue Generated</span>
          <span className="text-sm font-bold text-emerald-500">${promo.revenueGenerated.toLocaleString()}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {promo.firstPurchaseOnly && (
          <span className="px-2.5 py-1 rounded-full text-[10px] uppercase font-bold bg-slate-700/30 text-slate-400">First Purchase</span>
        )}
        {promo.applicablePlans.map(plan => (
          <span
            key={plan}
            className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold bg-slate-700/30 ${plan === 'gold' ? 'text-amber-500 bg-amber-500/10' :
              plan === 'platinum' ? 'text-purple-500 bg-purple-500/10' : 'text-slate-400'
              }`}
          >
            {plan}
          </span>
        ))}
      </div>

      <div className="flex justify-center mt-auto">
        {isExpired ? (
          <span className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-800/50 text-slate-400"><Clock size={12} /> Expired</span>
        ) : isExhausted ? (
          <span className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-800/50 text-slate-400"><XCircle size={12} /> Fully Used</span>
        ) : promo.isActive ? (
          <span className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-500"><CheckCircle size={12} /> Active</span>
        ) : (
          <span className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-orange-500/15 text-orange-500"><Clock size={12} /> Paused</span>
        )}
      </div>
    </GlassCard>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <GlassCard
        className="w-full max-w-lg overflow-hidden"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-5 border-b border-[var(--admin-glass-border)]">
          <h3 className="text-xl font-semibold text-[var(--admin-text-primary)]">Create Promo Code</h3>
          <button className={styles.iconButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-[var(--admin-text-muted)]">Promo Code</label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-sm text-[var(--admin-text-primary)] focus:outline-none focus:border-purple-500"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="SUMMER2024"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-[var(--admin-text-muted)]">Campaign Name</label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-sm text-[var(--admin-text-primary)] focus:outline-none focus:border-purple-500"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Summer Sale"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-[var(--admin-text-muted)]">Discount Type</label>
              <select
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-sm text-[var(--admin-text-primary)] focus:outline-none focus:border-purple-500"
                value={formData.discountType}
                onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
              >
                <option value="percentage">Percentage</option>
                <option value="fixed_amount">Fixed Amount</option>
                <option value="free_trial">Free Trial (days)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-[var(--admin-text-muted)]">
                {formData.discountType === 'percentage' ? 'Percentage' :
                  formData.discountType === 'fixed_amount' ? 'Amount ($)' : 'Days'}
              </label>
              <input
                type="number"
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-sm text-[var(--admin-text-primary)] focus:outline-none focus:border-purple-500"
                value={formData.discountValue}
                onChange={(e) => setFormData({ ...formData, discountValue: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-[var(--admin-text-muted)]">Valid From</label>
              <input
                type="date"
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-sm text-[var(--admin-text-primary)] focus:outline-none focus:border-purple-500"
                value={formData.validFrom}
                onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-[var(--admin-text-muted)]">Valid Until</label>
              <input
                type="date"
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-sm text-[var(--admin-text-primary)] focus:outline-none focus:border-purple-500"
                value={formData.validUntil}
                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-[var(--admin-text-muted)]">Max Uses (leave empty for unlimited)</label>
            <input
              type="number"
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-sm text-[var(--admin-text-primary)] focus:outline-none focus:border-purple-500"
              value={formData.maxUses}
              onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
              placeholder="Unlimited"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="firstPurchaseOnly"
              className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-slate-800 border-slate-600"
              checked={formData.firstPurchaseOnly}
              onChange={(e) => setFormData({ ...formData, firstPurchaseOnly: e.target.checked })}
            />
            <label htmlFor="firstPurchaseOnly" className="text-sm text-[var(--admin-text-secondary)]">First purchase only</label>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-[var(--admin-glass-border)]">
          <button className={styles.secondaryButton} onClick={onClose}>Cancel</button>
          <button className={styles.primaryButton}>Create Promo Code</button>
        </div>
      </GlassCard>
    </div>
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
      <PromoStats />

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(['all', 'active', 'expired'] as const).map((f) => (
          <button
            key={f}
            className={`px-4 py-2 rounded-lg text-sm transition-all duration-200 ${filter === f
              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
              : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-800'
              }`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Promo Codes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
    </div>
  );
}
