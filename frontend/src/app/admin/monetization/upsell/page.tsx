"use client";

import { useState, useEffect } from "react";
import { adminApi } from "@/services/adminApi";
import { Target, DollarSign, Users, TrendingUp, ArrowRight } from "lucide-react";

interface Segment {
  segment: string;
  description: string;
  count: number;
  recommended_offer: string;
  estimated_conversion: number;
  potential_revenue: number;
}

interface UpsellData {
  segments: Segment[];
  total_potential_revenue: number;
}

const segmentColors = [
  "border-blue-200 bg-blue-50",
  "border-purple-200 bg-purple-50",
  "border-orange-200 bg-orange-50",
  "border-green-200 bg-green-50",
];

const segmentIcons = [
  "text-blue-500",
  "text-purple-500",
  "text-orange-500",
  "text-green-500",
];

export default function UpsellOpportunitiesPage() {
  const [data, setData] = useState<UpsellData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await adminApi.monetization.getUpsellOpportunities() as UpsellData;
        setData(res);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-400">Загрузка...</div>;
  if (!data) return <div className="text-center py-12 text-gray-400">Нет данных</div>;

  const totalUsers = data.segments.reduce((s, seg) => s + seg.count, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Target className="w-7 h-7 text-emerald-500" />
          Upsell Opportunities
        </h1>
        <p className="text-gray-500 mt-1">Identified user segments for revenue growth</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-5">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1"><Users className="w-4 h-4" /> Total Targetable Users</div>
          <p className="text-2xl font-bold">{totalUsers.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1"><DollarSign className="w-4 h-4" /> Potential Revenue</div>
          <p className="text-2xl font-bold text-green-600">${data.total_potential_revenue.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1"><TrendingUp className="w-4 h-4" /> Segments Found</div>
          <p className="text-2xl font-bold">{data.segments.length}</p>
        </div>
      </div>

      {/* Segments */}
      {data.segments.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No upsell opportunities detected yet</p>
          <p className="text-sm text-gray-400 mt-1">Opportunities appear as user activity data grows</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {data.segments.map((seg, i) => (
            <div key={seg.segment} className={`rounded-xl border-2 p-6 ${segmentColors[i % segmentColors.length]}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className={`w-5 h-5 ${segmentIcons[i % segmentIcons.length]}`} />
                    <h3 className="font-semibold text-lg">{seg.segment}</h3>
                  </div>
                  <p className="text-gray-600 text-sm">{seg.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-600">${seg.potential_revenue.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">potential revenue</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-4">
                <div>
                  <p className="text-sm text-gray-500">Users in Segment</p>
                  <p className="text-xl font-bold">{seg.count.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Est. Conversion</p>
                  <p className="text-xl font-bold">{seg.estimated_conversion}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Expected Converts</p>
                  <p className="text-xl font-bold">{Math.round(seg.count * seg.estimated_conversion / 100)}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 bg-white/70 rounded-lg px-4 py-3">
                <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Recommended Offer</p>
                  <p className="font-medium">{seg.recommended_offer}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Revenue Breakdown */}
      {data.segments.length > 0 && (
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4">Revenue Potential by Segment</h2>
          <div className="space-y-3">
            {data.segments.map((seg, i) => {
              const pct = data.total_potential_revenue > 0 ? (seg.potential_revenue / data.total_potential_revenue) * 100 : 0;
              return (
                <div key={seg.segment} className="flex items-center gap-3">
                  <span className="w-40 text-sm truncate">{seg.segment}</span>
                  <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${["bg-blue-400", "bg-purple-400", "bg-orange-400", "bg-green-400"][i % 4]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-24 text-right">${seg.potential_revenue.toLocaleString()}</span>
                  <span className="text-xs text-gray-400 w-12 text-right">{pct.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
