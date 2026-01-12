/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import { authService } from "@/services/api";
import { SendGiftModal } from "@/components/gifts";
import { ArrowLeft, Gift, Heart, MessageCircle, Shield, MapPin } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface UserProfile {
    id: string;
    name: string;
    age?: number;
    bio?: string;
    photos: string[];
    interests?: string[];
    is_verified?: boolean;
    location_city?: string;
}

export default function UserProfilePage({ params }: { params: { id: string } }) {
    const { id: userId } = params;
    const router = useRouter();

    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showGiftModal, setShowGiftModal] = useState(false);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

    useEffect(() => {
        const loadUser = async () => {
            try {
                const data = await authService.getUser(userId);
                setUser(data);
            } catch (err) {
                console.error("Failed to load user:", err);
                setError("User not found");
            } finally {
                setLoading(false);
            }
        };

        loadUser();
    }, [userId]);

    if (loading) {
        return (
            <div style={{
                height: '100dvh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--background)'
            }}>
                <div style={{
                    width: '48px',
                    height: '48px',
                    border: '3px solid rgba(236, 72, 153, 0.2)',
                    borderTopColor: '#ec4899',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }} />
                <style jsx>{`
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    if (error || !user) {
        return (
            <div style={{
                height: '100dvh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--background)',
                gap: '16px',
                padding: '20px'
            }}>
                <h2 style={{ fontSize: '24px', fontWeight: 700 }}>{error || "User not found"}</h2>
                <button
                    onClick={() => router.back()}
                    style={{
                        padding: '12px 24px',
                        borderRadius: '12px',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        fontSize: '16px',
                        cursor: 'pointer'
                    }}
                >
                    Go Back
                </button>
            </div>
        );
    }

    const photos = user.photos?.length > 0 ? user.photos : ['https://placehold.co/600x800/1a1a1a/white?text=No+Photo'];

    return (
        <div style={{
            height: '100dvh',
            background: 'var(--background)',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Header */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 20,
                padding: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: 'calc(16px + env(safe-area-inset-top))'
            }}>
                <button
                    onClick={() => router.back()}
                    style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'rgba(0, 0, 0, 0.4)',
                        backdropFilter: 'blur(10px)',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                    }}
                >
                    <ArrowLeft size={24} color="white" />
                </button>

                {/* Gift Button in Header */}
                <button
                    onClick={() => setShowGiftModal(true)}
                    style={{
                        padding: '10px 16px',
                        borderRadius: '24px',
                        background: 'linear-gradient(135deg, #ec4899, #a855f7)',
                        boxShadow: '0 4px 12px rgba(236, 72, 153, 0.4)',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer'
                    }}
                >
                    <Gift size={18} color="white" />
                    <span style={{ color: 'white', fontSize: '14px', fontWeight: 600 }}>Send Gift</span>
                </button>
            </div>

            {/* Main Photo */}
            <div style={{
                position: 'relative',
                height: '65vh',
                minHeight: '400px',
                overflow: 'hidden'
            }}>
                <img
                    src={photos[currentPhotoIndex]}
                    alt={user.name}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                    }}
                />

                {/* Photo Navigation Dots */}
                {photos.length > 1 && (
                    <div style={{
                        position: 'absolute',
                        top: '70px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        gap: '6px'
                    }}>
                        {photos.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentPhotoIndex(idx)}
                                style={{
                                    width: idx === currentPhotoIndex ? '24px' : '8px',
                                    height: '8px',
                                    borderRadius: '4px',
                                    background: idx === currentPhotoIndex ? 'white' : 'rgba(255, 255, 255, 0.5)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease'
                                }}
                            />
                        ))}
                    </div>
                )}

                {/* Gradient Overlay */}
                <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '200px',
                    background: 'linear-gradient(to top, var(--background) 0%, transparent 100%)'
                }} />
            </div>

            {/* Profile Info */}
            <div style={{
                flex: 1,
                padding: '0 20px 100px',
                marginTop: '-60px',
                position: 'relative',
                zIndex: 10,
                overflowY: 'auto'
            }}>
                {/* Name & Age */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '8px'
                }}>
                    <h1 style={{
                        fontSize: '32px',
                        fontWeight: 800,
                        margin: 0,
                        color: 'var(--foreground)'
                    }}>
                        {user.name}{user.age && `, ${user.age}`}
                    </h1>
                    {user.is_verified && (
                        <Shield size={24} style={{ color: '#22c55e' }} />
                    )}
                </div>

                {/* Location */}
                {user.location_city && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: 'var(--muted)',
                        fontSize: '14px',
                        marginBottom: '16px'
                    }}>
                        <MapPin size={16} />
                        <span>{user.location_city}</span>
                    </div>
                )}

                {/* Bio */}
                {user.bio && (
                    <p style={{
                        fontSize: '16px',
                        lineHeight: '1.6',
                        color: 'var(--foreground)',
                        marginBottom: '20px',
                        opacity: 0.9
                    }}>
                        {user.bio}
                    </p>
                )}

                {/* Interests */}
                {user.interests && user.interests.length > 0 && (
                    <div style={{ marginTop: '20px' }}>
                        <h4 style={{
                            margin: '0 0 12px',
                            fontSize: '14px',
                            fontWeight: 600,
                            color: 'var(--muted)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}>
                            Interests
                        </h4>
                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '8px'
                        }}>
                            {user.interests.map((interest, index) => (
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

            {/* Fixed Bottom Action Bar */}
            <div style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '16px 20px',
                paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
                background: 'linear-gradient(to top, var(--background), var(--background) 80%, transparent)',
                display: 'flex',
                gap: '12px',
                zIndex: 30
            }}>
                <button
                    onClick={() => setShowGiftModal(true)}
                    style={{
                        flex: 1,
                        padding: '16px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, #ec4899, #a855f7)',
                        boxShadow: '0 4px 20px rgba(236, 72, 153, 0.3)',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        cursor: 'pointer'
                    }}
                >
                    <Gift size={22} color="white" />
                    <span style={{
                        color: 'white',
                        fontSize: '16px',
                        fontWeight: 700
                    }}>Send Gift</span>
                </button>

                <Link href={`/chat`} style={{ textDecoration: 'none' }}>
                    <button
                        style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '16px',
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                        }}
                    >
                        <MessageCircle size={24} style={{ color: 'var(--foreground)' }} />
                    </button>
                </Link>
            </div>

            {/* Send Gift Modal */}
            <SendGiftModal
                isOpen={showGiftModal}
                onClose={() => setShowGiftModal(false)}
                receiverId={userId}
                receiverName={user.name}
                receiverPhoto={photos[0]}
            />
        </div>
    );
}
