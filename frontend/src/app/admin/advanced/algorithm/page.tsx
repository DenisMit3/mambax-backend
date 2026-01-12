'use client';

import { useState, useEffect } from 'react';
import { advancedApi, AlgorithmParams } from '@/services/advancedApi';
import { Loader2, Save, Sliders, RefreshCw, AlertTriangle } from 'lucide-react';

export default function AlgorithmPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [params, setParams] = useState<AlgorithmParams | null>(null);
  const [version, setVersion] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadParams();
  }, []);

  const loadParams = async () => {
    setLoading(true);
    try {
      const data = await advancedApi.getAlgorithmParams();
      setParams(data.params);
      setVersion(data.version);
    } catch (e) {
      setError('Failed to load algorithm parameters');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!params) return;
    setSaving(true);
    try {
      const res = await advancedApi.updateAlgorithmParams(params);
      setVersion(res.version || 'v-new');
      // Assuming response matches what we expect, update local state
      // Re-fetch to be sure
      loadParams();
    } catch (e) {
      alert('Failed to save parameters');
    } finally {
      setSaving(false);
    }
  };

  const handleSliderChange = (key: keyof AlgorithmParams, value: number) => {
    if (!params) return;
    setParams({ ...params, [key]: value });
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;
  if (!params) return null;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <Sliders className="w-6 h-6 text-purple-500" />
            Match Algorithm Tuning
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Adjust weights for the recommendation engine.
            Current Version: <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{version}</span>
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Weights
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Weights Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-6">Scoring Weights</h3>

          <div className="space-y-6">
            <WeightSlider
              label="Distance (Proximity)"
              value={params.distance_weight}
              onChange={(v) => handleSliderChange('distance_weight', v)}
            />
            <WeightSlider
              label="Age Compatibility"
              value={params.age_weight}
              onChange={(v) => handleSliderChange('age_weight', v)}
            />
            <WeightSlider
              label="Shared Interests"
              value={params.interests_weight}
              onChange={(v) => handleSliderChange('interests_weight', v)}
            />
            <WeightSlider
              label="Activity Level"
              value={params.activity_weight}
              onChange={(v) => handleSliderChange('activity_weight', v)}
            />
            <WeightSlider
              label="Response Rate"
              value={params.response_rate_weight}
              onChange={(v) => handleSliderChange('response_rate_weight', v)}
            />
          </div>
        </div>

        {/* Preview / Warning */}
        <div className="space-y-6">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6">
            <h3 className="text-amber-800 dark:text-amber-200 font-semibold mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              impact Analysis
            </h3>
            <p className="text-amber-700 dark:text-amber-300 text-sm mb-4">
              Changing these weights drastically affects the user feed.
              Changes propagate to the cache within 15 minutes.
            </p>

            <div className="space-y-2 text-sm text-amber-800/80 dark:text-amber-200/80">
              <div className="flex justify-between">
                <span>Total Weight:</span>
                <span className={(function () {
                  const sum = params.distance_weight + params.age_weight + params.interests_weight + params.activity_weight + params.response_rate_weight;
                  return Math.abs(sum - 1.0) < 0.01 ? "font-bold text-green-600" : "font-bold text-red-500";
                })()}>
                  {(params.distance_weight + params.age_weight + params.interests_weight + params.activity_weight + params.response_rate_weight).toFixed(2)}
                </span>
              </div>
              <p className="text-xs mt-1">Sum should ideally equal 1.00</p>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
            <h3 className="font-semibold mb-4">Experimental Flags</h3>
            <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-sm">AI Compatibility Score</span>
              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">Active</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm">Photo Preference Learning</span>
              <span className="px-2 py-0.5 bg-zinc-100 text-zinc-500 rounded text-xs">Disabled</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WeightSlider({ label, value, onChange }: { label: string, value: number, onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex justify-between mb-2">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
        <span className="text-sm font-mono text-zinc-500">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer dark:bg-zinc-700 accent-purple-600"
      />
    </div>
  );
}
