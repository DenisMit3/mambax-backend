'use client';

// === Модалка создания кампании (2-step wizard) ===

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bell,
  Mail,
  MessageSquare,
  Megaphone,
  ChevronRight,
  X,
  AlertCircle,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { adminApi } from '@/services/adminApi';
import styles from '../../admin.module.css';
import type { Campaign } from './types';

// --- Типы кампаний для выбора ---

const campaignTypes: { id: Campaign['type']; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: 'push', label: 'Push Notification', icon: <Bell size={24} />, desc: 'Send instant mobile notifications' },
  { id: 'email', label: 'Email Campaign', icon: <Mail size={24} />, desc: 'Create email marketing campaigns' },
  { id: 'in_app', label: 'In-App Message', icon: <Megaphone size={24} />, desc: 'Display messages within the app' },
  { id: 'sms', label: 'SMS Campaign', icon: <MessageSquare size={24} />, desc: 'Send text message campaigns' },
];

// --- Пропсы ---

interface CreateCampaignModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export function CreateCampaignModal({ onClose, onCreated }: CreateCampaignModalProps) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    type: '' as '' | Campaign['type'],
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
