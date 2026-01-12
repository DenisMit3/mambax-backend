'use client';

import React, { useEffect, useState } from 'react';
import { advancedApi, AccessibilityAudit } from '@/services/advancedApi';
import { Loader2, Accessibility, Eye, MousePointer } from 'lucide-react';

export default function AccessibilityPage() {
  const [data, setData] = useState<AccessibilityAudit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await advancedApi.getAccessibilityAudit();
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
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Accessibility Audit</h1>
        <p className="text-zinc-500 dark:text-zinc-400">WCAG compliance and accessibility score.</p>
      </div>

      {loading ? (
        <div className="flex justify-center"><Loader2 className="animate-spin text-zinc-400" /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-zinc-900 p-8 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center text-center">
              <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-full">
                <Accessibility size={32} />
              </div>
              <div className="text-5xl font-black text-blue-600 mb-2">{data?.overall_score}</div>
              <div className="text-zinc-500 font-medium">Overall Score</div>
              <div className="mt-2 px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full text-xs font-mono">
                LEVEL {data?.wcag_level}
              </div>
            </div>

            <div className="md:col-span-2 bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100 mb-6">Issue Breakdown</h3>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{data?.issues.critical}</div>
                  <div className="text-xs text-red-600/80 uppercase font-bold mt-1">Critical</div>
                </div>
                <div className="p-4 bg-orange-50 dark:bg-orange-900/10 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{data?.issues.serious}</div>
                  <div className="text-xs text-orange-600/80 uppercase font-bold mt-1">Serious</div>
                </div>
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{data?.issues.moderate}</div>
                  <div className="text-xs text-yellow-600/80 uppercase font-bold mt-1">Moderate</div>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{data?.issues.minor}</div>
                  <div className="text-xs text-blue-600/80 uppercase font-bold mt-1">Minor</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 mb-4">Top Issues</h3>
            <div className="space-y-4">
              {data?.top_issues.map((issue, i) => (
                <div key={i} className="flex items-start gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                  <div className={`mt-1 w-2 h-2 rounded-full ${issue.severity === 'critical' ? 'bg-red-500' :
                      issue.severity === 'moderate' ? 'bg-yellow-500' : 'bg-blue-500'
                    }`} />
                  <div>
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">{issue.issue}</div>
                    <div className="text-sm text-zinc-500 flex items-center gap-2 mt-1">
                      <span className="font-mono bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.5 rounded text-xs">{issue.page}</span>
                      <span className="capitalize">{issue.severity} priority</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
