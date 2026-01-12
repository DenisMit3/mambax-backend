'use client';

import React, { useEffect, useState } from 'react';
import { advancedApi, PWAStats } from '@/services/advancedApi';
import { Loader2, Smartphone, WifiOff, Bell, DownloadCloud } from 'lucide-react';

export default function PWAPage() {
  const [data, setData] = useState<PWAStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await advancedApi.getPWAStats();
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
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">PWA Analytics</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Installations and offline usage statistics.</p>
      </div>

      {loading ? (
        <div className="flex justify-center"><Loader2 className="animate-spin text-zinc-400" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<DownloadCloud />} label="Total Installs" value={data?.installations.total} sub={`+${data?.installations.growth}%`} />
            <StatCard icon={<Smartphone />} label="Daily Active" value={data?.engagement.daily_active} />
            <StatCard icon={<WifiOff />} label="Offline Sessions" value={data?.offline_usage.offline_sessions} />
            <StatCard icon={<Bell />} label="Push Enabled" value={`${data?.engagement.push_enabled}%`} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <h3 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-zinc-100">Platform Distribution</h3>
              <div className="space-y-4">
                {data?.by_platform.map(p => (
                  <div key={p.platform}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-zinc-600 dark:text-zinc-400">{p.platform}</span>
                      <span className="font-medium">{p.installs}</span>
                    </div>
                    <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${p.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <h3 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-zinc-100">Offline Capability</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                  <div className="text-sm">Cached Messages Sent</div>
                  <div className="font-bold">{data?.offline_usage.cached_messages_sent}</div>
                </div>
                <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                  <div className="text-sm">Sync Success Rate</div>
                  <div className="font-bold text-green-600">{data?.offline_usage.sync_success_rate}%</div>
                </div>
                <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                  <div className="text-sm">Avg Session</div>
                  <div className="font-bold">{data?.engagement.avg_session_min} min</div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, sub }: any) {
  return (
    <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center gap-3 mb-2">
        <div className="text-zinc-400">{icon}</div>
        <div className="text-sm text-zinc-500">{label}</div>
      </div>
      <div className="flex items-baseline gap-2">
        <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{value}</div>
        {sub && <div className="text-xs text-green-500 font-medium">{sub}</div>}
      </div>
    </div>
  );
}
