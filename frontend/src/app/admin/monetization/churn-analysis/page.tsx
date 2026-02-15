"use client";

import { useState, useEffect } from "react";
import { adminApi } from "@/services/admin";
import { UserMinus, TrendingDown, BarChart3 } from "lucide-react";

interface TierChurn {
  tier: string;
  churn_rate: number;
  churned_users: number;
  active_users: number;
}

interface ChurnTrend {
  month: string;
  churned: number;
}

interface ChurnData {
  overall_churn: number;
  by_tier: TierChurn[];
  churn_trend: ChurnTrend[];
}

const tierColors: Record<string, string> = {
  free: "bg-gray-400",
  vip: "bg-blue-400",
  gold: "bg-yellow-400",
  platinum: "bg-purple-400",
};

export default function ChurnAnalysisPage() {
  const [data, setData] = useState<ChurnData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await adminApi.monetization.getChurnAnalysis(period) as ChurnData;
        setData(res);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [period]);

  if (loading) return <div className="text-center py-12 text-gray-400">Загрузка...</div>;
  if (!data) return <div className="text-center py-12 text-gray-400">Нет данных</div>;

  const maxChurned = Math.max(...data.churn_trend.map((t) => t.churned), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserMinus className="w-7 h-7 text-red-500" />
            Churn Analysis
          </h1>
          <p className="text-gray-500 mt-1">Subscription churn by tier and trends</p>
        </div>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="border rounded-lg px-3 py-2">
          <option value="week">Last 7 days</option>
          <option value="month">Last 30 days</option>
          <option value="quarter">Last 90 days</option>
          <option value="year">Last year</option>
        </select>
      </div>

      {/* Overall */}
      <div className="bg-white rounded-xl border p-6 flex items-center gap-6">
        <div className="w-24 h-24 rounded-full border-4 border-red-200 flex items-center justify-center">
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{data.overall_churn}%</p>
            <p className="text-[10px] text-gray-400">Overall</p>
          </div>
        </div>
        <div>
          <h2 className="font-semibold text-lg">Overall Churn Rate</h2>
          <p className="text-gray-500 text-sm">
            {data.by_tier.reduce((s, t) => s + t.churned_users, 0)} users churned in this period
          </p>
        </div>
      </div>

      {/* By Tier */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-gray-400" /> Churn by Subscription Tier
        </h2>
        {data.by_tier.length === 0 ? (
          <p className="text-gray-400 text-center py-4">No churn data for this period</p>
        ) : (
          <div className="space-y-4">
            {data.by_tier.map((t) => (
              <div key={t.tier} className="flex items-center gap-4">
                <span className="w-20 text-sm font-medium capitalize">{t.tier}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${tierColors[t.tier] || "bg-gray-400"}`}
                        style={{ width: `${Math.min(t.churn_rate * 5, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-red-600 w-14 text-right">{t.churn_rate}%</span>
                  </div>
                  <div className="flex gap-4 text-xs text-gray-400">
                    <span>Churned: {t.churned_users}</span>
                    <span>Active: {t.active_users}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trend */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-gray-400" /> Churn Trend (Last 4 Months)
        </h2>
        <div className="flex items-end gap-4 h-40">
          {data.churn_trend.map((t) => (
            <div key={t.month} className="flex-1 flex flex-col items-center">
              <span className="text-xs font-medium mb-1">{t.churned}</span>
              <div className="w-full bg-gray-100 rounded-t-lg relative" style={{ height: "100%" }}>
                <div
                  className="absolute bottom-0 left-0 right-0 bg-red-400 rounded-t-lg transition-all"
                  style={{ height: `${(t.churned / maxChurned) * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 mt-2">{t.month}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tier Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Tier</th>
              <th className="text-right px-4 py-3 font-medium">Churn Rate</th>
              <th className="text-right px-4 py-3 font-medium">Churned Users</th>
              <th className="text-right px-4 py-3 font-medium">Active Users</th>
              <th className="text-right px-4 py-3 font-medium">Retention</th>
            </tr>
          </thead>
          <tbody>
            {data.by_tier.map((t) => (
              <tr key={t.tier} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium capitalize">{t.tier}</td>
                <td className="px-4 py-3 text-right text-red-600 font-medium">{t.churn_rate}%</td>
                <td className="px-4 py-3 text-right">{t.churned_users}</td>
                <td className="px-4 py-3 text-right">{t.active_users}</td>
                <td className="px-4 py-3 text-right text-green-600 font-medium">{(100 - t.churn_rate).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
