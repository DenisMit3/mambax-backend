"use client";

import { useState } from "react";
import { X, Zap, Heart, Sparkles, Star } from "lucide-react";

interface BuySwipesModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentBalance: number;
    onSuccess?: () => void;
    mode?: 'swipes' | 'superlike' | 'boost';
}

const PRICING = {
    swipes: { price: 10, count: 10, label: "Swipe Pack", icon: "❤️" },
    superlike: { price: 5, count: 1, label: "Super Like", icon: "⭐" },
    boost: { price: 25, count: 1, label: "1 Hour Boost", icon: "🚀" }
};

export function BuySwipesModal({
    isOpen,
    onClose,
    currentBalance,
    onSuccess,
    mode = 'swipes'
}: BuySwipesModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const item = PRICING[mode];
    const canAfford = currentBalance >= item.price;

    const handlePurchase = async () => {
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem("token");
            const endpoint = mode === 'swipes'
                ? '/api_proxy/payments/buy-swipes'
                : mode === 'superlike'
                    ? '/api_proxy/payments/buy-superlike'
                    : '/api_proxy/payments/activate-boost';

            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: mode === 'boost' ? JSON.stringify({ duration_hours: 1 }) : undefined
            });

            const data = await response.json();

            if (data.success) {
                setSuccess(true);
                setTimeout(() => {
                    onSuccess?.();
                    onClose();
                }, 1500);
            } else {
                setError(data.error === 'insufficient_balance'
                    ? `Not enough Stars. Need ${data.required}, have ${data.available}`
                    : data.error || 'Purchase failed');
            }
        } catch (err: any) {
            setError(err.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
        }}>
            <div style={{
                background: 'linear-gradient(180deg, #1a1a2e 0%, #16162a 100%)',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '340px',
                overflow: 'hidden',
                boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '24px',
                    background: mode === 'swipes'
                        ? 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)'
                        : mode === 'superlike'
                            ? 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)'
                            : 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
                    position: 'relative',
                    textAlign: 'center'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            position: 'absolute',
                            top: '16px',
                            right: '16px',
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'rgba(0,0,0,0.2)',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'white'
                        }}
                    >
                        <X size={18} />
                    </button>

                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>
                        {item.icon}
                    </div>
                    <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'white' }}>
                        {success ? 'Success!' : `Get ${item.label}`}
                    </h2>
                    <p style={{ margin: '8px 0 0', fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}>
                        {success
                            ? mode === 'swipes'
                                ? `+${item.count} swipes added!`
                                : mode === 'superlike'
                                    ? 'Super Like ready to use!'
                                    : 'Your profile is now boosted!'
                            : mode === 'swipes'
                                ? 'Keep swiping with extra swipes'
                                : mode === 'superlike'
                                    ? 'Stand out with a Super Like'
                                    : 'Get more visibility for 1 hour'
                        }
                    </p>
                </div>

                {/* Content */}
                <div style={{ padding: '24px' }}>
                    {!success && (
                        <>
                            {/* Price Card */}
                            <div style={{
                                padding: '20px',
                                borderRadius: '16px',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '16px'
                            }}>
                                <div>
                                    <div style={{
                                        fontSize: '16px',
                                        fontWeight: 600,
                                        color: 'white',
                                        marginBottom: '4px'
                                    }}>
                                        {mode === 'swipes' ? `${item.count} Swipes` : item.label}
                                    </div>
                                    <div style={{
                                        fontSize: '13px',
                                        color: 'rgba(255,255,255,0.5)'
                                    }}>
                                        {mode === 'swipes' && 'Extra swipes for today'}
                                        {mode === 'superlike' && 'Make a lasting impression'}
                                        {mode === 'boost' && 'Higher visibility in feed'}
                                    </div>
                                </div>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '24px',
                                    fontWeight: 800,
                                    color: '#FFD700'
                                }}>
                                    {item.price}
                                    <Star size={20} fill="#FFD700" color="#FFD700" />
                                </div>
                            </div>

                            {/* Balance */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '20px',
                                fontSize: '14px'
                            }}>
                                <span style={{ color: 'rgba(255,255,255,0.6)' }}>Your Balance</span>
                                <span style={{
                                    color: canAfford ? '#FFD700' : '#ef4444',
                                    fontWeight: 600
                                }}>
                                    {currentBalance} ⭐
                                </span>
                            </div>

                            {error && (
                                <div style={{
                                    padding: '12px',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    borderRadius: '12px',
                                    color: '#ef4444',
                                    fontSize: '14px',
                                    textAlign: 'center',
                                    marginBottom: '16px'
                                }}>
                                    {error}
                                </div>
                            )}

                            {/* Purchase Button */}
                            <button
                                onClick={handlePurchase}
                                disabled={!canAfford || loading}
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    borderRadius: '16px',
                                    border: 'none',
                                    background: canAfford
                                        ? mode === 'swipes'
                                            ? 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)'
                                            : mode === 'superlike'
                                                ? 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)'
                                                : 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)'
                                        : 'rgba(255,255,255,0.1)',
                                    color: canAfford ? 'white' : 'rgba(255,255,255,0.4)',
                                    fontSize: '16px',
                                    fontWeight: 700,
                                    cursor: canAfford && !loading ? 'pointer' : 'not-allowed',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    boxShadow: canAfford ? '0 8px 20px rgba(236, 72, 153, 0.3)' : 'none'
                                }}
                            >
                                {loading ? (
                                    <>Processing...</>
                                ) : canAfford ? (
                                    <>
                                        <Zap size={20} />
                                        Buy Now
                                    </>
                                ) : (
                                    <>Not Enough Stars</>
                                )}
                            </button>

                            {!canAfford && (
                                <p style={{
                                    marginTop: '12px',
                                    fontSize: '13px',
                                    color: 'rgba(255,255,255,0.4)',
                                    textAlign: 'center'
                                }}>
                                    Top up your Stars balance to continue
                                </p>
                            )}
                        </>
                    )}

                    {success && (
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <Sparkles size={48} color="#22c55e" style={{ marginBottom: '16px' }} />
                            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>
                                {mode === 'swipes' && 'Happy swiping! 💕'}
                                {mode === 'superlike' && 'Use it wisely! 💙'}
                                {mode === 'boost' && 'You\'re on fire! 🔥'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
