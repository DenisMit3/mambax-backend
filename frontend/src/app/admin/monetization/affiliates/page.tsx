"use client";

import { useState, useEffect, useCallback } from "react";
import { adminApi } from "@/services/adminApi";
import { Handshake, DollarSign, Users, TrendingUp, Trophy } from "lucide-react";

interface Affiliate {
  id: string;
  name: string;
  code: string;
  email: string;
  commission_rate: number;
  total_referrals: number;
  total_conversions: number;
  conversion_rate: number;
  revenue_generated: number;
  commission_paid: number;
  pending_commission: number;
  is_active: boolean;
  created_at: string | null;
}

interface AffiliateStats {
  active_affiliates: number;
  total_referrals: number;
  total_conversions: number;
  conversion_rate: number;
  revenue_generated: number;
  commission_paid: number;
  pending_commission: number;
  top_performer: { name: string; revenue: number };
}

export default function AffiliateDashboardPage() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("active");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [affData, statsData] = await Promise.all([
        adminApi.monetization.getAffiliates(filter) as Promise<{ affiliates: Affiliate[] }>,
        adminApi.monetization.getAffiliateStats() as Promise<AffiliateStats>,
      ]);
      setAffiliates(affData.affiliates || []);
      setStats(statsData);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Handshake className="w-7 h-7 text-indigo-500" />
          Affiliate Program
        </h1>
        <p className="text-gray-500 mt-1">Partner performance and commission tracking</p>
      </div>

      {/* KPI */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border p-5">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1"><Users className="w-4 h-4" /> Active Partners</div>
            <p className="text-2xl font-bold">{stats.active_affiliates}</p>
          </div>
          <div className="bg-white rounded-xl border p-5">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1"><DollarSign className="w-4 h-4" /> Доход</div>
            <p className="text-2xl font-bold text-green-600">${stats.revenue_generated.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl border p-5">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1"><TrendingUp className="w-4 h-4" /> Conversion Rate</div>
            <p className="text-2xl font-bold">{stats.conversion_rate}%</p>
            <p className="text-xs text-gray-400">{stats.total_conversions} / {stats.total_referrals} referrals</p>
          </div>
          <div className="bg-white rounded-xl border p-5">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1"><Trophy className="w-4 h-4" /> Top Performer</div>
            <p className="text-lg font-bold">{stats.top_performer.name}</p>
            <p className="text-xs text-green-600">${stats.top_performer.revenue.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Commission Summary */}
      {stats && (
        <div className="bg-white rounded-xl border p-5">
          <h2 className="font-semibold mb-3">Commission Summary</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Total Paid</p>
              <p className="text-xl font-bold">${stats.commission_paid.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Ожидание</p>
              <p className="text-xl font-bold text-orange-600">${stats.pending_commission.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total (Paid + Pending)</p>
              <p className="text-xl font-bold">${(stats.commission_paid + stats.pending_commission).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        {["active", "inactive", "all"].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition capitalize ${filter === f ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Загрузка...</div>
      ) : (
        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Partner</th>
                <th className="text-left px-4 py-3 font-medium">Code</th>
                <th className="text-right px-4 py-3 font-medium">Commission %</th>
                <th className="text-right px-4 py-3 font-medium">Referrals</th>
                <th className="text-right px-4 py-3 font-medium">Conversions</th>
                <th className="text-right px-4 py-3 font-medium">Conv. Rate</th>
                <th className="text-right px-4 py-3 font-medium">Доход</th>
                <th className="text-right px-4 py-3 font-medium">Paid</th>
                <th className="text-right px-4 py-3 font-medium">Pending</th>
                <th className="text-center px-4 py-3 font-medium">Статус</th>
              </tr>
            </thead>
            <tbody>
              {affiliates.map((a) => (
                <tr key={a.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium">{a.name}</p>
                    <p className="text-xs text-gray-400">{a.email}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-indigo-600">{a.code}</td>
                  <td className="px-4 py-3 text-right">{a.commission_rate}%</td>
                  <td className="px-4 py-3 text-right">{a.total_referrals.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">{a.total_conversions.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">{a.conversion_rate}%</td>
                  <td className="px-4 py-3 text-right font-medium text-green-600">${a.revenue_generated.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">${a.commission_paid.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-orange-600">${a.pending_commission.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${a.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {a.is_active ? "Активен" : "Неактивен"}
                    </span>
                  </td>
                </tr>
              ))}
              {affiliates.length === 0 && (
                <tr><td colSpan={10} className="text-center py-8 text-gray-400">No affiliates found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
