/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import { authService } from "@/services/api";
import { BottomNav } from "@/components/layout/BottomNav";
import { GiftRevealAnimation } from "@/components/ui/GiftRevealAnimation";
import { Gift, Inbox, Send, Star, Clock, User, EyeOff, ChevronRight } from "lucide-react";
import styles from "./page.module.css";

interface GiftTransaction {
    id: string;
    sender_id: string;
    receiver_id: string;
    gift_id: string;
    price_paid: number;
    currency: string;
    message: string | null;
    status: string;
    is_anonymous: boolean;
    is_read: boolean;
    read_at: string | null;
    created_at: string;
    gift: {
        id: string;
        name: string;
        image_url: string;
        price: number;
        is_premium: boolean;
    } | null;
    sender_name: string | null;
    sender_photo: string | null;
    receiver_name: string | null;
    receiver_photo: string | null;
}

type TabType = "received" | "sent";

export default function GiftsPage() {
    const [activeTab, setActiveTab] = useState<TabType>("received");
    const [receivedGifts, setReceivedGifts] = useState<GiftTransaction[]>([]);
    const [sentGifts, setSentGifts] = useState<GiftTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        receivedTotal: 0,
        unreadCount: 0,
        sentTotal: 0,
        totalSpent: 0
    });
    const [revealGift, setRevealGift] = useState<GiftTransaction | null>(null);

    useEffect(() => {
        loadGifts();
    }, []);

    const loadGifts = async () => {
        try {
            setLoading(true);

            const [receivedData, sentData] = await Promise.all([
                authService.getReceivedGifts(50),
                authService.getSentGifts(50)
            ]);

            setReceivedGifts(receivedData.gifts);
            setSentGifts(sentData.gifts);
            setStats({
                receivedTotal: receivedData.total,
                unreadCount: receivedData.unread_count,
                sentTotal: sentData.total,
                totalSpent: sentData.total_spent
            });
        } catch (error) {
            console.error("Failed to load gifts:", error);
            // Mock data for demo
            setReceivedGifts([
                {
                    id: "1",
                    sender_id: "user1",
                    receiver_id: "me",
                    gift_id: "gift1",
                    price_paid: 10,
                    currency: "XTR",
                    message: "You're amazing! ❤️",
                    status: "completed",
                    is_anonymous: false,
                    is_read: false,
                    read_at: null,
                    created_at: new Date().toISOString(),
                    gift: { id: "gift1", name: "Red Rose", image_url: "/static/gifts/rose.png", price: 10, is_premium: false },
                    sender_name: "Alice",
                    sender_photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100",
                    receiver_name: null,
                    receiver_photo: null
                }
            ]);
            setSentGifts([
                {
                    id: "2",
                    sender_id: "me",
                    receiver_id: "user2",
                    gift_id: "gift2",
                    price_paid: 25,
                    currency: "XTR",
                    message: "Hope this makes you smile!",
                    status: "completed",
                    is_anonymous: false,
                    is_read: true,
                    read_at: new Date().toISOString(),
                    created_at: new Date(Date.now() - 86400000).toISOString(),
                    gift: { id: "gift2", name: "Teddy Bear", image_url: "/static/gifts/teddy.png", price: 25, is_premium: false },
                    sender_name: null,
                    sender_photo: null,
                    receiver_name: "Bob",
                    receiver_photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100"
                }
            ]);
            setStats({ receivedTotal: 1, unreadCount: 1, sentTotal: 1, totalSpent: 25 });
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsRead = async (transactionId: string) => {
        try {
            await authService.markGiftAsRead(transactionId);
            setReceivedGifts(prev =>
                prev.map(g => g.id === transactionId ? { ...g, is_read: true } : g)
            );
            setStats(prev => ({
                ...prev,
                unreadCount: Math.max(0, prev.unreadCount - 1)
            }));
        } catch (error) {
            console.error("Failed to mark gift as read:", error);
        }
    };

    const handleGiftClick = (transaction: GiftTransaction) => {
        if (!transaction.is_read && activeTab === "received") {
            // Show reveal animation for unread gifts
            setRevealGift(transaction);
        }
    };

    const handleRevealClose = () => {
        if (revealGift) {
            handleMarkAsRead(revealGift.id);
            setRevealGift(null);
        }
    };

    const getGiftEmoji = (name: string) => {
        const emojiMap: { [key: string]: string } = {
            "Red Rose": "🌹",
            "Heart Balloon": "🎈",
            "Teddy Bear": "🧸",
            "Diamond Ring": "💍",
            "Party Popper": "🎉",
            "Star": "⭐",
            "Champagne": "🍾",
            "Chocolate Box": "🍫",
        };
        return emojiMap[name] || "🎁";
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return "Today";
        } else if (diffDays === 1) {
            return "Yesterday";
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else {
            return date.toLocaleDateString();
        }
    };

    const currentGifts = activeTab === "received" ? receivedGifts : sentGifts;

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <h1>
                    <Gift size={24} />
                    My Gifts
                </h1>
            </div>

            {/* Stats Cards */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <Inbox size={20} className={styles.statIcon} />
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>{stats.receivedTotal}</span>
                        <span className={styles.statLabel}>Received</span>
                    </div>
                    {stats.unreadCount > 0 && (
                        <span className={styles.badge}>{stats.unreadCount} new</span>
                    )}
                </div>
                <div className={styles.statCard}>
                    <Send size={20} className={styles.statIcon} />
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>{stats.sentTotal}</span>
                        <span className={styles.statLabel}>Sent</span>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <Star size={20} className={styles.statIconGold} />
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>{stats.totalSpent}</span>
                        <span className={styles.statLabel}>Stars Spent</span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${activeTab === "received" ? styles.active : ""}`}
                    onClick={() => setActiveTab("received")}
                >
                    <Inbox size={18} />
                    Received
                    {stats.unreadCount > 0 && (
                        <span className={styles.tabBadge}>{stats.unreadCount}</span>
                    )}
                </button>
                <button
                    className={`${styles.tab} ${activeTab === "sent" ? styles.active : ""}`}
                    onClick={() => setActiveTab("sent")}
                >
                    <Send size={18} />
                    Sent
                </button>
            </div>

            {/* Gift List */}
            <div className={styles.giftList}>
                {loading ? (
                    <div className={styles.loadingState}>
                        <div className={styles.spinner}></div>
                        <p>Loading gifts...</p>
                    </div>
                ) : currentGifts.length === 0 ? (
                    <div className={styles.emptyState}>
                        <Gift size={48} />
                        <h3>No gifts yet</h3>
                        <p>
                            {activeTab === "received"
                                ? "Gifts you receive will appear here"
                                : "Gifts you send will appear here"}
                        </p>
                    </div>
                ) : (
                    currentGifts.map((transaction) => (
                        <div
                            key={transaction.id}
                            className={`${styles.giftCard} ${!transaction.is_read && activeTab === "received" ? styles.unread : ""}`}
                            onClick={() => handleGiftClick(transaction)}
                        >
                            {/* Gift Icon */}
                            <div className={`${styles.giftIcon} ${transaction.gift?.is_premium ? styles.premium : ""}`}>
                                {transaction.gift ? getGiftEmoji(transaction.gift.name) : "🎁"}
                            </div>

                            {/* Content */}
                            <div className={styles.giftContent}>
                                <div className={styles.giftHeader}>
                                    <h4>{transaction.gift?.name || "Gift"}</h4>
                                    <span className={styles.giftPrice}>
                                        <Star size={12} />
                                        {transaction.price_paid}
                                    </span>
                                </div>

                                {/* User Info */}
                                <div className={styles.userInfo}>
                                    {activeTab === "received" ? (
                                        transaction.is_anonymous ? (
                                            <>
                                                <EyeOff size={14} />
                                                <span>From Anonymous</span>
                                            </>
                                        ) : (
                                            <>
                                                {transaction.sender_photo ? (
                                                    <img
                                                        src={transaction.sender_photo}
                                                        alt={transaction.sender_name || "User"}
                                                        className={styles.userAvatar}
                                                    />
                                                ) : (
                                                    <User size={14} />
                                                )}
                                                <span>From {transaction.sender_name || "Someone"}</span>
                                            </>
                                        )
                                    ) : (
                                        <>
                                            {transaction.receiver_photo ? (
                                                <img
                                                    src={transaction.receiver_photo}
                                                    alt={transaction.receiver_name || "User"}
                                                    className={styles.userAvatar}
                                                />
                                            ) : (
                                                <User size={14} />
                                            )}
                                            <span>To {transaction.receiver_name || "Someone"}</span>
                                            {transaction.is_anonymous && (
                                                <span className={styles.anonymousTag}>
                                                    <EyeOff size={10} />
                                                    Anonymous
                                                </span>
                                            )}
                                        </>
                                    )}
                                </div>

                                {/* Message */}
                                {transaction.message && (
                                    <p className={styles.giftMessage}>&ldquo;{transaction.message}&rdquo;</p>
                                )}

                                {/* Time */}
                                <div className={styles.giftTime}>
                                    <Clock size={12} />
                                    {formatDate(transaction.created_at)}
                                </div>
                            </div>

                            {/* Unread indicator */}
                            {!transaction.is_read && activeTab === "received" && (
                                <div className={styles.unreadDot}></div>
                            )}

                            <ChevronRight size={18} className={styles.chevron} />
                        </div>
                    ))
                )}
            </div>

            <BottomNav />

            {/* Gift Reveal Animation */}
            <GiftRevealAnimation
                isOpen={!!revealGift}
                giftName={revealGift?.gift?.name || "Gift"}
                giftImage={revealGift?.gift?.image_url}
                giftEmoji={revealGift?.gift ? getGiftEmoji(revealGift.gift.name) : "🎁"}
                senderName={revealGift?.is_anonymous ? undefined : (revealGift?.sender_name || undefined)}
                message={revealGift?.message || undefined}
                onClose={handleRevealClose}
            />
        </div>
    );
}
