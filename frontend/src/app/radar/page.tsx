'use client';

import { useState, useEffect } from 'react';
import { GeoMapRadar } from '@/components/discovery/GeoMapRadar';
import { authService, UserProfile } from '@/services/api';

export default function RadarPage() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadRadar = async () => {
            try {
                // Default coordinates (Moscow)
                const lat = 55.7558;
                const lon = 37.6173;
                const data = await authService.getProfiles({ lat, lon, limit: 50 });

                // Handle response structure (array vs object with items)
                if (Array.isArray(data)) {
                    setUsers(data);
                } else if ((data as any).items) {
                    setUsers((data as any).items);
                } else {
                    setUsers([]);
                }
            } catch (error) {
                console.error('Failed to load radar', error);
            } finally {
                setLoading(false);
            }
        };

        loadRadar();
    }, []);

    return (
        <main className="h-full">
            <GeoMapRadar users={users} loading={loading} />
        </main>
    );
}
