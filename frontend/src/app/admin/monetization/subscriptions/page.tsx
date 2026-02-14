'use client';

import { useState, useEffect } from 'react';
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
  X,
  Loader2
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import styles from '../../admin.module.css';
import { adminApi, RevenueMetrics, SubscriptionPlan } from '@/services/adminApi';
import { Toast } from '@/components/ui/Toast';

interface Plan {
  id: string;
  name: string;
  tier: 'free' | 'gold' | 'platinum';
  price: number;
  currency: string;
  duration: number;
  subscribers: number;
  mrr: number;
  isActive: boolean;
  isPopular: boolean;
  features: Record<string, boolean | number>;
}

function SubscriptionStats({ metrics }: { metrics: RevenueMetrics | null }) {
  if (!metrics) return <div className="h-32 bg-white/5 animate-pulse rounded-xl mb-8" />;

  const totalSubs = metrics.subscription_breakdown.free.count +
    metrics.subscription_breakdown.gold.count +
    metrics.subscription_breakdown.platinum.count;

  const premiumSubs = metrics.subscription_breakdown.gold.count +
    metrics.subscription_breakdown.platinum.count;

  // Calculate change percentages (mocked for now as we don't have historical data in this response)
  const stats = [
    { label: 'Всего подписчиков', value: totalSubs.toLocaleString(), icon: <Users size={18} />, color: '#3b82f6', change: '+0%' },
    { label: 'Премиум пользователи', value: premiumSubs.toLocaleString(), icon: <Crown size={18} />, color: '#f59e0b', change: '+0%' },
    { label: 'Месячный доход', value: `$${metrics.month.toLocaleString()}`, icon: <DollarSign size={18} />, color: '#10b981', change: '+0%' },
    { label: 'ARPPU', value: `$${metrics.arppu.toFixed(2)}`, icon: <TrendingUp size={18} />, color: '#a855f7', change: '+0%' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat) => (
        <GlassCard
          key={stat.label}
          className="p-5"
        >
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${stat.color}33`, color: stat.color }}>
              {stat.icon}
            </div>
            {/* <span className="text-xs font-semibold text-emerald-500">{stat.change}</span> */}
          </div>
          <div>
            <span className="block text-2xl font-bold text-[var(--admin-text-primary)]">{stat.value}</span>
            <span className="text-xs text-[var(--admin-text-muted)]">{stat.label}</span>
          </div>
        </GlassCard>
      ))}
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

  // Ensure features object exists
  const features = plan.features || {};

  const featureLabels: Record<string, string> = {
    unlimited_swipes: 'Безлимитные свайпы',
    see_who_likes_you: 'Кто тебя лайкнул',
    boosts_per_month: 'Бустов/месяц',
    super_likes_per_day: 'Суперлайков/день',
    incognito_mode: 'Режим инкогнито',
    advanced_filters: 'Расширенные фильтры',
  };

  return (
    <GlassCard
      className="p-6 relative transition-transform duration-300 hover:scale-[1.01]"
      style={{ borderColor: colors.border, borderWidth: '2px' }}
    >
      {/* Popular Badge hardcoded for now or derived */}
      {plan.tier === 'gold' && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[11px] font-semibold rounded-full shadow-lg">
          <Star size={12} fill="white" /> Самый популярный
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider" style={{ background: colors.bg, color: colors.color }}>
          <Crown size={14} />
          {plan.tier}
        </div>
        <button className={styles.iconButton} onClick={() => onEdit(plan)}>
          <Edit size={14} />
        </button>
      </div>

      <h3 className="text-2xl font-bold text-[var(--admin-text-primary)] mb-2">{plan.name}</h3>

      <div className="flex items-baseline gap-0.5 mb-5">
        {/* <span className="text-lg text-[var(--admin-text-muted)]">$</span> */}
        <span className="text-4xl font-bold text-[var(--admin-text-primary)]">{plan.price}</span>
        <span className="text-lg text-[var(--admin-text-muted)] ml-1">{plan.currency}</span>
        {plan.duration > 0 && <span className="text-sm text-[var(--admin-text-muted)] ml-1">/{plan.duration} days</span>}
      </div>

      <div className="grid grid-cols-2 gap-4 py-4 border-t border-b border-[var(--admin-glass-border)] mb-4">
        <div className="text-center">
          <span className="block text-lg font-bold text-[var(--admin-text-primary)]">{plan.subscribers.toLocaleString()}</span>
          <span className="text-[11px] text-[var(--admin-text-muted)]">Подписчики</span>
        </div>
        <div className="text-center">
          <span className="block text-lg font-bold text-[var(--admin-text-primary)]">{Math.round(plan.mrr).toLocaleString()}</span>
          <span className="text-[11px] text-[var(--admin-text-muted)]">Расч. доход</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 mb-4">
        {Object.entries(features).map(([key, value]) => (
          <div key={key} className="flex justify-between items-center text-sm">
            <span className="text-[var(--admin-text-muted)]">{featureLabels[key] || key.replace(/_/g, ' ')}</span>
            <span className="font-medium text-[var(--admin-text-primary)]">
              {typeof value === 'boolean' ? (
                value ? <CheckCircle size={14} className="text-emerald-500" /> : <XCircle size={14} className="text-slate-500" />
              ) : (
                value === 999 ? '∞' : value
              )}
            </span>
          </div>
        ))}
      </div>

      <div className="text-center">
        {plan.isActive ? (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-500"><CheckCircle size={12} /> Активен</span>
        ) : (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-slate-500/15 text-slate-500"><XCircle size={12} /> Неактивен</span>
        )}
      </div>
    </GlassCard>
  );
}

function PlanEditor({ plan, onClose, onSave, onDelete }: { plan: Plan | null; onClose: () => void; onSave: (plan: Plan) => void; onDelete?: (id: string) => void }) {
  const [editedPlan, setEditedPlan] = useState<Plan>(plan || {
    id: '',
    name: '',
    tier: 'gold',
    price: 0,
    currency: 'XTR',
    duration: 30,
    subscribers: 0,
    mrr: 0,
    isActive: true,
    isPopular: false,
    features: {
      unlimited_swipes: false,
      see_who_likes_you: false,
      boosts_per_month: 0,
      super_likes_per_day: 0,
      incognito_mode: false,
      advanced_filters: false,
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <GlassCard
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-5 border-b border-[var(--admin-glass-border)]">
          <h3 className="text-xl font-semibold text-[var(--admin-text-primary)]">{plan ? 'Редактировать план' : 'Создать план'}</h3>
          <button className={styles.iconButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-[var(--admin-text-muted)] font-medium">Название плана</label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-sm text-[var(--admin-text-primary)] focus:outline-none focus:border-blue-500"
                value={editedPlan.name}
                onChange={(e) => setEditedPlan({ ...editedPlan, name: e.target.value })}
                placeholder="Gold Plus"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-[var(--admin-text-muted)] font-medium">Уровень</label>
              <select
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-sm text-[var(--admin-text-primary)] focus:outline-none focus:border-blue-500"
                value={editedPlan.tier}
                onChange={(e) => setEditedPlan({ ...editedPlan, tier: e.target.value as 'free' | 'gold' | 'platinum' })}
              >
                <option value="free">Бесплатный</option>
                <option value="gold">Gold</option>
                <option value="platinum">Platinum</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-[var(--admin-text-muted)] font-medium">Цена (XTR)</label>
              <input
                type="number"
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-sm text-[var(--admin-text-primary)] focus:outline-none focus:border-blue-500"
                value={editedPlan.price}
                onChange={(e) => setEditedPlan({ ...editedPlan, price: parseFloat(e.target.value) })}
                step="1"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-[var(--admin-text-muted)] font-medium">Длительность (дни)</label>
              <input
                type="number"
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-sm text-[var(--admin-text-primary)] focus:outline-none focus:border-blue-500"
                value={editedPlan.duration}
                onChange={(e) => setEditedPlan({ ...editedPlan, duration: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <h4 className="text-base font-semibold text-[var(--admin-text-primary)] mb-4">Функции</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(editedPlan.features).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center p-3 bg-slate-800/40 rounded-xl">
                  <span className="text-sm text-[var(--admin-text-muted)] capitalize">{key.replace(/_/g, ' ')}</span>
                  {typeof value === 'boolean' ? (
                    <button
                      className={`transition-colors ${value ? 'text-emerald-500' : 'text-slate-600'}`}
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
                      className="w-16 px-2 py-1 bg-slate-900/50 border border-slate-700/50 rounded-lg text-sm text-center text-[var(--admin-text-primary)]"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center p-5 border-t border-[var(--admin-glass-border)]">
          <div>
            {plan && onDelete && (
              <button
                className="px-4 py-2 text-sm font-semibold text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
                onClick={() => {
                    if (confirm('Вы уверены, что хотите удалить этот план?')) {
                    onDelete(plan.id);
                  }
                }}
              >
                Удалить план
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button className={styles.secondaryButton} onClick={onClose}>Отмена</button>
            <button className={styles.primaryButton} onClick={() => onSave(editedPlan)}>
              {plan ? 'Сохранить' : 'Создать план'}
            </button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

export default function SubscriptionsPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [toast, setToast] = useState<{message: string; type: 'success' | 'error'} | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [plansRes, metricsRes] = await Promise.all([
        adminApi.monetization.getPlans(true),
        adminApi.monetization.getRevenue()
      ]);

      setMetrics(metricsRes);

      // Map backend plans to frontend interface
      const mappedPlans: Plan[] = plansRes.plans.map((p: SubscriptionPlan) => {
        // Determine sub count from metrics
        let subs = 0;
        if (metricsRes.subscription_breakdown) {
          if (p.tier === 'free') subs = metricsRes.subscription_breakdown.free.count;
          if (p.tier === 'gold') subs = metricsRes.subscription_breakdown.gold.count;
          if (p.tier === 'platinum') subs = metricsRes.subscription_breakdown.platinum.count;
        }

        return {
          id: p.id,
          name: p.name,
          tier: p.tier,
          price: p.price,
          currency: p.currency,
          duration: p.duration_days,
          subscribers: subs,
          mrr: p.price * subs, // Approximate
          isActive: p.is_active,
          isPopular: p.is_popular,
          features: {
            unlimited_swipes: p.unlimited_swipes || false,
            see_who_likes_you: p.see_who_likes_you || false,
            incognito_mode: p.incognito_mode || false,
            boosts_per_month: p.boosts_per_month || 0,
            super_likes_per_day: p.super_likes_per_day || 0,
            advanced_filters: p.advanced_filters || false,
            rewind_unlimited: p.rewind_unlimited || false,
            priority_listing: p.priority_listing || false,
            read_receipts: p.read_receipts || false,
            profile_boost: p.profile_boost || false,
          }
        };
      });
      setPlans(mappedPlans);

    } catch (error) {
      console.error("Failed to load subs data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setShowEditor(true);
  };

  const handleSave = async (plan: Plan) => {
    try {
      const payload = {
        name: plan.name,
        tier: plan.tier,
        price: plan.price,
        currency: plan.currency,
        duration_days: plan.duration,
        is_active: plan.isActive,
        is_popular: plan.isPopular,
        features: plan.features
      };

      if (plan.id) {
        await adminApi.monetization.updatePlan(plan.id, payload);
      } else {
        await adminApi.monetization.createPlan(payload);
      }

      await loadData();
      setShowEditor(false);
      setEditingPlan(null);
    } catch (e) {
      console.error("Failed to save plan", e);
      setToast({message: "Не удалось сохранить план", type: 'error'});
    }
  };

  const handleDelete = async (planId: string) => {
    try {
      await adminApi.monetization.deletePlan(planId);
      await loadData();
      setShowEditor(false);
      setEditingPlan(null);
    } catch (e) {
      console.error("Failed to delete plan", e);
      setToast({message: "Не удалось удалить план", type: 'error'});
    }
  };

  if (loading) return <div className="p-8"><Loader2 className="animate-spin" /> Загрузка...</div>;

  return (
    <div className={styles.pageContainer}>
      {/* Header */}
      <div className={styles.headerSection}>
        <div className={styles.headerContent}>
          <h1 className={styles.headerTitle}>Управление подписками</h1>
          <p className={styles.headerDescription}>Управление планами подписок и ценами</p>
        </div>
        <button className={styles.primaryButton} onClick={() => { setEditingPlan(null); setShowEditor(true); }}>
          <Plus size={16} />
          Создать план
        </button>
      </div>

      {/* Stats */}
      <SubscriptionStats metrics={metrics} />

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} onEdit={handleEdit} />
        ))}
      </div>

      {/* Editor Modal */}
      <AnimatePresence>
        {showEditor && (
          <PlanEditor
            plan={editingPlan}
            onClose={() => setShowEditor(false)}
            onSave={handleSave}
            onDelete={handleDelete}
          />
        )}
      </AnimatePresence>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
