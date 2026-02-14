'use client';

import { useState, useEffect } from 'react';
import { Smartphone } from 'lucide-react';
import { authService } from '@/services/api';
import { SectionWrapper, Loader } from './SettingsShared';
import type { Device } from './settingsTypes';

// Секция активных устройств
export function SettingsDevices() {
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        authService.getDevices()
            .then((data) => {
                if (data && typeof data === 'object' && 'devices' in data) {
                    setDevices((data as { devices: Device[] }).devices);
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <Loader />;

    if (devices.length === 0) {
        return (
            <SectionWrapper>
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Smartphone size={48} className="text-slate-600 mb-4" />
                    <p className="text-slate-400 font-medium">Нет данных</p>
                    <p className="text-xs text-slate-600 mt-1">Информация об устройствах недоступна</p>
                </div>
            </SectionWrapper>
        );
    }

    return (
        <SectionWrapper>
            <div className="space-y-2">
                {devices.map((device) => (
                    <div key={device.id} className="p-4 rounded-2xl bg-white/5 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-300">
                            <Smartphone size={18} />
                        </div>
                        <div className="flex-1">
                            <div className="text-white font-medium text-sm">{device.platform || 'Неизвестно'}</div>
                            <div className="text-xs text-slate-500 truncate max-w-[200px]">{device.user_agent}</div>
                            <div className="text-xs text-slate-600 mt-0.5">
                                Последняя активность: {new Date(device.last_active).toLocaleDateString('ru-RU')}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </SectionWrapper>
    );
}
