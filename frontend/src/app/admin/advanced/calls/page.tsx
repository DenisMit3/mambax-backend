'use client';

import React, { useEffect, useState } from 'react';
import { advancedApi, CallAnalytics } from '@/services/advancedApi';
import { Loader2, Video, Phone, Clock, ThumbsUp } from 'lucide-react';

export default function CallsPage() {
  const [data, setData] = useState<CallAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await advancedApi.getCallAnalytics();
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
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Calls Analytics</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Audio and Video call performance.</p>
      </div>

      {loading ? (
        <div className="flex justify-center"><Loader2 className="animate-spin text-zinc-400" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3 mb-4 text-pink-500">
              <Video size={24} />
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Video Calls</h3>
            </div>
            <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{data?.summary.video_calls}</div>
            <div className="text-sm text-zinc-500">Total Sessions</div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3 mb-4 text-blue-500">
              <Phone size={24} />
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Voice Calls</h3>
            </div>
            <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{data?.summary.voice_calls}</div>
            <div className="text-sm text-zinc-500">Total Sessions</div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3 mb-4 text-amber-500">
              <Clock size={24} />
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Avg Duration</h3>
            </div>
            <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{data?.summary.avg_duration_min}m</div>
            <div className="text-sm text-zinc-500">Per Session</div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3 mb-4 text-green-500">
              <ThumbsUp size={24} />
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Quality</h3>
            </div>
            <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{Math.round((data!.quality.excellent / data!.summary.total_calls) * 100)}%</div>
            <div className="text-sm text-zinc-500">Excellent Ratings</div>
          </div>

          <div className="md:col-span-2 lg:col-span-4 bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Конверсия</h3>
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-2xl font-bold text-zinc-800 dark:text-zinc-200">{data?.conversion.calls_to_dates}</div>
                <div className="text-sm text-zinc-500">Led to Dates</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-zinc-800 dark:text-zinc-200">{data?.conversion.video_preference}%</div>
                <div className="text-sm text-zinc-500">Prefer Video</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-zinc-800 dark:text-zinc-200">{data?.conversion.first_call_timing_days} days</div>
                <div className="text-sm text-zinc-500">Avg Time to First Call</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
