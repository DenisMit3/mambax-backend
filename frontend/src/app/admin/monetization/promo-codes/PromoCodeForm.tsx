'use client';

import { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { adminApi } from '@/services/adminApi';
import styles from '../../admin.module.css';

interface PromoCodeFormProps {
  onClose: () => void;
  onCreated: () => void;
}

// Модалка создания промокода
export function PromoCodeForm({ onClose, onCreated }: PromoCodeFormProps) {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    discount_type: 'percentage',
    discount_value: 10,
    max_uses: '',
    valid_from: '',
    valid_until: '',
    first_purchase_only: false,
    applicable_plans: ['gold', 'platinum']
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await adminApi.monetization.promoCodes.create({
        code: formData.code,
        name: formData.name,
        discount_type: formData.discount_type,
        discount_value: formData.discount_value,
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
        valid_from: formData.valid_from ? new Date(formData.valid_from).toISOString() : undefined,
        valid_until: formData.valid_until ? new Date(formData.valid_until).toISOString() : undefined,
        first_purchase_only: formData.first_purchase_only,
        applicable_plans: formData.applicable_plans,
      });
      onCreated();
      onClose();
    } catch {
      setError('Не удалось создать промокод. Попробуйте ещё раз.');
    } finally {
      setSubmitting(false);
    }
  };

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
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

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
                value={formData.discount_type}
                onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
              >
                <option value="percentage">Процент</option>
                <option value="fixed_amount">Fixed Amount</option>
                <option value="free_trial">Free Trial (days)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-[var(--admin-text-muted)]">
                {formData.discount_type === 'percentage' ? 'Процент' :
                  formData.discount_type === 'fixed_amount' ? 'Amount ($)' : 'Days'}
              </label>
              <input
                type="number"
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-sm text-[var(--admin-text-primary)] focus:outline-none focus:border-purple-500"
                value={formData.discount_value}
                onChange={(e) => setFormData({ ...formData, discount_value: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-[var(--admin-text-muted)]">Valid From</label>
              <input
                type="date"
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-sm text-[var(--admin-text-primary)] focus:outline-none focus:border-purple-500"
                value={formData.valid_from}
                onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-[var(--admin-text-muted)]">Valid Until</label>
              <input
                type="date"
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-sm text-[var(--admin-text-primary)] focus:outline-none focus:border-purple-500"
                value={formData.valid_until}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-[var(--admin-text-muted)]">Max Uses (leave empty for unlimited)</label>
            <input
              type="number"
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-sm text-[var(--admin-text-primary)] focus:outline-none focus:border-purple-500"
              value={formData.max_uses}
              onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
              placeholder="Unlimited"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="firstPurchaseOnly"
              className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-slate-800 border-slate-600"
              checked={formData.first_purchase_only}
              onChange={(e) => setFormData({ ...formData, first_purchase_only: e.target.checked })}
            />
            <label htmlFor="firstPurchaseOnly" className="text-sm text-[var(--admin-text-secondary)]">First purchase only</label>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-[var(--admin-glass-border)]">
          <button className={styles.secondaryButton} onClick={onClose} disabled={submitting}>Отмена</button>
          <button
            className={styles.primaryButton}
            onClick={handleSubmit}
            disabled={submitting || !formData.code || !formData.name}
          >
            {submitting ? 'Creating...' : 'Create Promo Code'}
          </button>
        </div>
      </GlassCard>
    </div>
  );
}
