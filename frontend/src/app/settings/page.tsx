'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import type { SettingsSection } from './settingsTypes';
import { SettingsMainMenu } from './SettingsMainMenu';
import { SettingsNotifications } from './SettingsNotifications';
import { SettingsVisibility } from './SettingsVisibility';
import { SettingsSecurity } from './SettingsSecurity';
import { SettingsBlocked } from './SettingsBlocked';
import { SettingsDevices } from './SettingsDevices';
import { SettingsDeleteAccount } from './SettingsDeleteAccount';

// Заголовки секций
const sectionTitles: Record<SettingsSection, string> = {
    main: 'НАСТРОЙКИ',
    notifications: 'УВЕДОМЛЕНИЯ',
    visibility: 'ПРИВАТНОСТЬ',
    security: 'БЕЗОПАСНОСТЬ',
    blocked: 'ЗАБЛОКИРОВАННЫЕ',
    devices: 'УСТРОЙСТВА',
    delete: 'УДАЛЕНИЕ АККАУНТА',
};

export default function SettingsPage() {
    const router = useRouter();
    const [section, setSection] = useState<SettingsSection>('main');

    return (
        <div className="h-full overflow-y-auto scrollbar-hide bg-transparent pb-24">
            {/* Шапка */}
            <div className="px-6 pt-8 pb-4 flex items-center gap-4">
                <button
                    onClick={() => section === 'main' ? router.back() : setSection('main')}
                    className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/70 hover:bg-white/10 transition"
                >
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-2xl font-black text-white tracking-wide">
                    {sectionTitles[section]}
                </h1>
            </div>

            <div className="px-6">
                <AnimatePresence mode="wait">
                    {section === 'main' && <SettingsMainMenu key="main" onNavigate={setSection} />}
                    {section === 'notifications' && <SettingsNotifications key="notif" />}
                    {section === 'visibility' && <SettingsVisibility key="vis" />}
                    {section === 'security' && <SettingsSecurity key="sec" />}
                    {section === 'blocked' && <SettingsBlocked key="blocked" />}
                    {section === 'devices' && <SettingsDevices key="devices" />}
                    {section === 'delete' && <SettingsDeleteAccount key="delete" />}
                </AnimatePresence>
            </div>
        </div>
    );
}
