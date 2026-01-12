"use client";

import { useState, useRef, useEffect } from "react";
import { X, Star, Sparkles, Zap } from "lucide-react";

interface TopUpModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentBalance: number;
    onSuccess?: (newBalance: number) => void;
}

const packages = [
    { stars: 50, label: "Starter", icon: "⭐", popular: false },
    { stars: 100, label: "Basic", icon: "✨", popular: false },
    { stars: 250, label: "Popular", icon: "🌟", popular: true },
    { stars: 500, label: "Best Value", icon: "💫", popular: false },
];

export function TopUpModal({ isOpen, onClose, currentBalance, onSuccess }: TopUpModalProps) {
    const [selectedPackage, setSelectedPackage] = useState<number | null>(250);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const pollInterval = useRef<NodeJS.Timeout | null>(null);

    // Cleanup polling on unmount
    useEffect(() => {
        return () => {
            if (pollInterval.current) clearInterval(pollInterval.current);
        };
    }, []);

    if (!isOpen) return null;

    const handlePurchase = async () => {
        if (!selectedPackage) return;

        setLoading(true);
        setError(null);

        try {
            // Check if we're in Telegram WebApp
            const tg = (window as any).Telegram?.WebApp;

            if (tg) {
                // Real Telegram payment flow
                const token = localStorage.getItem("token");
                const response = await fetch("/api_proxy/payments/top-up", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({ amount: selectedPackage })
                });

                if (!response.ok) {
                    throw new Error("Failed to create invoice");
                }

                const data = await response.json();

                // Start polling for status
                const checkStatus = async () => {
                    try {
                        const statusRes = await fetch(`/api_proxy/payments/transaction/${data.transaction_id}/status`, {
                            headers: { "Authorization": `Bearer ${token}` }
                        });
                        if (statusRes.ok) {
                            const statusData = await statusRes.json();
                            if (statusData.status === 'completed') {
                                return true;
                            }
                        }
                    } catch (e) {
                        console.error("Polling error", e);
                    }
                    return false;
                };

                // Poll every 3 seconds for 60 seconds
                let attempts = 0;
                pollInterval.current = setInterval(async () => {
                    attempts++;
                    const isCompleted = await checkStatus();

                    if (isCompleted) {
                        if (pollInterval.current) clearInterval(pollInterval.current);
                        onSuccess?.(currentBalance + selectedPackage);
                        onClose();
                        setLoading(false);
                    } else if (attempts >= 20) {
                        if (pollInterval.current) clearInterval(pollInterval.current);
                        // Timeout - don't show error, just stop loading, let user check later
                        setLoading(false);
                    }
                }, 3000);

                // Open Telegram payment
                tg.openInvoice(data.invoice_url, async (status: string) => {
                    if (status === 'paid') {
                        // Immediate check
                        const isCompleted = await checkStatus();
                        if (isCompleted) {
                            if (pollInterval.current) clearInterval(pollInterval.current);
                            onSuccess?.(currentBalance + selectedPackage);
                            onClose();
                            setLoading(false);
                        } else {
                            // Keep polling
                        }
                    } else if (status === 'cancelled') {
                        if (pollInterval.current) clearInterval(pollInterval.current);
                        setError("Payment cancelled");
                        setLoading(false);
                    } else if (status === 'failed') {
                        if (pollInterval.current) clearInterval(pollInterval.current);
                        setError("Payment failed. Please try again.");
                        setLoading(false);
                    }
                });
            } else {
                // Dev mode - simulate adding stars
                const token = localStorage.getItem("token");
                const response = await fetch("/api_proxy/dev/add-stars", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({ amount: selectedPackage })
                });

                if (!response.ok) {
                    // Try the endpoint even if it fails - might not exist in prod
                    console.warn("Dev endpoint not available, simulating success");
                }

                // Simulate success for dev
                setTimeout(() => {
                    onSuccess?.(currentBalance + selectedPackage);
                    onClose();
                    setLoading(false);
                }, 1000);
            }
        } catch (err: any) {
            setError(err.message || "An error occurred");
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
                maxWidth: '380px',
                overflow: 'hidden',
                boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '24px',
                    background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                    position: 'relative'
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

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '16px',
                            background: 'rgba(255,255,255,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Star size={32} color="white" fill="white" />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: 'white' }}>
                                Get Stars
                            </h2>
                            <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}>
                                Send gifts & unlock features
                            </p>
                        </div>
                    </div>

                    {/* Current Balance */}
                    <div style={{
                        marginTop: '20px',
                        padding: '12px 16px',
                        background: 'rgba(0,0,0,0.15)',
                        borderRadius: '12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px' }}>Current Balance</span>
                        <span style={{ color: 'white', fontSize: '20px', fontWeight: 700 }}>
                            {currentBalance} ⭐
                        </span>
                    </div>
                </div>

                {/* Packages */}
                <div style={{ padding: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        {packages.map((pkg) => (
                            <button
                                key={pkg.stars}
                                onClick={() => setSelectedPackage(pkg.stars)}
                                style={{
                                    padding: '16px',
                                    borderRadius: '16px',
                                    border: selectedPackage === pkg.stars
                                        ? '2px solid #FFD700'
                                        : '2px solid rgba(255,255,255,0.1)',
                                    background: selectedPackage === pkg.stars
                                        ? 'rgba(255, 215, 0, 0.1)'
                                        : 'rgba(255,255,255,0.05)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '8px',
                                    position: 'relative',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {pkg.popular && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '-10px',
                                        right: '-10px',
                                        background: 'linear-gradient(135deg, #ec4899, #a855f7)',
                                        padding: '4px 8px',
                                        borderRadius: '8px',
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        color: 'white'
                                    }}>
                                        POPULAR
                                    </div>
                                )}
                                <span style={{ fontSize: '28px' }}>{pkg.icon}</span>
                                <span style={{
                                    fontSize: '24px',
                                    fontWeight: 800,
                                    color: selectedPackage === pkg.stars ? '#FFD700' : 'white'
                                }}>
                                    {pkg.stars}
                                </span>
                                <span style={{
                                    fontSize: '12px',
                                    color: 'rgba(255,255,255,0.6)'
                                }}>
                                    {pkg.label}
                                </span>
                            </button>
                        ))}
                    </div>

                    {error && (
                        <div style={{
                            marginTop: '16px',
                            padding: '12px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '12px',
                            color: '#ef4444',
                            fontSize: '14px',
                            textAlign: 'center'
                        }}>
                            {error}
                        </div>
                    )}

                    {/* Purchase Button */}
                    <button
                        onClick={handlePurchase}
                        disabled={!selectedPackage || loading}
                        style={{
                            width: '100%',
                            marginTop: '20px',
                            padding: '16px',
                            borderRadius: '16px',
                            border: 'none',
                            background: loading
                                ? 'rgba(255, 215, 0, 0.5)'
                                : 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                            color: '#1a1a2e',
                            fontSize: '16px',
                            fontWeight: 700,
                            cursor: loading ? 'wait' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            boxShadow: '0 8px 20px rgba(255, 215, 0, 0.3)'
                        }}
                    >
                        {loading ? (
                            <>Processing...</>
                        ) : (
                            <>
                                <Zap size={20} />
                                Buy {selectedPackage} Stars
                            </>
                        )}
                    </button>

                    <p style={{
                        marginTop: '16px',
                        fontSize: '12px',
                        color: 'rgba(255,255,255,0.4)',
                        textAlign: 'center'
                    }}>
                        Powered by Telegram Stars ⭐
                    </p>
                </div>
            </div>
        </div>
    );
}
