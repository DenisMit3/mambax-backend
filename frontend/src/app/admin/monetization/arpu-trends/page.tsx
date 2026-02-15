"use client";

import { useState, useEffect } from "react";
import { adminApi } from "@/services/admin";
import { BarChart3, DollarSign, Users, TrendingUp } from "lucide-react";

interface TrendItem {
  month: string;
  revenue: number;
  total_users: number;
  paying_users: number;
  arpu: number;
  arppu: number;
  paying_ratio: number;
}

export default function ArpuTrendsPage() {
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState(6);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await adminApi.monetization.arpuTrends(months) as { trends: TrendItem[] };
        setTrends(data.trends || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [months]);

  if (loading) return <div className="text-center py-12 text-gray-400">Загрузка...</div>;

  const maxArppu = Math.max(...trends.map((t) => t.arppu), 1);
  const latest = trends[trends.length - 1];
  const prev = trends.length > 1 ? trends[trends.length - 2] : null;
  const arpuChange = prev && prev.arpu > 0 ? ((latest?.arpu - prev.arpu) / prev.arpu * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-blue-500" />
            ARPU / ARPPU Trends
          </h1>
          <p className="text-gray-500 mt-1">Average revenue per user over time</p>
        </div>
        <select value={months} onChange={(e) => setMonths(Number(e.target.value))} className="border rounded-lg px-3 py-2">
          <option value={3}>3 months</option>
          <option value={6}>6 months</option>
          <option value={12}>12 months</option>
        </select>
      </div>

      {/* KPI */}
      {latest && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border p-5">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1"><DollarSign className="w-4 h-4" /> Current ARPU</div>
            <p className="text-2xl font-bold">${latest.arpu}</p>
            {arpuChange !== 0 && (
              <p className={`text-xs ${arpuChange > 0 ? "text-green-600" : "text-red-600"}`}>
                {arpuChange > 0 ? "+" : ""}{arpuChange.toFixed(1)}% vs prev month
              </p>
            )}
          </div>
          <div className="bg-white rounded-xl border p-5">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1"><DollarSign className="w-4 h-4" /> Current ARPPU</div>
            <p className="text-2xl font-bold text-green-600">${latest.arppu}</p>
          </div>
          <div className="bg-white rounded-xl border p-5">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1"><Users className="w-4 h-4" /> Paying Users</div>
            <p className="text-2xl font-bold">{latest.paying_users.toLocaleString()}</p>
            <p className="text-xs text-gray-400">{latest.paying_ratio}% of total</p>
          </div>
          <div className="bg-white rounded-xl border p-5">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1"><TrendingUp className="w-4 h-4" /> Доход</div>
            <p className="text-2xl font-bold">${latest.revenue.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="font-semibold mb-4">ARPU vs ARPPU</h2>
        <div className="space-y-4">
          {trends.map((t) => (
            <div key={t.month} className="flex items-center gap-3">
              <span className="w-20 text-sm text-gray-500 text-right">{t.month}</span>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs w-14 text-gray-400">ARPU</span>
                  <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-400 rounded-full" style={{ width: `${(t.arpu / maxArppu) * 100}%` }} />
                  </div>
                  <span className="text-xs font-medium w-14 text-right">${t.arpu}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs w-14 text-gray-400">ARPPU</span>
                  <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-400 rounded-full" style={{ width: `${(t.arppu / maxArppu) * 100}%` }} />
                  </div>
                  <span className="text-xs font-medium w-14 text-right">${t.arppu}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Month</th>
              <th className="text-right px-4 py-3 font-medium">Доход</th>
              <th className="text-right px-4 py-3 font-medium">Total Users</th>
              <th className="text-right px-4 py-3 font-medium">Paying Users</th>
              <th className="text-right px-4 py-3 font-medium">Paying %</th>
              <th className="text-right px-4 py-3 font-medium">ARPU</th>
              <th className="text-right px-4 py-3 font-medium">ARPPU</th>
            </tr>
          </thead>
          <tbody>
            {trends.map((t) => (
              <tr key={t.month} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{t.month}</td>
                <td className="px-4 py-3 text-right">${t.revenue.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">{t.total_users.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">{t.paying_users.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">{t.paying_ratio}%</td>
                <td className="px-4 py-3 text-right font-medium text-blue-600">${t.arpu}</td>
                <td className="px-4 py-3 text-right font-medium text-green-600">${t.arppu}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
