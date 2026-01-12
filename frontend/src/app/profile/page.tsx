/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import { authService } from "@/services/api";
import { BottomNav } from "@/components/layout/BottomNav";
import { TopUpModal } from "@/components/ui/TopUpModal";
import { Settings, Gift, ChevronRight, Star, Shield, Heart, Crown } from "lucide-react";
import Link from 'next/link';

interface GiftStats {
    total: number;
    unreadCount: number;
}

export default function ProfilePage() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [giftStats, setGiftStats] = useState<GiftStats>({ total: 0, unreadCount: 0 });
    const [showTopUpModal, setShowTopUpModal] = useState(false);

    useEffect(() => {
        authService.getMe()
            .then(data => setUser(data))
            .catch(err => {
                console.error(err);
                // Fallback mock data for local development
                setUser({
                    name: "Demo User",
                    photos: ["https://placehold.co/600x600/png"],
                    bio: "This is a demo profile",
                    interests: ["Music", "Travel"],
                    is_verified: false,
                    subscription_tier: "free"
                });
            })
            .finally(() => setLoading(false));

        // Load gift stats
        authService.getReceivedGifts(1)
            .then(data => setGiftStats({ total: data.total, unreadCount: data.unread_count }))
            .catch(() => setGiftStats({ total: 0, unreadCount: 0 }));
    }, []);

    if (loading || !user) return <div className="container center">Loading...</div>;

    return (
        <div className="container" style={{ paddingBottom: '90px' }}>

            {/* Top Bar */}
            <div style={{
                height: '100dvh',
                background: 'var(--background)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>

                {/* Scrollable Content */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    paddingBottom: '100px', // Space for BottomNav
                    scrollBehavior: 'smooth'
                }}>
                    {/* Hero Image */}
                    <div style={{ position: 'relative', height: '40vh', minHeight: '300px' }}>
                        <img
                            src={user.photos?.[0] || 'https://placehold.co/600x600/png'}
                            alt="Profile"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            width: '100%',
                            height: '150px',
                            background: 'linear-gradient(to top, var(--background), transparent)'
                        }} />

                        <button style={{
                            position: 'absolute',
                            top: '20px',
                            right: '20px',
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            cursor: 'pointer',
                            border: 'none',
                            boxShadow: 'var(--shadow-md)',
                            color: 'var(--foreground)',
                            background: 'var(--surface)'
                        }}>
                            <Link href="/profile/edit">
                                <Settings size={20} />
                            </Link>
                        </button>

                        {/* User Name Overlay */}
                        <div style={{
                            position: 'absolute',
                            bottom: '20px',
                            left: '20px',
                            right: '20px'
                        }}>
                            <h1 style={{
                                margin: 0,
                                fontSize: '28px',
                                fontWeight: 700,
                                color: 'var(--foreground)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                {user.name}
                                {user.is_verified && (
                                    <Shield size={20} style={{ color: '#22c55e' }} />
                                )}
                            </h1>
                            {user.bio && (
                                <p style={{
                                    margin: '8px 0 0',
                                    fontSize: '14px',
                                    color: 'var(--muted)'
                                }}>
                                    {user.bio}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Profile Actions */}
                    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

                        {/* My Gifts Link */}
                        <Link href="/gifts" style={{ textDecoration: 'none' }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '14px',
                                padding: '16px',
                                borderRadius: '16px',
                                background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1), rgba(168, 85, 247, 0.08))',
                                border: '1px solid rgba(236, 72, 153, 0.2)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}>
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '12px',
                                    background: 'linear-gradient(135deg, #ec4899, #a855f7)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Gift size={24} color="white" />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h3 style={{
                                        margin: 0,
                                        fontSize: '16px',
                                        fontWeight: 600,
                                        color: 'var(--foreground)'
                                    }}>
                                        My Gifts
                                    </h3>
                                    <p style={{
                                        margin: '4px 0 0',
                                        fontSize: '13px',
                                        color: 'var(--muted)'
                                    }}>
                                        {giftStats.total > 0
                                            ? `${giftStats.total} gifts received`
                                            : 'View your virtual gifts'}
                                    </p>
                                </div>
                                {giftStats.unreadCount > 0 && (
                                    <div style={{
                                        padding: '4px 10px',
                                        borderRadius: '12px',
                                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                        color: 'white',
                                        fontSize: '12px',
                                        fontWeight: 600
                                    }}>
                                        {giftStats.unreadCount} new
                                    </div>
                                )}
                                <ChevronRight size={20} style={{ color: 'var(--muted)' }} />
                            </div>
                        </Link>

                        {/* Telegram Stars Balance */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '14px',
                            padding: '16px',
                            borderRadius: '16px',
                            background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(255, 165, 0, 0.08))',
                            border: '1px solid rgba(255, 215, 0, 0.3)'
                        }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <Star size={24} color="white" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <h3 style={{
                                    margin: 0,
                                    fontSize: '16px',
                                    fontWeight: 600,
                                    color: 'var(--foreground)'
                                }}>
                                    Telegram Stars
                                </h3>
                                <p style={{
                                    margin: '4px 0 0',
                                    fontSize: '20px',
                                    fontWeight: 700,
                                    color: '#FFD700'
                                }}>
                                    {user.stars_balance || 0} XTR
                                </p>
                            </div>
                            <button
                                onClick={() => setShowTopUpModal(true)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '12px',
                                    background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                                    border: 'none',
                                    color: 'white',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}>
                                Top Up
                            </button>
                        </div>

                        {/* Get Premium Banner (If Free) */}
                        {(!user.subscription_tier || user.subscription_tier === 'free') && (
                            <Link href="/profile/premium" style={{ textDecoration: 'none' }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '14px',
                                    padding: '16px',
                                    borderRadius: '16px',
                                    background: 'linear-gradient(135deg, #1a1a2e 0%, #2d2d44 100%)',
                                    border: '1px solid rgba(255, 215, 0, 0.3)',
                                    marginBottom: '12px',
                                    cursor: 'pointer'
                                }}>
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '12px',
                                        background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <Crown size={24} color="white" />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{
                                            margin: 0,
                                            fontSize: '16px',
                                            fontWeight: 700,
                                            color: 'white'
                                        }}>
                                            Go Premium
                                        </h3>
                                        <p style={{
                                            margin: '4px 0 0',
                                            fontSize: '13px',
                                            color: '#FFD700'
                                        }}>
                                            Unlock exclusive features
                                        </p>
                                    </div>
                                    <ChevronRight size={20} color="rgba(255,255,255,0.5)" />
                                </div>
                            </Link>
                        )}

                        {/* Subscription Status */}
                        {user.subscription_tier && user.subscription_tier !== 'free' && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '14px',
                                padding: '16px',
                                borderRadius: '16px',
                                background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.15), rgba(236, 72, 153, 0.08))',
                                border: '1px solid rgba(147, 51, 234, 0.3)'
                            }}>
                                <Star size={24} style={{ color: '#9333ea' }} />
                                <div style={{ flex: 1 }}>
                                    <h3 style={{
                                        margin: 0,
                                        fontSize: '16px',
                                        fontWeight: 600,
                                        color: 'var(--foreground)',
                                        textTransform: 'capitalize'
                                    }}>
                                        {user.subscription_tier} Member
                                    </h3>
                                    <p style={{
                                        margin: '4px 0 0',
                                        fontSize: '13px',
                                        color: 'var(--muted)'
                                    }}>
                                        Enjoying premium benefits
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Interests */}
                        {user.interests && user.interests.length > 0 && (
                            <div style={{ marginTop: '8px' }}>
                                <h4 style={{
                                    margin: '0 0 12px',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    color: 'var(--muted)'
                                }}>
                                    Interests
                                </h4>
                                <div style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '8px'
                                }}>
                                    {user.interests.map((interest: string, index: number) => (
                                        <span
                                            key={index}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '8px 14px',
                                                borderRadius: '20px',
                                                background: 'var(--surface)',
                                                border: '1px solid var(--border)',
                                                fontSize: '13px',
                                                color: 'var(--foreground)'
                                            }}
                                        >
                                            <Heart size={12} style={{ color: 'var(--primary)' }} />
                                            {interest}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <BottomNav />
                </div>
            </div>

            {/* Top Up Modal */}
            <TopUpModal
                isOpen={showTopUpModal}
                onClose={() => setShowTopUpModal(false)}
                currentBalance={user.stars_balance || 0}
                onSuccess={(newBalance) => {
                    setUser((prev: any) => ({ ...prev, stars_balance: newBalance }));
                }}
            />
        </div>
    );
}

