'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  Users,
  Crown,
  Zap,
  Gift,
  Tag,
  Percent,
  Clock,
  CheckCircle,
  XCircle,
  Edit,
  Plus,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
  Star,
  Shield,
} from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  tier: string;
  price: number;
  currency: string;
  duration: number;
  subscribers: number;
  mrr: number;
  isActive: boolean;
  isPopular: boolean;
  features: Record<string, boolean | number>;
}

// Mock subscription plans data
const subscriptionPlans: Plan[] = [
  {
    id: 'plan-free',
    name: 'Free',
    tier: 'free',
    price: 0,
    currency: 'USD',
    duration: 0,
    subscribers: 45892,
    mrr: 0,
    isActive: true,
    isPopular: false,
    features: {
      unlimitedSwipes: false,
      seeWhoLikesYou: false,
      boostsPerMonth: 0,
      superLikesPerDay: 1,
      rewindUnlimited: false,
      incognitoMode: false,
      advancedFilters: false,
      priorityListing: false,
      messageBeforeMatch: false,
    }
  },
  {
    id: 'plan-gold',
    name: 'Gold',
    tier: 'gold',
    price: 29.99,
    currency: 'USD',
    duration: 30,
    subscribers: 12458,
    mrr: 373527.42,
    isActive: true,
    isPopular: true,
    features: {
      unlimitedSwipes: true,
      seeWhoLikesYou: true,
      boostsPerMonth: 1,
      superLikesPerDay: 5,
      rewindUnlimited: true,
      incognitoMode: false,
      advancedFilters: true,
      priorityListing: false,
      messageBeforeMatch: false,
    }
  },
  {
    id: 'plan-platinum',
    name: 'Platinum',
    tier: 'platinum',
    price: 49.99,
    currency: 'USD',
    duration: 30,
    subscribers: 3847,
    mrr: 192311.53,
    isActive: true,
    isPopular: false,
    features: {
      unlimitedSwipes: true,
      seeWhoLikesYou: true,
      boostsPerMonth: 5,
      superLikesPerDay: 999,
      rewindUnlimited: true,
      incognitoMode: true,
      advancedFilters: true,
      priorityListing: true,
      messageBeforeMatch: true,
    }
  },
];

function SubscriptionStats() {
  const stats = [
    { label: 'Total Subscribers', value: '62.2K', icon: <Users size={18} />, color: '#3b82f6', change: '+12.3%' },
    { label: 'Premium Users', value: '16.3K', icon: <Crown size={18} />, color: '#f59e0b', change: '+8.5%' },
    { label: 'Monthly MRR', value: '$565.8K', icon: <DollarSign size={18} />, color: '#10b981', change: '+15.2%' },
    { label: 'Conversion Rate', value: '26.2%', icon: <TrendingUp size={18} />, color: '#a855f7', change: '+2.1%' },
  ];

  return (
    <div className="subscription-stats">
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
          <span className="stat-change" style={{ color: '#10b981' }}>{stat.change}</span>
        </motion.div>
      ))}

      <style jsx>{`
        .subscription-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        
        @media (max-width: 1200px) {
          .subscription-stats {
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
          flex: 1;
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
        
        .stat-change {
          font-size: 12px;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}

function PlanCard({ plan, onEdit }: { plan: Plan; onEdit: (plan: Plan) => void }) {
  const tierColors = {
    free: { bg: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', border: 'rgba(148, 163, 184, 0.3)' },
    gold: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' },
    platinum: { bg: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', border: 'rgba(168, 85, 247, 0.3)' },
  };

  const colors = tierColors[plan.tier as keyof typeof tierColors] || tierColors.free;

  const featureLabels: Record<string, string> = {
    unlimitedSwipes: 'Unlimited Swipes',
    seeWhoLikesYou: 'See Who Likes You',
    boostsPerMonth: 'Boosts/Month',
    superLikesPerDay: 'Super Likes/Day',
    rewindUnlimited: 'Unlimited Rewind',
    incognitoMode: 'Incognito Mode',
    advancedFilters: 'Advanced Filters',
    priorityListing: 'Priority Listing',
    messageBeforeMatch: 'Message Before Match',
  };

  return (
    <motion.div
      className="plan-card"
      style={{ borderColor: colors.border }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
    >
      {plan.isPopular && (
        <div className="popular-badge">
          <Star size={12} /> Most Popular
        </div>
      )}

      <div className="plan-header">
        <div className="tier-badge" style={{ background: colors.bg, color: colors.color }}>
          <Crown size={16} />
          {plan.tier.toUpperCase()}
        </div>
        <button className="edit-btn" onClick={() => onEdit(plan)}>
          <Edit size={14} />
        </button>
      </div>

      <h3 className="plan-name">{plan.name}</h3>

      <div className="plan-price">
        <span className="currency">$</span>
        <span className="amount">{plan.price}</span>
        {plan.duration > 0 && <span className="period">/{plan.duration} days</span>}
      </div>

      <div className="plan-stats">
        <div className="stat">
          <span className="stat-value">{plan.subscribers.toLocaleString()}</span>
          <span className="stat-label">Subscribers</span>
        </div>
        <div className="stat">
          <span className="stat-value">${(plan.mrr / 1000).toFixed(1)}K</span>
          <span className="stat-label">MRR</span>
        </div>
      </div>

      <div className="plan-features">
        {Object.entries(plan.features).map(([key, value]) => (
          <div key={key} className="feature-row">
            <span className="feature-name">{featureLabels[key] || key}</span>
            <span className="feature-value">
              {typeof value === 'boolean' ? (
                value ? <CheckCircle size={14} className="check" /> : <XCircle size={14} className="x" />
              ) : (
                value === 999 ? '∞' : value
              )}
            </span>
          </div>
        ))}
      </div>

      <div className="plan-status">
        {plan.isActive ? (
          <span className="status active"><CheckCircle size={12} /> Active</span>
        ) : (
          <span className="status inactive"><XCircle size={12} /> Inactive</span>
        )}
      </div>

      <style jsx>{`
        .plan-card {
          position: relative;
          padding: 24px;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(20px);
          border: 2px solid;
          border-radius: 20px;
          transition: all 0.3s ease;
        }
        
        .popular-badge {
          position: absolute;
          top: -10px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 12px;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
          font-size: 11px;
          font-weight: 600;
          border-radius: 20px;
          white-space: nowrap;
        }
        
        .plan-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        
        .tier-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
        }
        
        .edit-btn {
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
          transition: all 0.2s;
        }
        
        .edit-btn:hover {
          background: rgba(59, 130, 246, 0.2);
          color: #3b82f6;
        }
        
        .plan-name {
          font-size: 24px;
          font-weight: 700;
          color: #f1f5f9;
          margin-bottom: 8px;
        }
        
        .plan-price {
          display: flex;
          align-items: baseline;
          gap: 2px;
          margin-bottom: 20px;
        }
        
        .currency {
          font-size: 18px;
          color: #94a3b8;
        }
        
        .amount {
          font-size: 36px;
          font-weight: 700;
          color: #f1f5f9;
        }
        
        .period {
          font-size: 14px;
          color: #64748b;
          margin-left: 4px;
        }
        
        .plan-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          padding: 16px 0;
          border-top: 1px solid rgba(148, 163, 184, 0.1);
          border-bottom: 1px solid rgba(148, 163, 184, 0.1);
          margin-bottom: 16px;
        }
        
        .plan-stats .stat {
          text-align: center;
        }
        
        .plan-stats .stat-value {
          display: block;
          font-size: 18px;
          font-weight: 700;
          color: #f1f5f9;
        }
        
        .plan-stats .stat-label {
          font-size: 11px;
          color: #64748b;
        }
        
        .plan-features {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 16px;
        }
        
        .feature-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
        }
        
        .feature-name {
          color: #94a3b8;
        }
        
        .feature-value {
          color: #f1f5f9;
          font-weight: 500;
        }
        
        :global(.feature-value .check) {
          color: #10b981;
        }
        
        :global(.feature-value .x) {
          color: #64748b;
        }
        
        .plan-status {
          text-align: center;
        }
        
        .status {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 600;
          padding: 4px 12px;
          border-radius: 20px;
        }
        
        .status.active {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
        }
        
        .status.inactive {
          background: rgba(148, 163, 184, 0.15);
          color: #94a3b8;
        }
      `}</style>
    </motion.div>
  );
}

function PlanEditor({ plan, onClose, onSave }: { plan: Plan | null; onClose: () => void; onSave: (plan: Plan) => void }) {
  const [editedPlan, setEditedPlan] = useState<Plan>(plan || {
    id: '',
    name: '',
    tier: 'gold',
    price: 0,
    currency: 'USD',
    duration: 30,
    subscribers: 0,
    mrr: 0,
    isActive: true,
    isPopular: false,
    features: {
      unlimitedSwipes: false,
      seeWhoLikesYou: false,
      boostsPerMonth: 0,
      superLikesPerDay: 0,
      rewindUnlimited: false,
      incognitoMode: false,
      advancedFilters: false,
      priorityListing: false,
      messageBeforeMatch: false,
    }
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
          <h3>{plan ? 'Edit Plan' : 'Create Plan'}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="form-grid">
            <div className="form-group">
              <label>Plan Name</label>
              <input
                type="text"
                value={editedPlan.name}
                onChange={(e) => setEditedPlan({ ...editedPlan, name: e.target.value })}
                placeholder="Gold Plus"
              />
            </div>

            <div className="form-group">
              <label>Tier</label>
              <select
                value={editedPlan.tier}
                onChange={(e) => setEditedPlan({ ...editedPlan, tier: e.target.value })}
              >
                <option value="free">Free</option>
                <option value="gold">Gold</option>
                <option value="platinum">Platinum</option>
              </select>
            </div>

            <div className="form-group">
              <label>Price ($)</label>
              <input
                type="number"
                value={editedPlan.price}
                onChange={(e) => setEditedPlan({ ...editedPlan, price: parseFloat(e.target.value) })}
                step="0.01"
              />
            </div>

            <div className="form-group">
              <label>Duration (days)</label>
              <input
                type="number"
                value={editedPlan.duration}
                onChange={(e) => setEditedPlan({ ...editedPlan, duration: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <h4>Features</h4>
          <div className="features-grid">
            {Object.entries(editedPlan.features).map(([key, value]) => (
              <div key={key} className="feature-toggle">
                <span>{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                {typeof value === 'boolean' ? (
                  <button
                    className={`toggle ${value ? 'on' : 'off'}`}
                    onClick={() => setEditedPlan({
                      ...editedPlan,
                      features: { ...editedPlan.features, [key]: !value }
                    })}
                  >
                    {value ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                  </button>
                ) : (
                  <input
                    type="number"
                    value={value as number}
                    onChange={(e) => setEditedPlan({
                      ...editedPlan,
                      features: { ...editedPlan.features, [key]: parseInt(e.target.value) }
                    })}
                    className="feature-input"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => onSave(editedPlan)}>
            {plan ? 'Save Changes' : 'Create Plan'}
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
        
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 24px;
        }
        
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .form-group label {
          font-size: 13px;
          font-weight: 500;
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
        
        .modal-body h4 {
          font-size: 16px;
          font-weight: 600;
          color: #f1f5f9;
          margin-bottom: 16px;
        }
        
        .features-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        
        .feature-toggle {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: rgba(30, 41, 59, 0.4);
          border-radius: 10px;
        }
        
        .feature-toggle span {
          font-size: 13px;
          color: #94a3b8;
          text-transform: capitalize;
        }
        
        .toggle {
          background: transparent;
          border: none;
          cursor: pointer;
        }
        
        .toggle.on {
          color: #10b981;
        }
        
        .toggle.off {
          color: #64748b;
        }
        
        .feature-input {
          width: 60px;
          padding: 6px 10px;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 6px;
          color: #f1f5f9;
          font-size: 13px;
          text-align: center;
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
          transition: all 0.2s;
        }
        
        .btn-secondary {
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.2);
          color: #f1f5f9;
        }
        
        .btn-primary {
          background: linear-gradient(135deg, #10b981, #059669);
          border: none;
          color: white;
        }
      `}</style>
    </motion.div>
  );
}

export default function SubscriptionsPage() {
  const [plans, setPlans] = useState(subscriptionPlans);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setShowEditor(true);
  };

  const handleSave = (plan: Plan) => {
    if (editingPlan) {
      setPlans(prev => prev.map(p => p.id === plan.id ? plan : p));
    } else {
      setPlans(prev => [...prev, { ...plan, id: `plan-${Date.now()}` }]);
    }
    setShowEditor(false);
    setEditingPlan(null);
  };

  return (
    <div className="subscriptions-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Subscription Management</h1>
          <p>Manage subscription plans and pricing</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditingPlan(null); setShowEditor(true); }}>
          <Plus size={16} />
          Create Plan
        </button>
      </div>

      {/* Stats */}
      <SubscriptionStats />

      {/* Plans Grid */}
      <div className="plans-grid">
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} onEdit={handleEdit} />
        ))}
      </div>

      {/* Editor Modal */}
      <AnimatePresence>
        {showEditor && (
          <PlanEditor
            plan={editingPlan}
            onClose={() => { setShowEditor(false); setEditingPlan(null); }}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>

      <style jsx>{`
        .subscriptions-page {
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
          background: linear-gradient(135deg, #f59e0b, #d97706);
          border: none;
          border-radius: 12px;
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4);
        }
        
        .plans-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        
        @media (max-width: 1200px) {
          .plans-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        @media (max-width: 800px) {
          .plans-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
