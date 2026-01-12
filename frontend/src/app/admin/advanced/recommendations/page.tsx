'use client';

import React, { useEffect, useState } from 'react';
import { advancedApi, RecommendationDashboard } from '@/services/advancedApi';
import { Loader2, Target, Brain, Sliders, PlayCircle } from 'lucide-react';

export default function RecommendationsPage() {
  const [data, setData] = useState<RecommendationDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await advancedApi.getRecommendationsDashboard();
        setData(res);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Recommendation Engine</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Monitor and tune the matching algorithm.</p>
      </div>

      {loading ? (
        <div className="flex justify-center"><Loader2 className="animate-spin text-zinc-400" /></div>
      ) : (
        <>
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-full">
                <Brain size={24} />
              </div>
              <div>
                <div className="text-sm text-zinc-500">Engine Status</div>
                <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100 uppercase">{data?.engine_status}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-zinc-500">Model Version</div>
              <div className="font-mono text-zinc-900 dark:text-zinc-100">{data?.model_version}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <MetricBox label="Precision" value={data?.metrics.precision} />
            <MetricBox label="Recall" value={data?.metrics.recall} />
            <MetricBox label="NDCG" value={data?.metrics.ndcg} />
            <MetricBox label="Coverage" value={data?.metrics.coverage} />
            <MetricBox label="Diversity" value={data?.metrics.diversity} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">Active Experiments</h3>
              <div className="space-y-4">
                {data?.experiments.map((exp: any) => (
                  <div key={exp.name} className="flex justify-between items-center p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                    <div>
                      <div className="font-medium">{exp.name}</div>
                      <div className="text-xs text-zinc-500">{exp.traffic}% traffic</div>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-bold ${exp.status === 'running' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                      {exp.status.toUpperCase()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">System Performance</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Avg Latency</span>
                  <span className="font-mono">{data?.performance.avg_latency_ms} ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">P95 Latency</span>
                  <span className="font-mono text-amber-600">{data?.performance.p95_latency_ms} ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">RPS</span>
                  <span className="font-mono">{data?.performance.requests_per_sec}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Cache Hit Rate</span>
                  <span className="font-mono text-green-600">{(data?.performance.cache_hit_rate || 0) * 100}%</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MetricBox({ label, value }: any) {
  return (
    <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 text-center">
      <div className="text-xs text-zinc-500 mb-1">{label}</div>
      <div className="text-2xl font-bold text-blue-600">{(value * 100).toFixed(0)}%</div>
    </div>
  );
}
