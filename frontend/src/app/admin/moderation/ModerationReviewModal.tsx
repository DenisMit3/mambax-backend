'use client';

import { motion } from 'framer-motion';
import { Image, CheckCircle, XCircle, Ban } from 'lucide-react';
import type { QueueItem } from './types';

interface ModerationReviewModalProps {
  item: QueueItem;
  onClose: () => void;
  onAction: (action: string, item: QueueItem) => void;
}

export function ModerationReviewModal({ item, onClose, onAction }: ModerationReviewModalProps) {
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
          <h3 className="text-lg font-semibold text-[var(--admin-text-primary)]">Проверка контента</h3>
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
                <span className="text-sm">Предпросмотр фото</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex justify-between py-2.5 border-b border-slate-700/10">
              <span className="text-sm text-[var(--admin-text-muted)]">Тип:</span>
              <span className="text-sm font-medium text-[var(--admin-text-primary)]">{item.type}</span>
            </div>
            <div className="flex justify-between py-2.5 border-b border-slate-700/10">
              <span className="text-sm text-[var(--admin-text-muted)]">Пользователь:</span>
              <span className="text-sm font-medium text-[var(--admin-text-primary)]">{item.user_name}</span>
            </div>
            <div className="flex justify-between py-2.5 border-b border-slate-700/10">
              <span className="text-sm text-[var(--admin-text-muted)]">AI Скор:</span>
              <span className="text-sm font-medium text-[var(--admin-text-primary)]">{item.ai_score}%</span>
            </div>
            <div className="flex justify-between py-2.5 border-b border-slate-700/10">
              <span className="text-sm text-[var(--admin-text-muted)]">Flags:</span>
              <span className="text-sm font-medium text-[var(--admin-text-primary)]">{item.ai_flags?.join(', ') || 'Нет'}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-6 bg-slate-800/30 border-t border-slate-700/20">
          <button
            className="flex-1 flex items-center justify-center gap-2 p-3.5 rounded-xl text-sm font-semibold bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all"
            onClick={() => { onAction('approve', item); onClose(); }}
          >
            <CheckCircle size={18} /> Одобрить
          </button>
          <button
            className="flex-1 flex items-center justify-center gap-2 p-3.5 rounded-xl text-sm font-semibold bg-orange-500/20 text-orange-500 hover:bg-orange-500 hover:text-white transition-all"
            onClick={() => { onAction('reject', item); onClose(); }}
          >
            <XCircle size={18} /> Отклонить
          </button>
          <button
            className="flex-1 flex items-center justify-center gap-2 p-3.5 rounded-xl text-sm font-semibold bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all"
            onClick={() => { onAction('ban', item); onClose(); }}
          >
            <Ban size={18} /> Заблокировать
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
