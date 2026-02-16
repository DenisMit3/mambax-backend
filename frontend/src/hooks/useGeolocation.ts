'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { authService } from '@/services/api';

export interface GeoCoords {
    lat: number;
    lon: number;
}

const STORAGE_KEY = 'geo_coords';
const STORAGE_TS_KEY = 'geo_coords_ts';
/** How long cached coords are considered fresh (5 minutes) */
const CACHE_TTL_MS = 5 * 60 * 1000;
/** Min distance change (meters) to trigger backend update */
const MIN_DISTANCE_M = 200;

/** Haversine distance in meters between two points */
function haversineM(a: GeoCoords, b: GeoCoords): number {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lon - a.lon);
    const x =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function readCache(): { coords: GeoCoords; ts: number } | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const ts = Number(localStorage.getItem(STORAGE_TS_KEY) || '0');
        if (raw && ts) {
            const coords = JSON.parse(raw) as GeoCoords;
            if (coords.lat && coords.lon) return { coords, ts };
        }
    } catch { /* corrupted */ }
    return null;
}

function writeCache(coords: GeoCoords) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(coords));
    localStorage.setItem(STORAGE_TS_KEY, String(Date.now()));
}

/**
 * Centralized geolocation hook.
 * 
 * - Reads cached coords from localStorage immediately (no browser prompt).
 * - If cache is stale (>5 min) or empty, requests GPS once.
 * - Sends to backend only if coords changed by >200m.
 * - Returns { coords, loading, error, refresh }.
 * 
 * @param skip — pass true to disable (e.g. when not authed yet)
 */
export function useGeolocation(skip = false) {
    const [coords, setCoords] = useState<GeoCoords | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const sentToBackend = useRef(false);

    const syncBackend = useCallback(async (newCoords: GeoCoords, oldCoords: GeoCoords | null) => {
        if (sentToBackend.current) return;
        // Only send if first time or moved significantly
        if (oldCoords && haversineM(oldCoords, newCoords) < MIN_DISTANCE_M) return;
        sentToBackend.current = true;
        try {
            await authService.updateLocation(newCoords.lat, newCoords.lon);
        } catch {
            // Rate-limited or network error — silent, coords are cached locally
        }
    }, []);

    const requestGPS = useCallback(() => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
            setError('Геолокация не поддерживается');
            setLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const newCoords: GeoCoords = {
                    lat: pos.coords.latitude,
                    lon: pos.coords.longitude,
                };
                const cached = readCache();
                writeCache(newCoords);
                setCoords(newCoords);
                setLoading(false);
                setError(null);
                syncBackend(newCoords, cached?.coords ?? null);
            },
            (err) => {
                // Permission denied or timeout — use cache if available
                const cached = readCache();
                if (cached) {
                    setCoords(cached.coords);
                }
                setError(err.message);
                setLoading(false);
            },
            { enableHighAccuracy: false, timeout: 8000, maximumAge: CACHE_TTL_MS }
        );
    }, [syncBackend]);

    useEffect(() => {
        if (skip) {
            setLoading(false);
            return;
        }

        const cached = readCache();

        if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
            // Fresh cache — use immediately, no browser prompt
            setCoords(cached.coords);
            setLoading(false);
            syncBackend(cached.coords, null);
        } else if (cached) {
            // Stale cache — show cached coords instantly, refresh in background
            setCoords(cached.coords);
            setLoading(false);
            requestGPS();
        } else {
            // No cache — must request GPS (will trigger browser prompt once)
            requestGPS();
        }
    }, [skip, requestGPS, syncBackend]);

    /** Force refresh GPS (e.g. user taps "update location" button) */
    const refresh = useCallback(() => {
        setLoading(true);
        sentToBackend.current = false;
        requestGPS();
    }, [requestGPS]);

    return { coords, loading, error, refresh };
}
