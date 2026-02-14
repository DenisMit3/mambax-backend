'use client';

import { motion } from 'framer-motion';
import { CreditCard, Crown, Zap, Star, Gift, DollarSign, Loader2 } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

export interface RevenueSource {
  source: string;
  amount: number;
  percentage: number;
}

export interface RevenueSourcesProps {
  sources: RevenueSource[];
  loading: boolean;
}

/** Список источников дохода с иконками */
export function MonetizationRevenueSources({ sources, loading }: RevenueSourcesProps) {
  const typeIcons: Record<string, React.ReactNode> = {
    'Subscriptions': <Crown size={14} className="text-neon-purple" />,
    'Boosts': <Zap size={14} className="text-neon-orange" />,
    'Super Likes': <Star size={14} className="text-neon-pink" />,
    'Gifts': <Gift size={14} className="text-neon-green" />,
  };

  return (
    <GlassCard className="p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-5">
        <div className="flex items-center gap-3">
          <CreditCard size={20} className="text-neon-blue" />
          <h3 className="text-lg font-semibold text-[var(--admin-text-primary)]">Источники дохода</h3>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-10 text-[var(--admin-text-muted)]">
            <Loader2 className="animate-spin" size={24} />
            <span>Загрузка...</span>
          </div>
        ) : (
          sources.map((source, index) => (
            <motion.div
              key={source.source}
              className="flex items-center gap-3.5 p-3.5 bg-slate-800/40 rounded-xl border border-[var(--admin-glass-border)] hover:bg-slate-800/60 transition-colors"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-slate-800/50 border border-[var(--admin-glass-border)]">
                {typeIcons[source.source] || <DollarSign size={14} />}
              </div>
              <div className="flex-1 flex flex-col">
                <span className="text-sm font-medium text-[var(--admin-text-primary)]">{source.source}</span>
                <span className="text-xs text-[var(--admin-text-muted)]">{source.percentage}% of total</span>
              </div>
              <div className="text-sm font-semibold text-neon-green">
                ${source.amount.toLocaleString()}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </GlassCard>
  );
}
