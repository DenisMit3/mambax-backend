'use client';

import { useState } from 'react';
import { advancedApi } from '@/services/advancedApi';
import { Loader2, FileBarChart, Download, Settings, Check } from 'lucide-react';

export default function CustomReportsBuilder() {
    const [loading, setLoading] = useState(false);
    const [reportType, setReportType] = useState('user_analytics');
    const [period, setPeriod] = useState('30d');
    const [customSql, setCustomSql] = useState('');
    const [schedule, setSchedule] = useState('');
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const [lastReportId, setLastReportId] = useState<string | null>(null);

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const response = await advancedApi.generateReport(
                reportType,
                period,
                customSql,
                schedule
            );
            setLastReportId(response.report_id);
            // Simulate waiting for generation (since backend returns fast mock/generating status)
            // In real app, we might poll status.
            alert(`Report generation started! ID: ${response.report_id}`);
        } catch (error) {
            console.error('Failed to generate report:', error);
            alert('Failed to start report generation.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm h-full">
            <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <FileBarChart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Custom Report Builder</h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Export analytics and user data</p>
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Report Type</label>
                    <select
                        className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                        value={reportType}
                        onChange={(e) => setReportType(e.target.value)}
                    >
                        <option value="user_analytics">User Growth & Demographics</option>
                        <option value="financial">Financial / Revenue</option>
                        <option value="match_performance">Match Algorithm Performance</option>
                        <option value="technical">Technical Health / Errors</option>
                        <option value="marketing">Marketing Campaign Stats</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Time Period</label>
                    <div className="grid grid-cols-3 gap-2">
                        {['7d', '30d', '90d'].map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${period === p
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                                    }`}
                            >
                                {p.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                    <button
                        onClick={() => setAdvancedOpen(!advancedOpen)}
                        className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 w-full justify-center py-2"
                    >
                        <Settings size={14} />
                        {advancedOpen ? 'Hide Advanced Options' : 'Show Advanced Options (SQL & Schedule)'}
                    </button>

                    {advancedOpen && (
                        <div className="space-y-4 mt-2 animate-in fade-in slide-in-from-top-2 p-3 bg-zinc-50 dark:bg-zinc-950/50 rounded-lg border border-zinc-100 dark:border-zinc-800">
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Custom SQL Query</label>
                                <textarea
                                    className="w-full px-3 py-2 h-24 font-mono text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                                    placeholder="SELECT * FROM users WHERE..."
                                    value={customSql}
                                    onChange={(e) => setCustomSql(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Schedule</label>
                                <select
                                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                                    value={schedule}
                                    onChange={(e) => setSchedule(e.target.value)}
                                >
                                    <option value="">One-off (No Schedule)</option>
                                    <option value="daily">Daily at Midnight</option>
                                    <option value="weekly">Weekly (Sunday)</option>
                                    <option value="monthly">Monthly (1st)</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                <div className="pt-2">
                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4" />
                                Generate Report
                            </>
                        )}
                    </button>
                </div>

                {lastReportId && (
                    <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2 text-green-700 dark:text-green-400 text-sm">
                        <Check className="w-4 h-4" />
                        <span>Report #{lastReportId.substring(0, 8)} queued. Check email.</span>
                    </div>
                )}
            </div>
        </div>
    );
}
