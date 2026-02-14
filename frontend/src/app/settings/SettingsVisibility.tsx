'use client';

import { useState, useEffect, useCallback } from 'react';
import { EyeOff } from 'lucide-react';
import { authService } from '@/services/api';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { SectionWrapper, Loader } from './SettingsShared';
import type { VisibilitySettings } from './settingsTypes';

// Секция приватности и инкогнито
export function SettingsVisibility() {
    const [visibility, setVisibility] = useState<VisibilitySettings>({
        show_online_status: true, show_last_seen: true,
        show_distance: true, show_age: true, read_receipts: true,
    });
    const [incognito, setIncognito] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            authService.getVisibilitySettings().catch(() => null),
            authService.getIncognitoStatus().catch(() => null),
        ]).then(([vis, inc]) => {
            if (vis) setVisibility(prev => ({ ...prev, ...vis }));
            if (inc && typeof inc === 'object' && 'enabled' in inc) setIncognito((inc as { enabled: boolean }).enabled);
        }).finally(() => setLoading(false));
    }, []);

    const toggleVisibility = useCallback(async (key: keyof VisibilitySettings, value: boolean) => {
        setVisibility(prev => ({ ...prev, [key]: value }));
        try {
            await authService.updateVisibilitySettings({ [key]: value });
        } catch {
            setVisibility(prev => ({ ...prev, [key]: !value }));
        }
    }, []);

    const toggleIncognito = useCallback(async (value: boolean) => {
        setIncognito(value);
        try {
            if (value) await authService.enableIncognito();
            else await authService.disableIncognito();
        } catch {
            setIncognito(!value);
        }
    }, []);

    if (loading) return <Loader />;

    return (
        <SectionWrapper>
            {/* Инкогнито */}
            <div className="rounded-2xl bg-gradient-to-br from-purple-500/10 to-purple-900/5 border border-purple-500/20 p-4 mb-4">
                <div className="flex items-center gap-3 mb-3">
                    <EyeOff size={20} className="text-purple-400" />
                    <span className="text-white font-bold text-sm">Режим инкогнито</span>
                </div>
                <p className="text-xs text-slate-400 mb-3">Ваш профиль не будет показываться в ленте. Вы сможете просматривать других, оставаясь невидимым.</p>
                <ToggleSwitch
                    label="Включить инкогнито"
                    checked={incognito}
                    onChange={toggleIncognito}
                />
            </div>

            {/* Переключатели видимости */}
            <div className="rounded-2xl bg-white/5 p-4 space-y-1">
                <ToggleSwitch label="Показывать онлайн-статус" description="Другие видят, что вы в сети" checked={visibility.show_online_status} onChange={(v) => toggleVisibility('show_online_status', v)} />
                <ToggleSwitch label="Показывать «был(а) в сети»" description="Время последнего визита" checked={visibility.show_last_seen} onChange={(v) => toggleVisibility('show_last_seen', v)} />
                <ToggleSwitch label="Показывать расстояние" description="Дистанция до вас в профиле" checked={visibility.show_distance} onChange={(v) => toggleVisibility('show_distance', v)} />
                <ToggleSwitch label="Показывать возраст" description="Ваш возраст виден другим" checked={visibility.show_age} onChange={(v) => toggleVisibility('show_age', v)} />
                <ToggleSwitch label="Отчёты о прочтении" description="Собеседник видит, что вы прочли" checked={visibility.read_receipts} onChange={(v) => toggleVisibility('read_receipts', v)} />
            </div>
        </SectionWrapper>
    );
}
