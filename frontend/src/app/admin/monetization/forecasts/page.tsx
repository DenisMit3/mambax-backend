"use client";

import { useState, useEffect } from "react";
import { adminApi } from "@/services/adminApi";
import { TrendingUp, DollarSign, ArrowUpRight, ArrowDownRight, Calendar } from "lucide-react";

interface Forecast {
  month: string;
  projected_mrr: number;
  projected_arr: number;
  confidence_low: number;
  confidence_high: number;
  growth_from_current: number;
}

interface ForecastData {
  current_mrr: number;
  current_arr: number;
  growth_rate: number;
  historical_mrr: number[];
  forecasts: Forecast[];
  assumptions: {
    churn_rate: number;
    avg_growth_rate: number;
    based_on_months: number;
  };
}

export default function RevenueForecastPage() {
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState(6);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await adminApi.monetization.getForecast(months) as ForecastData;
        setData(res);
      } catch (e) {
        console.error("Failed to load forecast", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [months]);

  if (loading) return <div className="text-center py-12 text-gray-400">Загрузка...</div>;
  if (!data) return <div className="text-center py-12 text-gray-400">Нет данных</div>;

  const maxMRR = Math.max(...data.forecasts.map((f) => f.confidence_high), data.current_mrr);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="w-7 h-7 text-green-500" />
            Revenue Forecast
          </h1>
          <p className="text-gray-500 mt-1">Projections based on real transaction data</p>
        </div>
        <select
          value={months}
          onChange={(e) => setMonths(Number(e.target.value))}
          className="border rounded-lg px-3 py-2"
        >
          <option value={3}>3 months</option>
          <option value={6}>6 months</option>
          <option value={12}>12 months</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-5">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <DollarSign className="w-4 h-4" /> Current MRR
          </div>
          <p className="text-2xl font-bold">${data.current_mrr.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <DollarSign className="w-4 h-4" /> Current ARR
          </div>
          <p className="text-2xl font-bold">${data.current_arr.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <TrendingUp className="w-4 h-4" /> Growth Rate
          </div>
          <p className={`text-2xl font-bold ${data.growth_rate >= 0 ? "text-green-600" : "text-red-600"}`}>
            {data.growth_rate >= 0 ? "+" : ""}{data.growth_rate}%
          </p>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Calendar className="w-4 h-4" /> Churn Rate
          </div>
          <p className="text-2xl font-bold text-orange-600">{data.assumptions.churn_rate}%</p>
        </div>
      </div>

      {/* Forecast Chart (Bar visualization) */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="font-semibold mb-4">Projected MRR</h2>
        <div className="space-y-3">
          {/* Current */}
          <div className="flex items-center gap-3">
            <span className="w-28 text-sm text-gray-500 text-right">Current</span>
            <div className="flex-1 relative h-8">
              <div
                className="absolute inset-y-0 left-0 bg-blue-500 rounded-r-lg"
                style={{ width: `${(data.current_mrr / maxMRR) * 100}%` }}
              />
              <span className="absolute inset-y-0 flex items-center left-2 text-xs font-medium text-white">
                ${data.current_mrr.toLocaleString()}
              </span>
            </div>
          </div>
          {data.forecasts.map((f, i) => (
            <div key={f.month || i} className="flex items-center gap-3">
              <span className="w-28 text-sm text-gray-500 text-right">{f.month}</span>
              <div className="flex-1 relative h-8">
                {/* Confidence range */}
                <div
                  className="absolute inset-y-0 bg-green-100 rounded-r-lg"
                  style={{
                    left: `${(f.confidence_low / maxMRR) * 100}%`,
                    width: `${((f.confidence_high - f.confidence_low) / maxMRR) * 100}%`,
                  }}
                />
                {/* Projected */}
                <div
                  className="absolute inset-y-0 left-0 bg-green-500 rounded-r-lg"
                  style={{ width: `${(f.projected_mrr / maxMRR) * 100}%` }}
                />
                <span className="absolute inset-y-0 flex items-center left-2 text-xs font-medium text-white">
                  ${f.projected_mrr.toLocaleString()}
                </span>
                <span className="absolute inset-y-0 flex items-center right-2 text-xs text-gray-500">
                  {f.growth_from_current >= 0 ? (
                    <span className="flex items-center text-green-600"><ArrowUpRight className="w-3 h-3" />+{f.growth_from_current}%</span>
                  ) : (
                    <span className="flex items-center text-red-600"><ArrowDownRight className="w-3 h-3" />{f.growth_from_current}%</span>
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Forecast Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Month</th>
              <th className="text-right px-4 py-3 font-medium">Projected MRR</th>
              <th className="text-right px-4 py-3 font-medium">Projected ARR</th>
              <th className="text-right px-4 py-3 font-medium">Low</th>
              <th className="text-right px-4 py-3 font-medium">High</th>
              <th className="text-right px-4 py-3 font-medium">Рост</th>
            </tr>
          </thead>
          <tbody>
            {data.forecasts.map((f, i) => (
              <tr key={f.month || i} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{f.month}</td>
                <td className="px-4 py-3 text-right">${f.projected_mrr.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">${f.projected_arr.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-gray-400">${f.confidence_low.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-gray-400">${f.confidence_high.toLocaleString()}</td>
                <td className={`px-4 py-3 text-right font-medium ${f.growth_from_current >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {f.growth_from_current >= 0 ? "+" : ""}{f.growth_from_current}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Assumptions */}
      <div className="bg-gray-50 rounded-xl border p-4 text-sm text-gray-500">
        <p className="font-medium text-gray-700 mb-1">Assumptions</p>
        <p>Based on {data.assumptions.based_on_months} months of historical data • Avg growth: {data.assumptions.avg_growth_rate}%/mo • Churn: {data.assumptions.churn_rate}%</p>
      </div>
    </div>
  );
}
