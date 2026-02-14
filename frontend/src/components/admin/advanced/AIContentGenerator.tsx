'use client';

import { useState } from 'react';
import { advancedApi, AIGenerateRequest } from '@/services/advancedApi';
import { Loader2, Wand2, Copy, Check } from 'lucide-react';
import { Toast } from '@/components/ui/Toast';

export default function AIContentGenerator() {
    const [loading, setLoading] = useState(false);
    const [request, setRequest] = useState<AIGenerateRequest>({
        content_type: 'bio',
        context: '',
        tone: 'friendly',
        count: 3
    });
    const [results, setResults] = useState<string[]>([]);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const [toast, setToast] = useState<{message: string; type: 'success' | 'error'} | null>(null);

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const response = await advancedApi.generateContent(request);
            setResults(response.suggestions);
        } catch (error) {
            console.error('Failed to generate content:', error);
            setToast({message: 'Failed to generate content. Please check console for details.', type: 'error'});
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    return (
        <>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Wand2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">AI Content Generator</h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Generate bios, icebreakers, and more</p>
                </div>
            </div>

            <div className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Content Type</label>
                        <select
                            className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                            value={request.content_type}
                            onChange={(e) => setRequest({ ...request, content_type: e.target.value as AIGenerateRequest['content_type'] })}
                        >
                            <option value="bio">Profile Bio</option>
                            <option value="icebreaker">Icebreaker</option>
                            <option value="opener">Opening Pickup Line</option>
                            <option value="caption">Photo Caption</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Tone</label>
                        <select
                            className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                            value={request.tone}
                            onChange={(e) => setRequest({ ...request, tone: e.target.value })}
                        >
                            <option value="friendly">Friendly</option>
                            <option value="romantic">Romantic</option>
                            <option value="funny">Funny</option>
                            <option value="professional">Professional</option>
                            <option value="mysterious">Mysterious</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Context / Keywords</label>
                    <textarea
                        className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 resize-none h-24"
                        placeholder="e.g. loves hiking, coffee, and dogs..."
                        value={request.context || ''}
                        onChange={(e) => setRequest({ ...request, context: e.target.value })}
                    />
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="w-full py-2.5 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Generating...
                        </>
                    ) : (
                        <>
                            <Wand2 className="w-4 h-4" />
                            Generate Content
                        </>
                    )}
                </button>
            </div>

            {results.length > 0 && (
                <div className="space-y-3">
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Results</label>
                    {results.map((result, idx) => (
                        <div key={idx} className="group relative p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 hover:border-purple-500/50 transition-colors">
                            <p className="text-zinc-800 dark:text-zinc-200 pr-8">{result}</p>
                            <button
                                onClick={() => copyToClipboard(result, idx)}
                                className="absolute top-3 right-3 p-1.5 text-zinc-400 hover:text-purple-500 transition-colors"
                            >
                                {copiedIndex === idx ? (
                                    <Check className="w-4 h-4" />
                                ) : (
                                    <Copy className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </>
    );
}
