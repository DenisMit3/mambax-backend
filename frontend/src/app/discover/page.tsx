"use client";

import { useState, useEffect } from "react";
import { BottomNav } from "@/components/layout/BottomNav";
import { SwipeCard } from "@/components/ui/SwipeCard";
import { X, Heart } from "lucide-react";
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
        <div style={{
            height: '100dvh',
            width: '100%',
            position: 'relative',
            background: 'var(--background)',
            overflow: 'hidden'
        }}>

            {/* Main Swipe Area */}
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: '60px', // Space for BottomNav
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px'
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

            {/* Floating Action Buttons */}
            <div style={{
                position: 'fixed',
                bottom: '90px', // Above nav
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: '24px',
                zIndex: 20
            }}>
                <button
                    onClick={() => handleSwipe("left")}
                    style={{
                        width: '56px', height: '56px', borderRadius: '50%',
                        background: 'white',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#FF4D6D'
                    }}
                >
                    <X size={28} strokeWidth={3} />
                </button>

                <button
                    onClick={() => handleSwipe("right")}
                    style={{
                        width: '56px', height: '56px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #FF5A27 0%, #FF2E55 100%)',
                        boxShadow: '0 8px 20px rgba(255, 90, 39, 0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white'
                    }}
                >
                    <Heart size={28} fill="white" strokeWidth={0} />
                </button>
            </div>

            {/* Bottom Nav */}
            <BottomNav />
        </div>
    );
}
