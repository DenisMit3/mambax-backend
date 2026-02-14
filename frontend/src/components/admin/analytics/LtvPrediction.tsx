'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, DollarSign, Users, Crown,
  RefreshCw, AlertTriangle, Lightbulb, BarChart3, Target,
} from 'lucide-react';
import { adminApi, LtvPrediction as LtvData, LtvSegment } from '@/services/adminApi';

export default function LtvPrediction() {
  const [data, setData] = useState<LtvData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminApi.analytics.getLtvPrediction();
      setData(result);
    } catch (err) {
      console.error('Failed to load LTV prediction:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="glass-panel p-6 animate-pulse">
        <div className="h-6 w-48 bg-slate-700/50 rounded mb-4" />
        <div className="h-[350px] bg-slate-800/30 rounded-xl" />
      </div>
    );
  }

  if (!data) return null;

  const { summary, segments, trends, recommendations } = data;

  const riskColors: Record<string, { bg: string; border: string; text: string }> = {
    low: { bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.3)', text: '#10b981' },
    medium: { bg: 'rgba(234, 179, 8, 0.1)', border: 'rgba(234, 179, 8, 0.3)', text: '#eab308' },
    high: { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)', text: '#ef4444' },
  };

  const maxLtv = Math.max(...segments.map(s => s.avg_ltv), 1);

  return (
    <div className="glass-panel" style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <BarChart3 size={20} className="text-violet-500" />
          <h3 className="text-slate-100" style={{ fontSize: '1.125rem', fontWeight: 600 }}>
            LTV Prediction
          </h3>
          <span style={{
            fontSize: '0.65rem',
            padding: '0.15rem 0.5rem',
            borderRadius: '9999px',
            background: 'rgba(139, 92, 246, 0.15)',
            color: '#a78bfa',
            border: '1px solid rgba(139, 92, 246, 0.3)',
          }}>
            {data.model_version}
          </span>
        </div>
        <button
          onClick={fetchData}
          style={{
            background: 'rgba(139, 92, 246, 0.15)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: '0.5rem',
            padding: '0.4rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <RefreshCw size={14} className="text-violet-500" />
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <SummaryCard
          icon={<DollarSign size={16} />}
          label="Avg LTV"
          value={`$${summary.estimated_avg_ltv}`}
          color="#8b5cf6"
          sub={`${trends.ltv_change_30d > 0 ? '+' : ''}${trends.ltv_change_30d}% за 30д`}
          subColor={trends.ltv_change_30d >= 0 ? '#10b981' : '#ef4444'}
        />
        <SummaryCard
          icon={<Target size={16} />}
          label="ARPU (30д)"
          value={`$${summary.arpu_30d}`}
          color="#3b82f6"
          sub={`ARPPU: $${summary.arppu_30d}`}
          subColor="#94a3b8"
        />
        <SummaryCard
          icon={<Users size={16} />}
          label="Платящие"
          value={summary.paying_users.toLocaleString()}
          color="#10b981"
          sub={`${summary.conversion_rate}% конверсия`}
          subColor="#eab308"
        />
        <SummaryCard
          icon={<Crown size={16} />}
          label="Выручка 30д"
          value={`$${summary.revenue_30d.toLocaleString()}`}
          color="#eab308"
          sub={`90д: $${summary.revenue_90d.toLocaleString()}`}
          subColor="#94a3b8"
        />
      </div>

      {/* Segments */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h4 className="text-slate-400" style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem' }}>
          LTV по сегментам
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {segments.map((seg, i) => {
            const rc = riskColors[seg.risk] || riskColors.medium;
            const barWidth = (seg.avg_ltv / maxLtv) * 100;
            return (
              <motion.div
                key={seg.segment}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '0.75rem',
                  background: rc.bg,
                  border: `1px solid ${rc.border}`,
                }}
              >
                {/* Segment name */}
                <div style={{ width: '140px', flexShrink: 0 }}>
                  <div className="text-slate-200" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    {seg.segment}
                  </div>
                  <div className="text-slate-400" style={{ fontSize: '0.7rem' }}>
                    {seg.users.toLocaleString()} ({seg.percentage}%)
                  </div>
                </div>

                {/* LTV bar */}
                <div style={{ flex: 1, height: '8px', background: 'rgba(30, 41, 59, 0.5)', borderRadius: '4px', overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${barWidth}%` }}
                    transition={{ duration: 0.8, delay: i * 0.1 }}
                    style={{
                      height: '100%',
                      borderRadius: '4px',
                      background: `linear-gradient(90deg, ${rc.text}, ${rc.text}88)`,
                    }}
                  />
                </div>

                {/* LTV value */}
                <div style={{ width: '80px', textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: rc.text }}>
                    ${seg.avg_ltv}
                  </div>
                  <div className="text-slate-500" style={{ fontSize: '0.65rem' }}>avg LTV</div>
                </div>

                {/* Risk badge */}
                <span style={{
                  fontSize: '0.65rem',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '9999px',
                  background: rc.bg,
                  color: rc.text,
                  border: `1px solid ${rc.border}`,
                  fontWeight: 600,
                  flexShrink: 0,
                }}>
                  {seg.risk === 'low' ? 'Низкий' : seg.risk === 'medium' ? 'Средний' : 'Высокий'}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Bottom row: Metrics + Recommendations */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {/* Key metrics */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.5)',
          border: '1px solid rgba(51, 65, 85, 0.4)',
          borderRadius: '0.75rem',
          padding: '1rem',
        }}>
          <h4 className="text-slate-400" style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            Ключевые метрики
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <MetricRow label="Avg Lifetime" value={`${summary.avg_lifetime_months} мес`} />
            <MetricRow label="Churn Rate" value={`${trends.churn_rate}%`} color={trends.churn_rate > 20 ? '#ef4444' : '#10b981'} />
            <MetricRow label="LTV тренд (30д)" value={`${trends.ltv_change_30d > 0 ? '+' : ''}${trends.ltv_change_30d}%`} color={trends.ltv_change_30d >= 0 ? '#10b981' : '#ef4444'} />
            <MetricRow label="Конверсия" value={`${summary.conversion_rate}%`} />
            <MetricRow label="Confidence" value={`${Math.round(data.confidence * 100)}%`} />
          </div>
        </div>

        {/* Recommendations */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.5)',
          border: '1px solid rgba(51, 65, 85, 0.4)',
          borderRadius: '0.75rem',
          padding: '1rem',
        }}>
          <h4 className="text-slate-400" style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Lightbulb size={14} className="text-yellow-500" />
            Рекомендации
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {recommendations.map((rec, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                style={{
                  fontSize: '0.8rem',
                  color: '#cbd5e1',
                  padding: '0.5rem 0.75rem',
                  background: 'rgba(234, 179, 8, 0.05)',
                  border: '1px solid rgba(234, 179, 8, 0.15)',
                  borderRadius: '0.5rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                }}
              >
                <AlertTriangle size={12} className="text-yellow-500" style={{ marginTop: 2, flexShrink: 0 }} />
                {rec}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value, color, sub, subColor }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  sub: string;
  subColor: string;
}) {
  return (
    <div style={{
      background: `${color}15`,
      border: `1px solid ${color}33`,
      borderRadius: '0.75rem',
      padding: '0.75rem 1rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
        <span style={{ color }}>{icon}</span>
        <span className="text-slate-400" style={{ fontSize: '0.7rem' }}>{label}</span>
      </div>
      <div style={{ fontSize: '1.25rem', fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: '0.7rem', color: subColor, marginTop: '0.15rem' }}>{sub}</div>
    </div>
  );
}

function MetricRow({ label, value, color = '#e2e8f0' }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span className="text-slate-400" style={{ fontSize: '0.8rem' }}>{label}</span>
      <span style={{ fontSize: '0.85rem', fontWeight: 600, color }}>{value}</span>
    </div>
  );
}
