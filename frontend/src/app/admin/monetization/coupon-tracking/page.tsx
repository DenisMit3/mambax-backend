"use client";

import { useState, useEffect, useCallback } from "react";
import { adminApi } from "@/services/adminApi";
import { Ticket, BarChart3, Users, DollarSign } from "lucide-react";

interface RedemptionItem {
  id: string;
  promo_code: string;
  promo_name: string;
  user_id: string;
  user_name: string;
  discount_applied: number;
  transaction_id: string;
  redeemed_at: string | null;
}

interface CodeAnalytics {
  id: string;
  code: string;
  name: string;
  discount_type: string;
  discount_value: number;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  redemptions: number;
  total_discount: number;
  usage_rate: number;
}

export default function CouponRedemptionPage() {
  const [tab, setTab] = useState<"analytics" | "history">("analytics");
  const [codes, setCodes] = useState<CodeAnalytics[]>([]);
  const [redemptions, setRedemptions] = useState<RedemptionItem[]>([]);
  const [totalDiscount, setTotalDiscount] = useState(0);
  const [totalRedemptions, setTotalRedemptions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedCode, setSelectedCode] = useState<string>("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.monetization.promoRedemptions.analytics() as {
        codes: CodeAnalytics[]; total_redemptions: number; total_discount_given: number;
      };
      setCodes(data.codes || []);
      setTotalRedemptions(data.total_redemptions || 0);
      setTotalDiscount(data.total_discount_given || 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.monetization.promoRedemptions.list(selectedCode || undefined, page) as {
        items: RedemptionItem[]; total: number; total_discount_given: number;
      };
      setRedemptions(data.items || []);
      setTotal(data.total || 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [selectedCode, page]);

  useEffect(() => {
    if (tab === "analytics") fetchAnalytics();
    else fetchHistory();
  }, [tab, fetchAnalytics, fetchHistory]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Ticket className="w-7 h-7 text-orange-500" />
          Coupon Redemption Tracking
        </h1>
        <p className="text-gray-500 mt-1">Track promo code usage and effectiveness</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-5">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1"><Ticket className="w-4 h-4" /> Total Codes</div>
          <p className="text-2xl font-bold">{codes.length}</p>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1"><Users className="w-4 h-4" /> Total Redemptions</div>
          <p className="text-2xl font-bold">{totalRedemptions}</p>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1"><DollarSign className="w-4 h-4" /> Total Discount Given</div>
          <p className="text-2xl font-bold text-orange-600">${totalDiscount.toLocaleString()}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["analytics", "history"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === t ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >{t === "analytics" ? "By Code" : "Redemption History"}</button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Загрузка...</div>
      ) : tab === "analytics" ? (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Code</th>
                <th className="text-left px-4 py-3 font-medium">Название</th>
                <th className="text-center px-4 py-3 font-medium">Тип</th>
                <th className="text-right px-4 py-3 font-medium">Uses</th>
                <th className="text-right px-4 py-3 font-medium">Max</th>
                <th className="text-right px-4 py-3 font-medium">Usage %</th>
                <th className="text-right px-4 py-3 font-medium">Discount Given</th>
                <th className="text-center px-4 py-3 font-medium">Статус</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50 cursor-pointer"
                  onClick={() => { setSelectedCode(c.id); setTab("history"); }}>
                  <td className="px-4 py-3 font-mono font-medium text-orange-600">{c.code}</td>
                  <td className="px-4 py-3">{c.name}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{c.discount_type}</span>
                  </td>
                  <td className="px-4 py-3 text-right">{c.current_uses}</td>
                  <td className="px-4 py-3 text-right text-gray-400">{c.max_uses ?? "∞"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-500 rounded-full" style={{ width: `${Math.min(c.usage_rate, 100)}%` }} />
                      </div>
                      <span className="text-xs">{c.usage_rate}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">${c.total_discount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {c.is_active ? "Активен" : "Неактивен"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          {selectedCode && (
            <button onClick={() => setSelectedCode("")} className="text-sm text-orange-600 hover:underline">
              ← Show all redemptions
            </button>
          )}
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Code</th>
                  <th className="text-left px-4 py-3 font-medium">User</th>
                  <th className="text-right px-4 py-3 font-medium">Discount</th>
                  <th className="text-right px-4 py-3 font-medium">Дата</th>
                </tr>
              </thead>
              <tbody>
                {redemptions.map((r) => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-orange-600">{r.promo_code}</td>
                    <td className="px-4 py-3">{r.user_name}</td>
                    <td className="px-4 py-3 text-right font-medium">${r.discount_applied}</td>
                    <td className="px-4 py-3 text-right text-gray-400">
                      {r.redeemed_at ? new Date(r.redeemed_at).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {total > 20 && (
            <div className="flex justify-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 border rounded disabled:opacity-50">Prev</button>
              <span className="px-3 py-1 text-sm text-gray-500">Page {page}</span>
              <button disabled={page * 20 >= total} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 border rounded disabled:opacity-50">Далее</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
