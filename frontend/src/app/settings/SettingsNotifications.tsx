'use client';

import { useState, useEffect, useCallback } from 'react';
import { authService } from '@/services/api';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { SectionWrapper, Loader } from './SettingsShared';
import type { NotificationSettings } from './settingsTypes';

// Секция настроек уведомлений
export function SettingsNotifications() {
    const [settings, setSettings] = useState<NotificationSettings>({
        new_match: true, new_message: true, new_like: true,
        super_like: true, profile_view: true, match_reminder: true, promotion: false,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        authService.getNotificationSettings()
            .then((data: any) => setSettings(prev => ({ ...prev, ...data })))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const toggle = useCallback(async (key: keyof NotificationSettings, value: boolean) => {
        setSettings(prev => ({ ...prev, [key]: value }));
        try {
            await authService.updateNotificationSettings({ [key]: value });
        } catch {
            setSettings(prev => ({ ...prev, [key]: !value }));
        }
    }, []);

    if (loading) return <Loader />;

    const items: { key: keyof NotificationSettings; label: string; desc: string }[] = [
        { key: 'new_match', label: 'Новый мэтч', desc: 'Когда кто-то тоже свайпнул вправо' },
        { key: 'new_message', label: 'Новое сообщение', desc: 'Входящие сообщения в чатах' },
        { key: 'new_like', label: 'Новый лайк', desc: 'Когда вас кто-то лайкнул' },
        { key: 'super_like', label: 'Суперлайк', desc: 'Когда вам отправили суперлайк' },
        { key: 'profile_view', label: 'Просмотр профиля', desc: 'Когда кто-то смотрел ваш профиль' },
        { key: 'match_reminder', label: 'Напоминания', desc: 'Напомнить написать мэтчу' },
        { key: 'promotion', label: 'Акции и новости', desc: 'Специальные предложения' },
    ];

    return (
        <SectionWrapper>
            <div className="rounded-2xl bg-white/5 p-4 space-y-1">
                {items.map((item) => (
                    <ToggleSwitch
                        key={item.key}
                        label={item.label}
                        description={item.desc}
                        checked={settings[item.key]}
                        onChange={(v) => toggle(item.key, v)}
                    />
                ))}
            </div>
        </SectionWrapper>
    );
}
