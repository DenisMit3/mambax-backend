'use client';

import React, { useEffect, useState } from 'react';
import { advancedApi, LocalizationStats } from '@/services/advancedApi';
import { Loader2, Globe, Languages, AlertTriangle, CheckCircle } from 'lucide-react';

export default function LocalizationPage() {
  const [data, setData] = useState<LocalizationStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await advancedApi.getLocalizationStats();
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
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Localization</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Manage translations and language support.</p>
      </div>

      {loading ? (
        <div className="flex justify-center"><Loader2 className="animate-spin text-zinc-400" /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <h3 className="text-sm font-medium text-zinc-500 uppercase mb-4">Translation Status</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-600 dark:text-zinc-400">Total Strings</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{data?.translation_stats.total_strings}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-600 dark:text-zinc-400">Translated</span>
                  <span className="font-semibold text-green-600">{data?.translation_stats.translated_strings}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-600 dark:text-zinc-400">Needs Review</span>
                  <span className="font-semibold text-amber-600">{data?.translation_stats.needs_review}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-600 dark:text-zinc-400">Missing</span>
                  <span className="font-semibold text-red-600">{data?.translation_stats.missing}</span>
                </div>
              </div>
            </div>

            <div className="md:col-span-2 bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <h3 className="text-sm font-medium text-zinc-500 uppercase mb-4">Active Languages</h3>
              <div className="space-y-4">
                {data?.languages.map(lang => (
                  <div key={lang.code} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <span className="uppercase text-xs font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 rounded text-zinc-500">{lang.code}</span>
                        {lang.name}
                      </span>
                      <span className="text-zinc-500">{lang.completion}% Complete</span>
                    </div>
                    <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${lang.completion === 100 ? 'bg-green-500' :
                            lang.completion > 80 ? 'bg-blue-500' : 'bg-amber-500'
                          }`}
                        style={{ width: `${lang.completion}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
