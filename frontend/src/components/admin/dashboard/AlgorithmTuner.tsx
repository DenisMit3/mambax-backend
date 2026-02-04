'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sliders, Save, RefreshCw } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import advancedApi, { AlgorithmParams, AlgorithmParamsResponse } from '@/services/advancedApi';
import { useTelegram } from '@/lib/telegram';

export const AlgorithmTuner = () => {
    const { hapticFeedback } = useTelegram();
    const queryClient = useQueryClient();

    // Remote State
    const { data: remoteData, isLoading } = useQuery<AlgorithmParamsResponse>({
        queryKey: ['admin', 'algorithm'],
        queryFn: async () => {
            try {
                return await advancedApi.getAlgorithmParams();
            } catch (e) {
                console.error("Algo params error:", e);
                // Fallback default
                return {
                    version: '1.0',
                    last_updated: new Date().toISOString(),
                    updated_by: 'system',
                    params: {
                        distance_weight: 0.5,
                        age_weight: 0.3,
                        interests_weight: 0.2,
                        activity_weight: 0.1,
                        response_rate_weight: 0.1
                    },
                    experimental: {}
                };
            }
        },
        staleTime: 60000
    });

    // Local State for Sliders
    const [params, setParams] = useState<AlgorithmParams | null>(null);

    useEffect(() => {
        if (remoteData?.params) {
            setParams(remoteData.params);
        }
    }, [remoteData]);

    // Save Mutation
    const saveMutation = useMutation({
        mutationFn: (newParams: AlgorithmParams) => advancedApi.updateAlgorithmParams(newParams),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'algorithm'] });
            hapticFeedback.notificationOccurred('success');
        },
        onError: () => hapticFeedback.notificationOccurred('error')
    });

    const handleSave = () => {
        if (params) {
            saveMutation.mutate(params);
        }
    };

    const handleChange = (key: keyof AlgorithmParams, val: number) => {
        if (!params) return;
        setParams({ ...params, [key]: val });
    };

    if (isLoading || !params) {
        return <div className="p-8 text-center text-slate-500 animate-pulse">Loading engine parameters...</div>;
    }

    return (
        <GlassCard className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                        <Sliders size={20} className="text-blue-400" />
                        Matching Engine v{remoteData?.version}
                    </h3>
                    <p className="text-xs text-slate-500">
                        Last tuned: {new Date(remoteData?.last_updated || Date.now()).toLocaleDateString()}
                    </p>
                </div>
                <AnimatedButton
                    variant="primary"
                    size="sm"
                    onClick={handleSave}
                    isLoading={saveMutation.isPending}
                    icon={<Save size={16} />}
                >
                    Apply Metrics
                </AnimatedButton>
            </div>

            <div className="space-y-6">
                {Object.entries(params).map(([key, value]) => (
                    <div key={key} className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-300 capitalize">{key.replace('_', ' ')}</span>
                            <span className="font-mono text-blue-400 font-bold">{(value as number).toFixed(2)}</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={value as number}
                            onChange={(e) => handleChange(key as keyof AlgorithmParams, parseFloat(e.target.value))}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                    </div>
                ))}
            </div>

            <div className="mt-8 p-4 bg-slate-800/50 rounded-xl border border-dashed border-slate-700">
                <p className="text-xs text-slate-500 text-center">
                    Adjusting these weights affects the recommendation feed for all users globally.
                    Changes propagate to the Redis caching layer within 60 seconds.
                </p>
            </div>
        </GlassCard>
    );
};
