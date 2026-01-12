"use client";

import { useEffect, useState } from "react";
import { Gift, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface GiftNotificationProps {
    data: {
        gift_name: string;
        sender_name: string;
        image_url?: string;
        gift_image?: string;
        message?: string;
        bonus_received?: number;
    } | null;
    onClose: () => void;
}

export function GiftNotification({ data, onClose }: GiftNotificationProps) {
    const router = useRouter();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (data) {
            setVisible(true);
            const timer = setTimeout(() => {
                setVisible(false);
                setTimeout(onClose, 300); // Wait for exit animation
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [data, onClose]);

    if (!data && !visible) return null;

    return (
        <div
            onClick={() => router.push("/gifts")}
            style={{
                position: 'fixed',
                top: '20px',
                left: '50%',
                transform: `translateX(-50%) translateY(${visible ? '0' : '-100px'})`,
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                padding: '12px 20px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                minWidth: '300px',
                maxWidth: '90%',
                transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                cursor: 'pointer',
                border: '1px solid rgba(236, 72, 153, 0.2)'
            }}
        >
            <div style={{
                width: '40px', height: '40px', borderRadius: '50%',
                background: '#fce7f3', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px'
            }}>
                {data?.gift_image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={data.gift_image} alt="Gift" style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                ) : "🎁"}
            </div>

            <div style={{ flex: 1 }}>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1f2937' }}>
                    Gift Received!
                    {data?.bonus_received && data.bonus_received > 0 && (
                        <span style={{ color: '#10b981', fontWeight: 600, marginLeft: '8px', fontSize: '12px' }}>
                            +{data.bonus_received} ⭐
                        </span>
                    )}
                </h4>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6b7280' }}>
                    <strong>{data?.sender_name}</strong> sent you a {data?.gift_name}
                </p>
            </div>

            <button
                onClick={(e) => { e.stopPropagation(); setVisible(false); setTimeout(onClose, 300); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '4px' }}
            >
                <X size={16} />
            </button>
        </div>
    );
}
