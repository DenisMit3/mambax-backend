"use client";

import { BottomNav } from "@/components/layout/BottomNav";
import { Search, MoreVertical } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { authService } from "@/services/api";

// Mock Data Removed


export default function ChatListPage() {
    const [matches, setMatches] = useState([]);

    useEffect(() => {
        authService.getMatches()
            .then(data => setMatches(data))
            .catch(err => console.error("Matches error", err));
    }, []);

    return (
        <div className="container" style={{
            height: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            paddingBottom: '0'
        }}>
            {/* Header */}
            <div style={{ padding: '20px 0 10px 0', flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h1 className="title-gradient" style={{ fontSize: '28px', fontWeight: 800 }}>Chats</h1>
                    <MoreVertical color="white" />
                </div>

                {/* Search */}
                <div style={{
                    background: 'var(--surface)',
                    borderRadius: '16px',
                    padding: '12px 15px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    border: '1px solid var(--border)'
                }}>
                    <Search size={20} color="var(--text-muted)" />
                    <input
                        type="text"
                        placeholder="Search..."
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'white',
                            fontSize: '16px',
                            flex: 1,
                            outline: 'none'
                        }}
                    />
                </div>
            </div>

            {/* Scrollable Content */}
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>

                {/* Matches Reel */}
                <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--primary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Matches <span style={{ background: 'var(--primary)', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '10px' }}>{matches.length}</span>
                    </h3>
                    <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '10px' }}>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {matches.map((m: any) => (
                            <Link href={`/chat/${m.id}`} key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '70px', textDecoration: 'none', color: 'white' }}>
                                <div style={{ position: 'relative', width: '64px', height: '64px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--primary)' }}>
                                    <img
                                        src={m.user.photos?.[0] || "https://placehold.co/400x400/png"}
                                        alt={m.user.name}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                </div>
                                <span style={{ fontSize: '12px', marginTop: '6px', fontWeight: 500 }}>{m.user.name}</span>
                            </Link>
                        ))}
                        {matches.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No matches yet.</p>}
                    </div>
                </div>

                {/* Chat List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {matches.map((m: any) => (
                        <Link href={`/chat/${m.id}`} key={m.id} style={{
                            display: 'flex',
                            gap: '15px',
                            padding: '12px 10px',
                            borderRadius: 'var(--radius-md)',
                            transition: 'background 0.2s',
                            alignItems: 'center'
                        }}>
                            {/* Avatar */}
                            <div style={{ position: 'relative', width: '56px', height: '56px', flexShrink: 0 }}>
                                <img
                                    src={m.user.photos?.[0] || "https://placehold.co/400x400/png"}
                                    alt={m.user.name}
                                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', background: '#333' }}
                                />
                            </div>

                            {/* Content */}
                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ fontWeight: 600, fontSize: '16px' }}>{m.user.name}</span>
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{m.last_message ? 'Just now' : 'New Match'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <p style={{
                                        color: 'var(--text-secondary)',
                                        fontSize: '14px',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>
                                        {m.last_message || "Start the conversation! 👋"}
                                    </p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            <BottomNav />
        </div>
    );
}
