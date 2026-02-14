"use client";

import { useState, useEffect } from "react";
import { adminApi } from "@/services/adminApi";
import { Zap, Heart, TrendingUp, Eye, Users, DollarSign } from "lucide-react";

interface BoostData {
  purchases: { total: number; revenue: number; average_per_day: number };
  usage: { used: number; unused: number; usage_rate: number };
  effectiveness: { avg_views_increase: number; avg_likes_increase: number; avg_matches_increase: number };
  by_type: { type: string; purchases: number }[];
}

interface SuperlikeData {
  purchases: { total: number; revenue: number; from_subscription: number; total_sent: number };
  effectiveness: { total_purchased_qty: number; remaining: number; usage_rate: number };
}

export default function BoostSuperlikeAnalyticsPage() {
  const [boostData, setBoostData] = useState<BoostData | null>(null);
  const [superlikeData, setSuperlikeData] = useState<SuperlikeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");
  const [tab, setTab] = useState<"boosts" | "superlikes">("boosts");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [b, s] = await Promise.all([
          adminApi.monetization.getBoostAnalytics(period) as Promise<BoostData>,
          adminApi.monetization.getSuperlikeAnalytics(period) as Promise<SuperlikeData>,
        ]);
        setBoostData(b);
        setSuperlikeData(s);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [period]);

  if (loading) return <div className="text-center py-12 text-gray-400">Загрузка...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-7 h-7 text-yellow-500" />
            Boost & Super Like Analytics
          </h1>
          <p className="text-gray-500 mt-1">Purchase and usage analytics</p>
        </div>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="border rounded-lg px-3 py-2">
          <option value="week">Last 7 days</option>
          <option value="month">Last 30 days</option>
          <option value="quarter">Last 90 days</option>
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab("boosts")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${tab === "boosts" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
          <Zap className="w-4 h-4" /> Boosts
        </button>
        <button onClick={() => setTab("superlikes")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${tab === "superlikes" ? "bg-pink-100 text-pink-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
          <Heart className="w-4 h-4" /> Super Likes
        </button>
      </div>

      {tab === "boosts" && boostData && (
        <>
          {/* KPI */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border p-5">
              <div className="text-gray-500 text-sm mb-1">Total Purchases</div>
              <p className="text-2xl font-bold">{boostData.purchases.total.toLocaleString()}</p>
              <p className="text-xs text-gray-400">{boostData.purchases.average_per_day}/day avg</p>
            </div>
            <div className="bg-white rounded-xl border p-5">
              <div className="flex items-center gap-1 text-gray-500 text-sm mb-1"><DollarSign className="w-3.5 h-3.5" /> Revenue</div>
              <p className="text-2xl font-bold text-green-600">${boostData.purchases.revenue.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl border p-5">
              <div className="text-gray-500 text-sm mb-1">Usage Rate</div>
              <p className="text-2xl font-bold">{boostData.usage.usage_rate}%</p>
              <p className="text-xs text-gray-400">{boostData.usage.used} used / {boostData.usage.unused} unused</p>
            </div>
            <div className="bg-white rounded-xl border p-5">
              <div className="flex items-center gap-1 text-gray-500 text-sm mb-1"><Eye className="w-3.5 h-3.5" /> Avg Views Boost</div>
              <p className="text-2xl font-bold text-blue-600">+{boostData.effectiveness.avg_views_increase}</p>
            </div>
          </div>

          {/* Effectiveness */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="font-semibold mb-4">Boost Effectiveness</h2>
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <Eye className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <p className="text-3xl font-bold">+{boostData.effectiveness.avg_views_increase}</p>
                <p className="text-sm text-gray-500">Avg Views Increase</p>
              </div>
              <div className="text-center">
                <Heart className="w-8 h-8 text-pink-500 mx-auto mb-2" />
                <p className="text-3xl font-bold">+{boostData.effectiveness.avg_likes_increase}</p>
                <p className="text-sm text-gray-500">Avg Likes Increase</p>
              </div>
              <div className="text-center">
                <Users className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-3xl font-bold">+{boostData.effectiveness.avg_matches_increase}</p>
                <p className="text-sm text-gray-500">Avg Matches Increase</p>
              </div>
            </div>
          </div>

          {/* By Type */}
          {boostData.by_type.length > 0 && (
            <div className="bg-white rounded-xl border p-6">
              <h2 className="font-semibold mb-4">By Type</h2>
              <div className="space-y-3">
                {boostData.by_type.map((t) => {
                  const pct = boostData.purchases.total ? (t.purchases / boostData.purchases.total) * 100 : 0;
                  return (
                    <div key={t.type} className="flex items-center gap-3">
                      <span className="w-20 text-sm font-medium capitalize">{t.type}</span>
                      <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-sm font-medium w-16 text-right">{t.purchases}</span>
                      <span className="text-xs text-gray-400 w-12 text-right">{pct.toFixed(1)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {tab === "superlikes" && superlikeData && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border p-5">
              <div className="text-gray-500 text-sm mb-1">Purchases</div>
              <p className="text-2xl font-bold">{superlikeData.purchases.total.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl border p-5">
              <div className="flex items-center gap-1 text-gray-500 text-sm mb-1"><DollarSign className="w-3.5 h-3.5" /> Revenue</div>
              <p className="text-2xl font-bold text-green-600">${superlikeData.purchases.revenue.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl border p-5">
              <div className="text-gray-500 text-sm mb-1">From Subscription</div>
              <p className="text-2xl font-bold text-purple-600">{superlikeData.purchases.from_subscription.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl border p-5">
              <div className="text-gray-500 text-sm mb-1">Total Sent</div>
              <p className="text-2xl font-bold">{superlikeData.purchases.total_sent.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-6">
            <h2 className="font-semibold mb-4">Usage Stats</h2>
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold">{superlikeData.effectiveness.total_purchased_qty}</p>
                <p className="text-sm text-gray-500">Total Purchased</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-orange-600">{superlikeData.effectiveness.remaining}</p>
                <p className="text-sm text-gray-500">Remaining Unused</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">{superlikeData.effectiveness.usage_rate}%</p>
                <p className="text-sm text-gray-500">Usage Rate</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
