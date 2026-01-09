"use client";

import { useState } from "react";
import { BottomNav } from "@/components/layout/BottomNav";
import { SlidersHorizontal, MapPin } from "lucide-react";

// Mock Data for Grid
const MOCK_GRID_PROFILES = [
    { id: "1", name: "Anna", age: 22, distance: "1km", imageUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1888&auto=format&fit=crop", online: true },
    { id: "2", name: "David", age: 30, distance: "5km", imageUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=1887&auto=format&fit=crop", online: false },
    { id: "3", name: "Sophie", age: 26, distance: "2km", imageUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=2070&auto=format&fit=crop", online: true },
    { id: "4", name: "Mark", age: 29, distance: "10km", imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1887&auto=format&fit=crop", online: true },
    { id: "5", name: "Lisa", age: 24, distance: "3km", imageUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=1887&auto=format&fit=crop", online: false },
    { id: "6", name: "James", age: 28, distance: "8km", imageUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=1887&auto=format&fit=crop", online: true },
];

export default function SearchPage() {
    const [filterMode, setFilterMode] = useState("all");

    return (
        <div className="container" style={{ paddingBottom: '80px' }}>

            {/* Header / Filter Bar */}
            <div style={{
                position: 'sticky',
                top: 0,
                zIndex: 40,
                background: 'rgba(10, 10, 12, 0.95)',
                backdropFilter: 'blur(10px)',
                padding: '15px 0',
                borderBottom: '1px solid var(--border)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h1 className="title-gradient" style={{ fontSize: '24px', fontWeight: 800 }}>Search</h1>
                    <button style={{ padding: '8px', background: 'var(--surface)', borderRadius: '12px' }}>
                        <SlidersHorizontal size={20} color="#A1A1AA" />
                    </button>
                </div>

                {/* Quick Filters */}
                <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '5px' }}>
                    {['Online', 'New', 'Nearby', 'Travel'].map((f) => (
                        <button key={f} style={{
                            padding: '6px 16px',
                            borderRadius: '20px',
                            background: 'var(--surface)',
                            fontSize: '13px',
                            border: '1px solid var(--border)',
                            whiteSpace: 'nowrap'
                        }}>
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                marginTop: '20px'
            }}>
                {MOCK_GRID_PROFILES.map((profile) => (
                    <div key={profile.id} style={{
                        position: 'relative',
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                        aspectRatio: '3/4',
                        background: 'var(--surface)'
                    }}>
                        <img
                            src={profile.imageUrl}
                            alt={profile.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        {profile.online && (
                            <div style={{
                                position: 'absolute',
                                top: '10px',
                                right: '10px',
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                background: '#4CAF50',
                                border: '2px solid rgba(0,0,0,0.5)'
                            }} />
                        )}
                        <div style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            padding: '10px',
                            background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)'
                        }}>
                            <div style={{ fontWeight: 600, fontSize: '15px' }}>{profile.name}, {profile.age}</div>
                            <div style={{ fontSize: '12px', color: '#ccc', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <MapPin size={10} /> {profile.distance}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <BottomNav />
        </div>
    );
}
