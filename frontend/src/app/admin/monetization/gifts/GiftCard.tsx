/* eslint-disable @next/next/no-img-element */
"use client";

import { Pencil, Trash2, Crown, Sparkles } from "lucide-react";
import styles from "../../admin.module.css";
import { VirtualGift } from "@/services/admin";
import { FALLBACK_AVATAR } from "@/lib/constants";

interface GiftCardProps {
    gift: VirtualGift;
    onEdit: (gift: VirtualGift) => void;
    onDelete: (giftId: string) => void;
}

export function GiftCard({ gift, onEdit, onDelete }: GiftCardProps) {
    return (
        <div className={`${styles.card} ${!gift.is_active ? styles.inactive : ""}`}>
            <div className={styles.cardHeader}>
                <div className={styles.giftImageContainer}>
                    {gift.image_url ? (
                        <img
                            src={gift.image_url.startsWith("http") ? gift.image_url : `/api_proxy${gift.image_url}`}
                            alt={gift.name}
                            className={styles.giftImage}
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = FALLBACK_AVATAR;
                            }}
                        />
                    ) : (
                        <div className={styles.giftPlaceholder}>🎁</div>
                    )}
                    {gift.is_premium && (
                        <span className={styles.premiumBadge}><Crown size={12} /></span>
                    )}
                    {gift.is_animated && (
                        <span className={styles.animatedBadge}><Sparkles size={12} /></span>
                    )}
                </div>
                <div className={styles.cardActions}>
                    <button className={styles.iconButton} onClick={() => onEdit(gift)} title="Edit">
                        <Pencil size={16} />
                    </button>
                    <button className={`${styles.iconButton} ${styles.danger}`} onClick={() => onDelete(gift.id)} title="Delete">
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
            <div className={styles.cardBody}>
                <h3 className={styles.giftName}>{gift.name}</h3>
                <p className={styles.giftDescription}>{gift.description}</p>
                <div className={styles.giftMeta}>
                    <span className={styles.giftPrice}>⭐ {gift.price} {gift.currency}</span>
                    <span className={styles.giftSent}>{gift.times_sent} sent</span>
                </div>
            </div>
        </div>
    );
}
