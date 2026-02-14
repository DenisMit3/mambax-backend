'use client';

import { TrendingUp } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

export interface RevenueChartProps {
  data: { day: string; value: number }[];
}

/** График тренда доходов (SVG area chart) */
export function MonetizationRevenueChart({ data }: RevenueChartProps) {
  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <GlassCard className="p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <TrendingUp size={20} className="text-emerald-500" />
          <h3 className="text-lg font-semibold text-[var(--admin-text-primary)]">Тренд доходов</h3>
        </div>
        <select className="bg-slate-800/50 border border-[var(--admin-glass-border)] rounded-xl px-4 py-2 text-sm text-[var(--admin-text-primary)] outline-none cursor-pointer hover:border-[var(--admin-glass-border-hover)] transition-colors">
          <option>Последние 7 дней</option>
          <option>Последние 30 дней</option>
          <option>Последние 90 дней</option>
        </select>
      </div>

      <div className="relative w-full h-[200px]">
        <svg viewBox="0 0 700 200" className="w-full h-full overflow-visible">
          {/* Сетка */}
          {[0, 25, 50, 75, 100].map((y) => (
            <line
              key={y}
              x1="0"
              y1={200 - y * 2}
              x2="700"
              y2={200 - y * 2}
              stroke="rgba(148, 163, 184, 0.1)"
              strokeWidth="1"
            />
          ))}

          {/* Градиент заливки */}
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={`M 0 200 ${data.map((d, i) =>
              `L ${i * 100 + 50} ${200 - (d.value / maxValue) * 180}`
            ).join(' ')} L 650 200 Z`}
            fill="url(#areaGradient)"
          />

          {/* Линия */}
          <path
            d={`M ${data.map((d, i) =>
              `${i * 100 + 50} ${200 - (d.value / maxValue) * 180}`
            ).join(' L ')}`}
            fill="none"
            stroke="#10b981"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Точки */}
          {data.map((d, i) => (
            <g key={d.day}>
              <circle
                cx={i * 100 + 50}
                cy={200 - (d.value / maxValue) * 180}
                r="6"
                fill="#0a0f1a"
                stroke="#10b981"
                strokeWidth="3"
              />
            </g>
          ))}
        </svg>

        <div className="flex justify-around mt-3">
          {data.map((d) => (
            <span key={d.day} className="text-xs text-[var(--admin-text-secondary)]">{d.day}</span>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}
