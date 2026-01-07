"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Map, Heart, MessageCircle, User } from "lucide-react";
import clsx from "clsx";

export function BottomNav() {
    const pathname = usePathname();

    const navItems = [
        { href: "/discover", icon: Flame, label: "Discover" },
        { href: "/map", icon: Map, label: "Map" },
        { href: "/likes", icon: Heart, label: "Likes" },
        { href: "/chat", icon: MessageCircle, label: "Chat" },
        { href: "/profile", icon: User, label: "Profile" },
    ];

    return (
        <nav style={{
            position: 'fixed',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'calc(100% - 40px)',
            maxWidth: '440px',
            background: 'var(--glass)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid var(--glass-border)',
            borderRadius: '24px',
            padding: '12px 10px',
            zIndex: 100,
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            boxShadow: 'var(--shadow-md)'
        }}>
            {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                            color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                            transition: 'all 0.3s ease',
                            flex: 1,
                            position: 'relative'
                        }}
                    >
                        <div style={{
                            padding: '8px',
                            background: isActive ? 'rgba(255, 77, 109, 0.15)' : 'transparent',
                            borderRadius: '16px',
                            transition: 'background 0.3s'
                        }}>
                            <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                        </div>
                        <span style={{ fontSize: '10px', fontWeight: 500 }}>{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
