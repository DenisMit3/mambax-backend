"use client";

import { useState } from "react";
import { BottomNav } from "@/components/layout/BottomNav";
import { Lock, Eye } from "lucide-react";
import Image from "next/image";

export default function LikesPage() {
    const [activeTab, setActiveTab] = useState<'likes' | 'guests'>('likes');

    return (
        <div className="container" style={{ paddingBottom: '90px' }}>

            {/* Header Tabs */}
            <div style={{ padding: '20px 0 10px 0' }}>
                <h1 className="title-gradient" style={{ fontSize: '24px', fontWeight: 800, marginBottom: '20px' }}>Activity</h1>

                <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
                    <button
                        onClick={() => setActiveTab('likes')}
                        style={{
                            flex: 1,
                            padding: '12px',
                            fontWeight: 600,
                            color: activeTab === 'likes' ? 'var(--primary)' : 'var(--text-muted)',
                            borderBottom: activeTab === 'likes' ? '2px solid var(--primary)' : 'none',
                            transition: 'all 0.2s'
                        }}
                    >
                        Likes You (24)
                    </button>
                    <button
                        onClick={() => setActiveTab('guests')}
                        style={{
                            flex: 1,
                            padding: '12px',
                            fontWeight: 600,
                            color: activeTab === 'guests' ? 'var(--primary)' : 'var(--text-muted)',
                            borderBottom: activeTab === 'guests' ? '2px solid var(--primary)' : 'none',
                            transition: 'all 0.2s'
                        }}
                    >
                        Guests (12)
                    </button>
                </div>
            </div>

            {/* Content */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginTop: '20px' }}>
                {activeTab === 'likes' ? (
                    // Likes Content (Blurred logic)
                    Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} style={{
                            position: 'relative',
                            aspectRatio: '3/4',
                            background: 'var(--surface)',
                            borderRadius: 'var(--radius-md)',
                            overflow: 'hidden'
                        }}>
                            {/* Simulated Blurred Image */}
                            <div style={{
                                width: '100%',
                                height: '100%',
                                background: 'url(https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=10&w=200)',
                                backgroundSize: 'cover',
                                filter: 'blur(15px) brightness(0.7)',
                                transform: 'scale(1.2)' // Remove blurred edges
                            }} />

                            {/* Paywall Overlay */}
                            <div style={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}>
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    background: 'rgba(255, 77, 109, 0.2)',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backdropFilter: 'blur(5px)'
                                }}>
                                    <Lock size={20} color="var(--primary)" />
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    // Guests Content (Visible)
                    Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} style={{
                            position: 'relative',
                            aspectRatio: '3/4',
                            background: 'var(--surface)',
                            borderRadius: 'var(--radius-md)',
                            overflow: 'hidden'
                        }}>
                            <img
                                src={`https://images.unsplash.com/photo-${1500000000000 + i * 1000}?q=80&w=400&auto=format&fit=crop`}
                                alt="Guest"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => e.currentTarget.src = "https://ui-avatars.com/api/?name=User"}
                            />
                            <div style={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                padding: '10px',
                                background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)'
                            }}>
                                <div style={{ fontSize: '12px', color: '#ddd' }}>Visited 2h ago</div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Gold Upsell (Only for Likes tab) */}
            {activeTab === 'likes' && (
                <div style={{
                    position: 'fixed',
                    bottom: '100px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '90%',
                    maxWidth: '400px',
                    background: 'rgba(255, 77, 109, 0.9)',
                    backdropFilter: 'blur(10px)',
                    padding: '15px',
                    borderRadius: 'var(--radius-lg)',
                    textAlign: 'center',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                    border: '1px solid rgba(255,255,255,0.2)'
                }}>
                    <div style={{ fontWeight: 700, fontSize: '16px', color: 'white' }}>See who likes you</div>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.9)', marginBottom: '10px' }}>Upgrade to Gold to unlock all 24 admirers</p>
                    <button style={{
                        background: 'white',
                        color: 'var(--primary)',
                        padding: '8px 24px',
                        borderRadius: '20px',
                        fontWeight: 700,
                        fontSize: '14px'
                    }}>
                        Unlock Now
                    </button>
                </div>
            )}

            <BottomNav />
        </div>
    );
}
