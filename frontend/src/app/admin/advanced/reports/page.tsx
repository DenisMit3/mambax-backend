'use client';

import React, { useEffect, useState } from 'react';
import { advancedApi, ReportsListResponse, Report } from '@/services/advancedApi';
import CustomReportsBuilder from '@/components/admin/advanced/CustomReportsBuilder';
import { FileText, Loader2, Calendar, Download } from 'lucide-react';

export default function ReportsPage() {
  const [data, setData] = useState<ReportsListResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await advancedApi.getReports();
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
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Custom Reports</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Build and manage analytics reports.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section>
            <h2 className="text-lg font-semibold mb-4 text-zinc-800 dark:text-zinc-200">Recent Reports</h2>
            {loading ? (
              <div className="flex justify-center p-8"><Loader2 className="animate-spin text-zinc-400" /></div>
            ) : (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                {data?.reports.length === 0 ? (
                  <div className="p-8 text-center text-zinc-500">No reports generated yet.</div>
                ) : (
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {data?.reports.map((report: Report) => (
                      <div key={report.id} className="p-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
                            <FileText size={18} />
                          </div>
                          <div>
                            <div className="font-medium text-zinc-900 dark:text-zinc-100">{report.name}</div>
                            <div className="text-xs text-zinc-500 flex items-center gap-2">
                              <span className="capitalize px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">{report.type}</span>
                              <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(report.last_run).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-blue-600 transition-colors">
                          <Download size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4 text-zinc-800 dark:text-zinc-200">Конструктор</h2>
          <CustomReportsBuilder />
        </div>
      </div>
    </div>
  );
}
