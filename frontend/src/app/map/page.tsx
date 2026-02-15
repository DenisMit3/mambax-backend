"use client";

import Image from 'next/image';
import { useEffect, useState } from "react";

import { authService } from "@/services/api";
import dynamic from "next/dynamic";
import { useRequireAuth } from "@/hooks/useRequireAuth";

// Import Leaflet CSS
import "leaflet/dist/leaflet.css";

// Dynamically import react-leaflet components with SSR disabled
const MapContainer = dynamic(() => import("react-leaflet").then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then(mod => mod.Popup), { ssr: false });

interface NearbyUser {
    id: string;
    name: string;
    age: number;
    photos?: string[];
    latitude?: number;
    longitude?: number;
}

export default function MapPage() {
    const { isAuthed, isChecking } = useRequireAuth();
    const [position, setPosition] = useState<[number, number] | null>(null);
    const [others, setOthers] = useState<NearbyUser[]>([]);
    // Leaflet Icon type is complex and dynamic-imported, using unknown here
    const [leafletIcon, setLeafletIcon] = useState<unknown>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        if (!isAuthed) return;
        setMounted(true);

        // Import Leaflet and create icon only on client side
        import("leaflet").then((L) => {
            // Fix Leaflet's default icon path issues in webpack
            delete (L.Icon.Default.prototype as Record<string, unknown>)._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
                iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
            });

            const icon = new L.Icon({
                iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
                iconSize: [25, 41],
                iconAnchor: [12, 41]
            });
            setLeafletIcon(icon);
        });

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (pos) => {
                const { latitude, longitude } = pos.coords;
                setPosition([latitude, longitude]);

                // Send to backend and fetch nearby users
                await authService.updateLocation(latitude, longitude);

                try {
                    // Use authService to get real users nearby
                    const result = await authService.getProfiles({ lat: latitude, lon: longitude, limit: 50 });
                    // Filter users who have valid coordinates (location.lat/lon)
                    const items = (result?.items || []);
                    setOthers(items.filter(u => u.location?.lat && u.location?.lon).map(u => ({
                        id: u.id,
                        name: u.name,
                        age: u.age,
                        photos: u.photos,
                        latitude: u.location!.lat,
                        longitude: u.location!.lon,
                    })));
                } catch (e) {
                    console.error("Failed to fetch nearby users", e);
                }
            });
        }
    }, [isAuthed]);

    // Don't render map until we have the icon (client-side only)
    if (!mounted || !leafletIcon) {
        return (
            <div style={{ height: "calc(100dvh - 7rem)", width: "100%", display: "flex", flexDirection: "column" }}>
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div className="animate-pulse bg-slate-800 rounded-full h-12 w-12"></div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ height: "calc(100dvh - 7rem)", width: "100%", display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1, position: "relative" }}>
                {position ? (
                    <MapContainer center={position} zoom={13} style={{ height: "100%", width: "100%" }}>
                        <TileLayer
                            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                        />

                        {/* Me */}
                        <Marker position={position} icon={leafletIcon}>
                            <Popup>Вы здесь</Popup>
                        </Marker>

                        {/* Real Users only */}
                        {others.map((user) => (
                            <Marker
                                key={user.id}
                                position={[user.latitude, user.longitude]}
                                icon={leafletIcon}
                            >
                                <Popup>
                                    <div style={{ textAlign: "center", color: "black" }}>
                                        {user.photos?.[0] && (
                                            <Image src={user.photos[0]} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", margin: "0 auto" }} alt={user.name} width={40} height={40} unoptimized />
                                        )}
                                        <div style={{ fontWeight: "bold", marginTop: 5 }}>{user.name}, {user.age}</div>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                        <p>Загрузка карты... / Запрос геолокации...</p>
                    </div>
                )}
            </div>

        </div>
    );
}
