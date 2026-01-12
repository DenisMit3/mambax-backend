"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/layout/BottomNav";
import { SwipeCard } from "@/components/ui/SwipeCard";
import { SendGiftModal } from "@/components/gifts";
import { BuySwipesModal } from "@/components/ui/BuySwipesModal";
import { TopUpModal } from "@/components/ui/TopUpModal";
import { X, Heart, Star, Zap } from "lucide-react";
import { authService } from "@/services/api";

type Profile = {
    id: string;
    name: string;
    age: number;
    bio?: string;
    photos: string[];
};

interface SwipeStatus {
    remaining: number;
    daily_remaining: number;
    bonus_swipes: number;
    stars_balance: number;
    can_buy_swipes: boolean;
    swipe_pack_price: number;
    swipe_pack_count: number;
}

export default function DiscoverPage() {
    const router = useRouter();
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showGiftModal, setShowGiftModal] = useState(false);
    const [selectedGiftProfile, setSelectedGiftProfile] = useState<Profile | null>(null);

    // Swipe limit state
    const [swipeStatus, setSwipeStatus] = useState<SwipeStatus | null>(null);
    const [showBuySwipesModal, setShowBuySwipesModal] = useState(false);
    const [showTopUpModal, setShowTopUpModal] = useState(false);

    const fetchSwipeStatus = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("/api_proxy/payments/swipe-status", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSwipeStatus(data);
            }
        } catch (e) {
            console.error("Failed to fetch swipe status", e);
        }
    };

    useEffect(() => {
        authService.getProfiles()
            .then((data) => {
                setProfiles(data);
            })
            .catch(err => console.error("Feed Error", err))
            .finally(() => setLoading(false));

        // Fetch swipe status
        fetchSwipeStatus();
    }, []);

    const handleSwipe = async (direction: "left" | "right") => {
        const profile = profiles[currentIndex];
        if (!profile) return;

        // Check swipe limit before swiping right (like)
        if (direction === "right" && swipeStatus) {
            if (swipeStatus.remaining <= 0) {
                // No swipes left - show buy modal or top-up
                if (swipeStatus.can_buy_swipes) {
                    setShowBuySwipesModal(true);
                } else {
                    setShowTopUpModal(true);
                }
                return;
            }
        }

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
                // Refresh swipe status after successful swipe
                fetchSwipeStatus();
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
                    onGiftClick={() => {
                        setSelectedGiftProfile(currentProfile);
                        setShowGiftModal(true);
                    }}
                    onProfileClick={() => router.push(`/users/${currentProfile.id}`)}
                />
            </div>

            {/* Floating Action Buttons */}
            <div style={{
                position: 'fixed',
                bottom: '90px', // Above nav
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: '20px',
                zIndex: 20,
                alignItems: 'center'
            }}>
                {/* Rewind Button */}
                <button
                    onClick={async () => {
                        if (currentIndex > 0) {
                            try {
                                await authService.rewindLastSwipe();
                                setCurrentIndex(prev => prev - 1);
                            } catch (e) {
                                alert("Cannot rewind further");
                            }
                        }
                    }}
                    style={{
                        width: '42px', height: '42px', borderRadius: '50%',
                        background: 'white',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#F59E0B' // Amber color
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                        <path d="M3 3v5h5" />
                    </svg>
                </button>

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

            {/* Send Gift Modal */}
            {selectedGiftProfile && (
                <SendGiftModal
                    isOpen={showGiftModal}
                    onClose={() => {
                        setShowGiftModal(false);
                        setSelectedGiftProfile(null);
                    }}
                    receiverId={selectedGiftProfile.id}
                    receiverName={selectedGiftProfile.name}
                    receiverPhoto={selectedGiftProfile.photos[0]}
                />
            )}

            {/* Swipe Status Badge */}
            {swipeStatus && (
                <div style={{
                    position: 'fixed',
                    top: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    gap: '12px',
                    zIndex: 30
                }}>
                    {/* Swipes Left */}
                    <div style={{
                        padding: '8px 16px',
                        borderRadius: '20px',
                        background: 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(10px)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <Heart size={16} color={swipeStatus.remaining > 0 ? '#ec4899' : '#ef4444'} fill={swipeStatus.remaining > 0 ? '#ec4899' : 'transparent'} />
                        <span style={{
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: 600
                        }}>
                            {swipeStatus.remaining === -1 ? '∞' : swipeStatus.remaining}
                        </span>
                    </div>

                    {/* Stars Balance */}
                    <button
                        onClick={() => setShowTopUpModal(true)}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '20px',
                            background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 165, 0, 0.2))',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255, 215, 0, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        <Star size={16} color="#FFD700" fill="#FFD700" />
                        <span style={{
                            color: '#FFD700',
                            fontSize: '14px',
                            fontWeight: 600
                        }}>
                            {swipeStatus.stars_balance}
                        </span>
                    </button>
                </div>
            )}

            {/* Buy Swipes Modal */}
            <BuySwipesModal
                isOpen={showBuySwipesModal}
                onClose={() => setShowBuySwipesModal(false)}
                currentBalance={swipeStatus?.stars_balance || 0}
                onSuccess={() => {
                    fetchSwipeStatus();
                    setShowBuySwipesModal(false);
                }}
                mode="swipes"
            />

            {/* Top Up Modal */}
            <TopUpModal
                isOpen={showTopUpModal}
                onClose={() => setShowTopUpModal(false)}
                currentBalance={swipeStatus?.stars_balance || 0}
                onSuccess={(newBalance) => {
                    setSwipeStatus(prev => prev ? { ...prev, stars_balance: newBalance } : null);
                    fetchSwipeStatus();
                }}
            />
        </div>
    );
}
