'use client';

import { Shield, Zap, AlertTriangle } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

interface BanRuleStatsProps {
    totalRules: number;
    enabledCount: number;
    totalTriggered: number;
}

// Карточки статистики правил автобана
export function BanRuleStats({ totalRules, enabledCount, totalTriggered }: BanRuleStatsProps) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            <GlassCard>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem' }}>
                    <Shield size={20} className="text-indigo-500" />
                    <div>
                        <div className="text-slate-200" style={{ fontSize: '1.25rem', fontWeight: 700 }}>{totalRules}</div>
                        <div className="text-slate-500" style={{ fontSize: '0.75rem' }}>Всего правил</div>
                    </div>
                </div>
            </GlassCard>
            <GlassCard>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem' }}>
                    <Zap size={20} className="text-emerald-500" />
                    <div>
                        <div className="text-slate-200" style={{ fontSize: '1.25rem', fontWeight: 700 }}>{enabledCount}</div>
                        <div className="text-slate-500" style={{ fontSize: '0.75rem' }}>Активных</div>
                    </div>
                </div>
            </GlassCard>
            <GlassCard>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem' }}>
                    <AlertTriangle size={20} className="text-orange-500" />
                    <div>
                        <div className="text-slate-200" style={{ fontSize: '1.25rem', fontWeight: 700 }}>{totalTriggered}</div>
                        <div className="text-slate-500" style={{ fontSize: '0.75rem' }}>Срабатываний</div>
                    </div>
                </div>
            </GlassCard>
        </div>
    );
}
