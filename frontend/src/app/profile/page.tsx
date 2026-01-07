"use client";

import { useState, useEffect } from "react";
import { authService } from "@/services/api";
import { BottomNav } from "@/components/layout/BottomNav";
import { Settings } from "lucide-react";
import Link from 'next/link';

export default function ProfilePage() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        authService.getMe()
            .then(data => setUser(data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
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
                            color: 'var(--foreground)'
                        }}>
                            <Link href="/profile/edit">
                                <Settings size={20} />
                            </Link>
                        </button>

                    </div>

                    <BottomNav />
                </div>
            </div>
        </div>
    );
}
