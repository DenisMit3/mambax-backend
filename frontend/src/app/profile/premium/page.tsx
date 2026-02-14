"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authService, UserProfile } from "@/services/api";
import { TopUpModal } from "@/components/ui/TopUpModal";
import { ArrowLeft, Star, Check, Zap, Crown, Shield } from "lucide-react";
import Link from "next/link";
import { Toast } from '@/components/ui/Toast';
import { useRequireAuth } from "@/hooks/useRequireAuth";

export default function PremiumPage() {
    const router = useRouter();
    const { isAuthed, isChecking } = useRequireAuth();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);
    const [showTopUp, setShowTopUp] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [toast, setToast] = useState<{message: string; type: 'success' | 'error'} | null>(null);

    const fetchUser = (cancelled?: { current: boolean }) => {
        authService.getMe()
            .then(data => { if (!cancelled?.current) setUser(data); })
            .catch(err => { if (!cancelled?.current) console.error("Failed to load user", err); })
            .finally(() => { if (!cancelled?.current) setLoading(false); });
    };

    useEffect(() => {
        if (!isAuthed) return;
        const cancelled = { current: false };
        fetchUser(cancelled);
        return () => { cancelled.current = true; };
    }, [isAuthed]);

    const handleUpgrade = async (tier: string) => {
        if (user?.subscription_tier === tier) return;

        setProcessing(tier);
        setError(null);
        try {
            await authService.buySubscription(tier);
            fetchUser();
            const tierNames: Record<string, string> = { gold: 'Gold', platinum: 'Platinum' };
            setToast({message: `Поздравляем! Вы теперь ${tierNames[tier] || tier} участник 🎉`, type: 'success'});
        } catch (e: unknown) {
            const err = e as { data?: { error?: string }; message?: string };
            console.error("Upgrade error", e);
            if (err.data?.error === 'insufficient_balance') {
                setShowTopUp(true);
            } else {
                setError(err.message || "Не удалось оформить подписку");
            }
        } finally {
            setProcessing(null);
        }
    };

    if (loading || isChecking) {
        return (
            <div style={{
                minHeight: '100vh',
                background: '#0f0f13',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                Загрузка...
            </div>
        );
    }

    const currentTier = user?.subscription_tier || 'free';

    return (
        <div style={{ minHeight: '100vh', background: '#0f0f13', color: 'white', paddingBottom: '40px' }}>
            {/* Header */}
            <div style={{
                padding: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                position: 'sticky',
                top: 0,
                background: 'rgba(15, 15, 19, 0.9)',
                backdropFilter: 'blur(10px)',
                zIndex: 10
            }}>
                <button
                    onClick={() => router.back()}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                        padding: 0
                    }}
                >
                    <ArrowLeft size={24} />
                </button>
                <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Премиум подписка</h1>
            </div>

            <div className="container" style={{ padding: '0 20px' }}>

                {/* Balance Card */}
                <div style={{
                    background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 165, 0, 0.05))',
                    borderRadius: '20px',
                    padding: '20px',
                    border: '1px solid rgba(255, 215, 0, 0.2)',
                    marginBottom: '30px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div>
                        <p style={{ margin: '0 0 4px', fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>Ваш баланс</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Star size={24} fill="#FFD700" color="#FFD700" />
                            <span style={{ fontSize: '24px', fontWeight: 800, color: 'white' }}>
                                {user?.stars_balance || 0}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowTopUp(true)}
                        style={{
                            background: '#FFD700',
                            color: 'black',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '12px',
                            fontWeight: 700,
                            cursor: 'pointer'
                        }}
                    >
                        Пополнить
                    </button>
                </div>

                {error && (
                    <div style={{
                        padding: '12px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '12px',
                        color: '#ef4444',
                        marginBottom: '20px',
                        fontSize: '14px'
                    }}>
                        {error}
                    </div>
                )}

                {/* Plans */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* Gold Plan */}
                    <div style={{
                        background: 'linear-gradient(180deg, #1A1A24 0%, #15151D 100%)',
                        borderRadius: '24px',
                        padding: '24px',
                        border: currentTier === 'gold' ? '2px solid #FFD700' : '1px solid rgba(255,255,255,0.1)',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        <div style={{ position: 'absolute', top: 0, right: 0, padding: '20px', opacity: 0.1 }}>
                            <Zap size={100} />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div style={{
                                padding: '12px',
                                background: 'rgba(255, 215, 0, 0.1)',
                                borderRadius: '16px',
                                color: '#FFD700'
                            }}>
                                <Zap size={24} fill="#FFD700" />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Gold</h3>
                                <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>Новый уровень</p>
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <span style={{ fontSize: '32px', fontWeight: 800 }}>500</span>
                            <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.5)', marginLeft: '4px' }}>звёзд / мес</span>
                        </div>

                        <ul style={{ padding: 0, margin: '0 0 24px', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {[
                                'Безлимитные свайпы',
                                '5 Суперлайков / день',
                                'Двойной XP за матч'
                            ].map((feat, i) => (
                                <li key={feat} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
                                    <Check size={16} color="#FFD700" />
                                    {feat}
                                </li>
                            ))}
                        </ul>

                        <button
                            onClick={() => handleUpgrade('gold')}
                            disabled={currentTier === 'gold' || processing === 'gold'}
                            style={{
                                width: '100%',
                                padding: '16px',
                                borderRadius: '16px',
                                border: 'none',
                                background: currentTier === 'gold' ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #FFD700, #FFA500)',
                                color: currentTier === 'gold' ? 'rgba(255,255,255,0.5)' : 'black',
                                fontWeight: 700,
                                cursor: currentTier === 'gold' ? 'default' : 'pointer',
                                opacity: processing && processing !== 'gold' ? 0.5 : 1
                            }}
                        >
                            {processing === 'gold' ? 'Обработка...' : currentTier === 'gold' ? 'Текущий план' : 'Перейти на Gold'}
                        </button>
                    </div>

                    {/* Platinum Plan */}
                    <div style={{
                        background: 'linear-gradient(180deg, #1A1A24 0%, #15151D 100%)',
                        borderRadius: '24px',
                        padding: '24px',
                        border: currentTier === 'platinum' ? '2px solid #a855f7' : '1px solid rgba(255,255,255,0.1)',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        <div style={{ position: 'absolute', top: 0, right: 0, padding: '20px', opacity: 0.1 }}>
                            <Crown size={100} />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div style={{
                                padding: '12px',
                                background: 'rgba(168, 85, 247, 0.1)',
                                borderRadius: '16px',
                                color: '#a855f7'
                            }}>
                                <Crown size={24} fill="#a855f7" />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Platinum</h3>
                                <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>Максимум VIP</p>
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <span style={{ fontSize: '32px', fontWeight: 800 }}>1000</span>
                            <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.5)', marginLeft: '4px' }}>звёзд / мес</span>
                        </div>

                        <ul style={{ padding: 0, margin: '0 0 24px', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {[
                                'Всё из Gold',
                                'Кто вас лайкнул',
                                'Приоритетное размещение',
                                'Режим инкогнито'
                            ].map((feat, i) => (
                                <li key={feat} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
                                    <Check size={16} color="#a855f7" />
                                    {feat}
                                </li>
                            ))}
                        </ul>

                        <button
                            onClick={() => handleUpgrade('platinum')}
                            disabled={currentTier === 'platinum' || processing === 'platinum'}
                            style={{
                                width: '100%',
                                padding: '16px',
                                borderRadius: '16px',
                                border: 'none',
                                background: currentTier === 'platinum' ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #d946ef, #a855f7)',
                                color: currentTier === 'platinum' ? 'rgba(255,255,255,0.5)' : 'white',
                                fontWeight: 700,
                                cursor: currentTier === 'platinum' ? 'default' : 'pointer',
                                opacity: processing && processing !== 'platinum' ? 0.5 : 1
                            }}
                        >
                            {processing === 'platinum' ? 'Обработка...' : currentTier === 'platinum' ? 'Текущий план' : 'Перейти на Platinum'}
                        </button>
                    </div>

                </div>
            </div>

            <TopUpModal
                isOpen={showTopUp}
                onClose={() => setShowTopUp(false)}
                currentBalance={user?.stars_balance || 0}
                onSuccess={() => {
                    fetchUser();
                }}
            />

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <style jsx>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateX(-50%) translateY(20px); }
                    to { opacity: 1; transform: translateX(-50%) translateY(0); }
                }
            `}</style>
        </div>
    );
}
