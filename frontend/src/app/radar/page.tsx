'use client';

import { useState, useEffect } from 'react';
import { GeoMapRadar } from '@/components/discovery/GeoMapRadar';
import { authService, UserProfile, PaginatedResponse } from '@/services/api';
import { useRequireAuth } from "@/hooks/useRequireAuth";

// Координаты Москвы как фоллбэк
const MOSCOW_LAT = 55.7558;
const MOSCOW_LON = 37.6173;

export default function RadarPage() {
    const { isAuthed, isChecking } = useRequireAuth();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isAuthed) return;
        const loadRadar = async (lat: number, lon: number) => {
            try {
                const data: PaginatedResponse<UserProfile> = await authService.getProfiles({ lat, lon, limit: 50 });
                setUsers(data.items ?? []);
            } catch (error) {
                console.error('Не удалось загрузить радар', error);
            } finally {
                setLoading(false);
            }
        };

        // Пытаемся получить реальную геолокацию пользователя
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    // Успех — используем реальные координаты
                    loadRadar(position.coords.latitude, position.coords.longitude);
                },
                (error) => {
                    // Отказ или ошибка — фоллбэк на Москву
                    console.warn('Геолокация недоступна, используем Москву:', error.message);
                    loadRadar(MOSCOW_LAT, MOSCOW_LON);
                },
                {
                    enableHighAccuracy: false,
                    timeout: 8000,
                    maximumAge: 300000, // Кэш 5 минут
                }
            );
        } else {
            // Браузер не поддерживает geolocation
            loadRadar(MOSCOW_LAT, MOSCOW_LON);
        }
    }, [isAuthed]);

    return (
        <main className="h-full">
            <GeoMapRadar users={users} loading={loading} />
        </main>
    );
}
