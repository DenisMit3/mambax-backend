'use client';

import { useState, useEffect } from 'react';
import { GeoMapRadar } from '@/components/discovery/GeoMapRadar';
import { authService, UserProfile, PaginatedResponse } from '@/services/api';
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useGeolocation } from '@/hooks/useGeolocation';

// Координаты Москвы как фоллбэк
const MOSCOW_LAT = 55.7558;
const MOSCOW_LON = 37.6173;

export default function RadarPage() {
    const { isAuthed } = useRequireAuth();
    const { coords, loading: geoLoading } = useGeolocation(!isAuthed);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isAuthed || geoLoading) return;

        const lat = coords?.lat ?? MOSCOW_LAT;
        const lon = coords?.lon ?? MOSCOW_LON;

        const loadRadar = async () => {
            try {
                const data: PaginatedResponse<UserProfile> = await authService.getProfiles({ lat, lon, limit: 50 });
                setUsers(data.items ?? []);
            } catch (error) {
                console.error('Не удалось загрузить радар', error);
            } finally {
                setLoading(false);
            }
        };

        loadRadar();
    }, [isAuthed, geoLoading, coords]);

    return (
        <main className="h-full">
            <GeoMapRadar users={users} loading={loading} />
        </main>
    );
}
