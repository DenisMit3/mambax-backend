/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { BottomNav } from "@/components/layout/BottomNav";
import { authService } from "@/services/api";
import dynamic from "next/dynamic";
import Head from "next/head";

// Dynamically import react-leaflet components with SSR disabled
const MapContainer = dynamic(() => import("react-leaflet").then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then(mod => mod.Popup), { ssr: false });

export default function MapPage() {
    const [position, setPosition] = useState<[number, number] | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [others, setOthers] = useState<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [leafletIcon, setLeafletIcon] = useState<any>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);

        // Import Leaflet and create icon only on client side
        import("leaflet").then((L) => {
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

                // Send to backend
                const token = localStorage.getItem("token");
                await fetch("http://localhost:8000/location", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({ lat: latitude, lon: longitude })
                });
            });
        }

        // Fetch others (mock or real if implemented)
        authService.getProfiles().then(setOthers);
    }, []);

    // Don't render map until we have the icon (client-side only)
    if (!mounted || !leafletIcon) {
        return (
            <div style={{ height: "100vh", width: "100%", display: "flex", flexDirection: "column" }}>
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <p>Loading map...</p>
                </div>
                <BottomNav />
            </div>
        );
    }

    return (
        <>
            <Head>
                <link
                    rel="stylesheet"
                    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
                    integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
                    crossOrigin=""
                />
            </Head>
            <div style={{ height: "100vh", width: "100%", display: "flex", flexDirection: "column" }}>
                <div style={{ flex: 1, position: "relative" }}>
                    {position ? (
                        <MapContainer center={position} zoom={13} style={{ height: "100%", width: "100%" }}>
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />

                            {/* Me */}
                            <Marker position={position} icon={leafletIcon}>
                                <Popup>You are here</Popup>
                            </Marker>

                            {/* Others - Mocking positions around me for demo */}
                            {others.map((user, i) => {
                                // Stable random based on ID or index to avoid hydration mismatch
                                const offset = (i * 0.001) % 0.01;
                                const lat = user.latitude || (position[0] + offset);
                                const lon = user.longitude || (position[1] + offset);

                                return (
                                    <Marker key={user.id || i} position={[lat, lon]} icon={leafletIcon}>
                                        <Popup>
                                            <div style={{ textAlign: "center" }}>
                                                <img src={user.photos?.[0]} style={{ width: 40, height: 40, borderRadius: "50%" }} alt={user.name || "User"} />
                                                <br />
                                                <b>{user.name}, {user.age}</b>
                                            </div>
                                        </Popup>
                                    </Marker>
                                )
                            })}
                        </MapContainer>
                    ) : (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                            <p>Loading Map / Requesting Location...</p>
                        </div>
                    )}
                </div>

                <BottomNav />
            </div>
        </>
    );
}
