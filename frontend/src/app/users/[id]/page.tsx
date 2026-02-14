"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authService, UserProfile } from "@/services/api";
import { SendGiftModal } from "@/components/gifts";
import { ArrowLeft, Gift, MapPin, Briefcase, GraduationCap } from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { CompatibilityScore } from "@/components/profile/CompatibilityScore";
import { FALLBACK_AVATAR } from "@/lib/constants";


export default function UserProfilePage({ params }: { params: { id: string } }) {
    const { id } = params;
    const router = useRouter();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [showGiftModal, setShowGiftModal] = useState(false);

    useEffect(() => {
        authService.getUser(id)
            .then((data) => {
                setUser(data);
            })
            .catch((err) => {
                console.error("Failed to fetch user", err);
            })
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100dvh' }}>
                Загрузка...
            </div>
        );
    }

    if (!user) {
        return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
                <h2>Пользователь не найден</h2>
                <button onClick={() => router.back()} style={{ marginTop: '20px', padding: '10px 20px' }}>
                    Назад
                </button>
            </div>
        );
    }

    return (
        <div style={{ background: 'var(--background)', minHeight: '100dvh', paddingBottom: '80px' }}>
            {/* Header Image */}
            <div style={{ position: 'relative', height: '400px', width: '100%' }}>
                <img
                    src={user.photos[0] || FALLBACK_AVATAR}
                    alt={user.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />

                {/* Back Button */}
                <button
                    onClick={() => router.back()}
                    style={{
                        position: 'absolute', top: '20px', left: '20px',
                        width: '40px', height: '40px', borderRadius: '50%',
                        background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: 'none', color: 'white', cursor: 'pointer'
                    }}
                >
                    <ArrowLeft size={24} />
                </button>
            </div>

            {/* Profile Info */}
            <div style={{
                marginTop: '-40px',
                borderTopLeftRadius: '30px',
                borderTopRightRadius: '30px',
                background: 'var(--background)',
                position: 'relative',
                padding: '24px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                        <h1 style={{ fontSize: '28px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {user.name}, {user.age}
                            {user.is_verified && (
                                <span style={{ background: '#3b82f6', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: 'white' }}>✓</span>
                            )}
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                            {user.city || "Местоположение неизвестно"}
                            {user.gifts_received && user.gifts_received > 0 && (
                                <span style={{
                                    marginLeft: '12px',
                                    color: '#ec4899',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}>
                                    🎁 {user.gifts_received} подарков
                                </span>
                            )}
                        </p>
                    </div>

                    {/* Send Gift Button */}
                    <button
                        onClick={() => setShowGiftModal(true)}
                        style={{
                            width: '50px', height: '50px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, #ec4899, #a855f7)',
                            boxShadow: '0 4px 15px rgba(236, 72, 153, 0.4)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: 'none', cursor: 'pointer',
                            flexShrink: 0
                        }}
                    >
                        <Gift size={24} color="white" />
                    </button>
                </div>

                {/* Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                    {user.work && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)' }}>
                            <Briefcase size={18} />
                            <span>{user.work}</span>
                        </div>
                    )}
                    {user.education && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)' }}>
                            <GraduationCap size={18} />
                            <span>{user.education}</span>
                        </div>
                    )}
                </div>

                {/* Bio */}
                <div style={{ marginBottom: '30px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Обо мне</h3>
                    <p style={{ lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                        {user.bio || "Пока нет описания."}
                    </p>
                </div>

                {/* Compatibility */}
                <div style={{ marginBottom: '24px' }}>
                    <CompatibilityScore userId={id} />
                </div>

                {/* Send Gift Large Button */}
                <button
                    onClick={() => setShowGiftModal(true)}
                    style={{
                        width: '100%',
                        padding: '16px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, #ec4899, #a855f7)',
                        border: 'none',
                        color: 'white',
                        fontSize: '16px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        cursor: 'pointer',
                        boxShadow: '0 8px 20px rgba(236, 72, 153, 0.3)'
                    }}
                >
                    <Gift size={20} />
                    Отправить подарок
                </button>
            </div>

            <BottomNav />

            {/* Gift Modal */}
            <SendGiftModal
                isOpen={showGiftModal}
                onClose={() => setShowGiftModal(false)}
                receiverId={user.id}
                receiverName={user.name}
                receiverPhoto={user.photos[0]}
                onGiftSent={() => {
                    // Maybe show success toast
                }}
            />
        </div>
    );
}
