"use client";

import { useState, useEffect } from "react";
import { BottomNav } from "@/components/layout/BottomNav";
import { SwipeCard } from "@/components/ui/SwipeCard";
import { X, Heart, Star } from "lucide-react";
import { authService } from "@/services/api";

type Profile = {
    id: string;
    name: string;
    age: number;
    bio?: string;
    photos: string[];
};

export default function DiscoverPage() {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        authService.getProfiles()
            .then((data) => {
                setProfiles(data);
            })
            .catch(err => console.error("Feed Error", err))
            .finally(() => setLoading(false));
    }, []);

    const handleSwipe = async (direction: "left" | "right") => {
        const profile = profiles[currentIndex];
        if (!profile) return;

        // Optimistic UI update
        setCurrentIndex((prev) => prev + 1);

        if (direction === "right") {
            try {
                const res = await authService.likeUser(profile.id);
                if (res.status === "matched") {
                    // Show Match Popup
                    alert("IT'S A MATCH! Go to chat.");
                    // In real app, fancy modal
                }
            } catch (e) {
                console.error("Like failed", e);
            }
        }
    };

    if (loading) {
        return (
            <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh' }}>
                <p>Loading profiles...</p>
            </div>
        );
    }

    // No more profiles
    if (!profiles || currentIndex >= profiles.length) {
        return (
            <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '10px' }}>No more profiles</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Check back later!</p>
                <button
                    className="btn btn-secondary"
                    style={{ marginTop: '20px' }}
                    onClick={() => window.location.reload()}
                >
                    Refresh
                </button>
                <div style={{ position: 'absolute', bottom: 0, width: '100%' }}>
                    <BottomNav />
                </div>
            </div>
        );
    }

    const currentProfile = profiles[currentIndex];

    return (
        <div className="container" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            height: '100dvh',
            maxHeight: '100dvh',
            overflow: 'hidden',
            paddingBottom: '80px', // Space for BottomNav
            position: 'relative'
        }}>

            {/* Top Bar */}
            <div style={{ width: '100%', padding: '15px 0', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                <h1 className="title-gradient" style={{ fontSize: '24px', fontWeight: 800 }}>MambaX</h1>
            </div>

            {/* Card Area - Flex Glow to fill space */}
            <div style={{
                flex: 1,
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                padding: '10px 0'
            }}>
                <SwipeCard
                    key={currentProfile.id}
                    name={currentProfile.name}
                    age={currentProfile.age}
                    bio={currentProfile.bio || ""}
                    image={currentProfile.photos[0] || "https://placehold.co/400x600/1a1a1a/white?text=No+Photo"}
                    onSwipe={handleSwipe}
                />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', alignItems: 'center', zIndex: 10, flexShrink: 0 }}>
                <button
                    className="btn"
                    style={{
                        width: '64px', height: '64px', borderRadius: '50%',
                        background: 'var(--surface)',
                        border: '1px solid #FF4D6D',
                        color: '#FF4D6D',
                        boxShadow: 'var(--shadow-lg)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                    onClick={() => handleSwipe("left")}
                >
                    <X size={32} strokeWidth={3} />
                </button>

                <button className="btn" style={{
                    width: '48px', height: '48px', borderRadius: '50%',
                    background: 'var(--surface)',
                    border: '1px solid #FFB800',
                    color: '#FFB800',
                    boxShadow: 'var(--shadow-md)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <Star size={24} strokeWidth={3} />
                </button>

                <button
                    className="btn"
                    style={{
                        width: '64px', height: '64px', borderRadius: '50%',
                        background: 'var(--primary-gradient)',
                        border: 'none',
                        color: 'white',
                        boxShadow: 'var(--shadow-glow-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                    onClick={() => handleSwipe("right")}
                >
                    <Heart size={32} fill="white" strokeWidth={0} />
                </button>
            </div>

            {/* Bottom Nav */}
            <BottomNav />
        </div>
    );
}
