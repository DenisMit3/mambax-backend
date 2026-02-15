"use client";

import { useState, useEffect, useCallback } from "react";
import { adminApi } from "@/services/admin";
import {
  FlaskConical, Plus, Play, Pause, Trophy, Trash2, Edit, BarChart3,
} from "lucide-react";

interface Variant {
  name: string;
  price: number;
  features?: string[];
}

interface PricingTest {
  id: string;
  name: string;
  description: string | null;
  variants: Variant[];
  target_segment: string;
  traffic_split: number[];
  start_date: string | null;
  end_date: string | null;
  status: string;
  results: Record<string, unknown>;
  winner_variant: string | null;
  created_at: string | null;
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  running: "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function PricingTestsPage() {
  const [tests, setTests] = useState<PricingTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<string>("");
  const [selectedTest, setSelectedTest] = useState<PricingTest | null>(null);
  const [results, setResults] = useState<Record<string, unknown> | null>(null);

  // Form state
  const [form, setForm] = useState({
    name: "",
    description: "",
    target_segment: "all",
    start_date: "",
    end_date: "",
    variants: [
      { name: "Control", price: 9.99, features: [] as string[] },
      { name: "Variant B", price: 7.99, features: [] as string[] },
    ],
  });

  const fetchTests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.monetization.pricingTests.list(filter || undefined) as { tests: PricingTest[] };
      setTests(data.tests || []);
    } catch (e) {
      console.error("Failed to load pricing tests", e);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchTests(); }, [fetchTests]);

  const handleCreate = async () => {
    try {
      await adminApi.monetization.pricingTests.create({
        name: form.name,
        description: form.description || null,
        variants: form.variants,
        target_segment: form.target_segment,
        traffic_split: form.variants.map(() => Math.floor(100 / form.variants.length)),
        start_date: form.start_date,
        end_date: form.end_date,
      });
      setShowCreate(false);
      setForm({
        name: "", description: "", target_segment: "all", start_date: "", end_date: "",
        variants: [
          { name: "Control", price: 9.99, features: [] },
          { name: "Variant B", price: 7.99, features: [] },
        ],
      });
      fetchTests();
    } catch (e) {
      console.error("Failed to create test", e);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await adminApi.monetization.pricingTests.update(id, { status });
      fetchTests();
    } catch (e) {
      console.error("Failed to update test", e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this test?")) return;
    try {
      await adminApi.monetization.pricingTests.delete(id);
      fetchTests();
    } catch (e) {
      console.error("Failed to delete test", e);
    }
  };

  const handleViewResults = async (test: PricingTest) => {
    setSelectedTest(test);
    try {
      const data = await adminApi.monetization.pricingTests.getResults(test.id);
      setResults(data as Record<string, unknown>);
    } catch (e) {
      console.error("Failed to load results", e);
      setResults(null);
    }
  };

  const addVariant = () => {
    setForm((f) => ({
      ...f,
      variants: [...f.variants, { name: `Variant ${String.fromCharCode(65 + f.variants.length)}`, price: 9.99, features: [] }],
    }));
  };

  const removeVariant = (idx: number) => {
    if (form.variants.length <= 2) return;
    setForm((f) => ({ ...f, variants: f.variants.filter((_, i) => i !== idx) }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FlaskConical className="w-7 h-7 text-purple-500" />
            Pricing A/B Tests
          </h1>
          <p className="text-gray-500 mt-1">Create and manage pricing experiments</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
        >
          <Plus className="w-4 h-4" /> New Test
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {["", "draft", "running", "completed", "cancelled"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filter === s ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {/* Tests List */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Загрузка...</div>
      ) : tests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border">
          <FlaskConical className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No pricing tests yet</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {tests.map((test) => (
            <div key={test.id} className="bg-white rounded-xl border p-5 hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-lg">{test.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[test.status] || "bg-gray-100"}`}>
                      {test.status}
                    </span>
                  </div>
                  {test.description && <p className="text-gray-500 text-sm mt-1">{test.description}</p>}
                  <div className="flex gap-4 mt-2 text-xs text-gray-400">
                    <span>Segment: {test.target_segment}</span>
                    {test.start_date && <span>Start: {new Date(test.start_date).toLocaleDateString()}</span>}
                    {test.end_date && <span>End: {new Date(test.end_date).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  {test.status === "draft" && (
                    <button onClick={() => handleStatusChange(test.id, "running")} className="p-2 hover:bg-green-50 rounded-lg" title="Start">
                      <Play className="w-4 h-4 text-green-600" />
                    </button>
                  )}
                  {test.status === "running" && (
                    <button onClick={() => handleStatusChange(test.id, "completed")} className="p-2 hover:bg-yellow-50 rounded-lg" title="Stop">
                      <Pause className="w-4 h-4 text-yellow-600" />
                    </button>
                  )}
                  <button onClick={() => handleViewResults(test)} className="p-2 hover:bg-blue-50 rounded-lg" title="Results">
                    <BarChart3 className="w-4 h-4 text-blue-600" />
                  </button>
                  <button onClick={() => handleDelete(test.id)} className="p-2 hover:bg-red-50 rounded-lg" title="Удалить">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>

              {/* Variants */}
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                {(test.variants || []).map((v, i) => (
                  <div key={v.name || i} className={`p-3 rounded-lg border ${test.winner_variant === v.name ? "border-green-400 bg-green-50" : "bg-gray-50"}`}>
                    <div className="flex items-center gap-1">
                      {test.winner_variant === v.name && <Trophy className="w-3.5 h-3.5 text-green-600" />}
                      <span className="font-medium text-sm">{v.name}</span>
                    </div>
                    <p className="text-xl font-bold mt-1">${v.price}</p>
                    {test.traffic_split?.[i] && (
                      <p className="text-xs text-gray-400">{test.traffic_split[i]}% traffic</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold mb-4">Create Pricing Test</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Название</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Q1 Price Optimization"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Описание</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date</label>
                  <input
                    type="datetime-local"
                    value={form.start_date}
                    onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Date</label>
                  <input
                    type="datetime-local"
                    value={form.end_date}
                    onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Target Segment</label>
                <select
                  value={form.target_segment}
                  onChange={(e) => setForm((f) => ({ ...f, target_segment: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="all">All Users</option>
                  <option value="new_users">New Users</option>
                  <option value="free_users">Free Users</option>
                  <option value="lapsed">Lapsed Users</option>
                </select>
              </div>

              {/* Variants */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Variants</label>
                  <button onClick={addVariant} className="text-xs text-purple-600 hover:underline">+ Add Variant</button>
                </div>
                {form.variants.map((v, i) => (
                  <div key={v.name || i} className="flex gap-2 mb-2">
                    <input
                      value={v.name}
                      onChange={(e) => {
                        const variants = [...form.variants];
                        variants[i] = { ...variants[i], name: e.target.value };
                        setForm((f) => ({ ...f, variants }));
                      }}
                      className="flex-1 border rounded-lg px-3 py-2 text-sm"
                      placeholder="Variant name"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={v.price}
                      onChange={(e) => {
                        const variants = [...form.variants];
                        variants[i] = { ...variants[i], price: parseFloat(e.target.value) || 0 };
                        setForm((f) => ({ ...f, variants }));
                      }}
                      className="w-24 border rounded-lg px-3 py-2 text-sm"
                      placeholder="Price"
                    />
                    {form.variants.length > 2 && (
                      <button onClick={() => removeVariant(i)} className="text-red-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="flex-1 border rounded-lg py-2 hover:bg-gray-50">Отмена</button>
              <button
                onClick={handleCreate}
                disabled={!form.name || !form.start_date || !form.end_date}
                className="flex-1 bg-purple-600 text-white rounded-lg py-2 hover:bg-purple-700 disabled:opacity-50"
              >
                Create Test
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Modal */}
      {selectedTest && results && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6">
            <h2 className="text-xl font-bold mb-1">Test Results: {selectedTest.name}</h2>
            <p className="text-sm text-gray-500 mb-4">Status: {selectedTest.status}</p>

            <div className="space-y-3">
              {((results as { variants?: { variant: string; price: number; conversions: number; revenue: number }[] }).variants || []).map(
                (v: { variant: string; price: number; conversions: number; revenue: number }, i: number) => (
                  <div key={v.variant || i} className={`p-4 rounded-lg border ${(results as { winner_variant?: string }).winner_variant === v.variant ? "border-green-400 bg-green-50" : "bg-gray-50"}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {(results as { winner_variant?: string }).winner_variant === v.variant && <Trophy className="w-4 h-4 text-green-600" />}
                        <span className="font-semibold">{v.variant}</span>
                      </div>
                      <span className="font-bold">${v.price}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                      <div>Conversions: <span className="font-medium">{v.conversions}</span></div>
                      <div>Revenue: <span className="font-medium">${v.revenue}</span></div>
                    </div>
                  </div>
                )
              )}
            </div>

            <button
              onClick={() => { setSelectedTest(null); setResults(null); }}
              className="w-full mt-4 border rounded-lg py-2 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
