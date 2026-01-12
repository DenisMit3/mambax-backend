'use client';

import React, { useEffect, useState } from 'react';
import { advancedApi, PerformanceBudget } from '@/services/advancedApi';
import { Loader2, Gauge, Zap, Image as ImageIcon, Database } from 'lucide-react';

export default function PerformancePage() {
  const [data, setData] = useState<PerformanceBudget | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await advancedApi.getPerformanceBudget();
        setData(res);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 50) return 'text-amber-500';
    return 'text-red-500';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Performance Budget</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Core Web Vitals and Bundle Size analysis.</p>
      </div>

      {loading ? (
        <div className="flex justify-center"><Loader2 className="animate-spin text-zinc-400" /></div>
      ) : (
        <>
          <div className="flex items-center justify-center p-8 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <div className="text-center">
              <div className="text-sm text-zinc-500 mb-2">Overall Performance Score</div>
              <div className={`text-6xl font-black ${getScoreColor(data?.overall_score || 0)}`}>
                {data?.overall_score}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard
              title="LCP (Largest Contentful Paint)"
              value={`${data?.metrics.lcp.value}s`}
              budget={`${data?.metrics.lcp.budget}s`}
              status={data?.metrics.lcp.status || 'pass'}
            />
            <MetricCard
              title="FID (First Input Delay)"
              value={`${data?.metrics.fid.value}ms`}
              budget={`${data?.metrics.fid.budget}ms`}
              status={data?.metrics.fid.status || 'pass'}
            />
            <MetricCard
              title="CLS (Cumulative Layout Shift)"
              value={`${data?.metrics.cls.value}`}
              budget={`${data?.metrics.cls.budget}`}
              status={data?.metrics.cls.status || 'pass'}
            />
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
            <h3 className="text-lg font-semibold mb-6 text-zinc-900 dark:text-zinc-100">Bundle Size Budget</h3>
            <div className="space-y-6">
              <BudgetBar
                label="JavaScript Bundle"
                current={data?.bundle_size.js_total_kb || 0}
                max={data?.bundle_size.js_budget_kb || 0}
                unit="KB"
              />
              <BudgetBar
                label="CSS Bundle"
                current={data?.bundle_size.css_total_kb || 0}
                max={data?.bundle_size.css_budget_kb || 0}
                unit="KB"
              />
              <BudgetBar
                label="Image Assets (Avg)"
                current={data?.bundle_size.images_avg_kb || 0}
                max={data?.bundle_size.images_budget_kb || 0}
                unit="KB"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({ title, value, budget, status }: { title: string, value: string, budget: string, status: string }) {
  return (
    <div className={`p-6 rounded-xl border ${status === 'pass' ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900'}`}>
      <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">{title}</h3>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{value}</span>
        <span className="text-xs text-zinc-500">of {budget}</span>
      </div>
      <div className={`text-xs font-medium uppercase ${status === 'pass' ? 'text-green-600' : 'text-red-600'}`}>
        {status}
      </div>
    </div>
  );
}

function BudgetBar({ label, current, max, unit }: { label: string, current: number, max: number, unit: string }) {
  const percent = Math.min((current / max) * 100, 100);
  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
        <span className="text-zinc-500">{current} / {max} {unit}</span>
      </div>
      <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${percent > 90 ? 'bg-red-500' : percent > 75 ? 'bg-amber-500' : 'bg-blue-500'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
