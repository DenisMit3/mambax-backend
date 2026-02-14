'use client';

import { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import { authService } from '@/services/api';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { SectionWrapper, Loader } from './SettingsShared';

// Секция безопасности (2FA)
export function SettingsSecurity() {
    const [twoFAEnabled, setTwoFAEnabled] = useState(false);
    const [loading, setLoading] = useState(true);
    const [toggling, setToggling] = useState(false);

    useEffect(() => {
        authService.get2FAStatus()
            .then((data) => { if (data && typeof data === 'object' && 'enabled' in data) setTwoFAEnabled((data as { enabled: boolean }).enabled); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const toggle2FA = async (value: boolean) => {
        setToggling(true);
        try {
            if (value) {
                await authService.enable2FA('telegram');
            } else {
                await authService.disable2FA();
            }
            setTwoFAEnabled(value);
        } catch (e) {
            console.error('2FA toggle failed:', e);
        } finally {
            setToggling(false);
        }
    };

    if (loading) return <Loader />;

    return (
        <SectionWrapper>
            <div className="rounded-2xl bg-white/5 p-4">
                <div className="flex items-center gap-3 mb-4">
                    <Lock size={20} className="text-cyan-400" />
                    <span className="text-white font-bold text-sm">Двухфакторная аутентификация</span>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                    При входе потребуется подтверждение через Telegram. Это защитит ваш аккаунт от несанкционированного доступа.
                </p>
                <ToggleSwitch
                    label={twoFAEnabled ? '2FA включена' : '2FA выключена'}
                    description={toggling ? 'Обновление...' : 'Подтверждение через Telegram'}
                    checked={twoFAEnabled}
                    onChange={toggle2FA}
                />
            </div>
        </SectionWrapper>
    );
}
