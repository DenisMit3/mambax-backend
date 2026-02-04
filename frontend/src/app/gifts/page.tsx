/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import { authService } from "@/services/api";
import { BottomNav } from "@/components/layout/BottomNav";
import { GiftRevealAnimation } from "@/components/ui/GiftRevealAnimation";
import { Gift, Inbox, Send, Star, Clock, User, EyeOff, ChevronRight, ShoppingBag } from "lucide-react";
import dynamic from 'next/dynamic';

const GiftCatalog = dynamic(() => import('@/components/gifts/GiftCatalog').then(mod => mod.GiftCatalog), {
    loading: () => (
        <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
            <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin"></div>
            <p className="mt-2 text-sm">Loading catalog...</p>
        </div>
    )
});

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

type TabType = "received" | "sent" | "shop";

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
                unreadCount: receivedData.unread_count || 0,
                sentTotal: sentData.total,
                totalSpent: sentData.total_spent || 0
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
        <div className="min-h-[100dvh] bg-background pb-[100px]">
            {/* Header */}
            <div className="p-5 bg-gradient-to-br from-primary/15 to-accent/8 border-b border-border">
                <h1 className="flex items-center gap-2.5 m-0 text-2xl font-bold text-foreground">
                    <Gift size={24} className="text-primary" />
                    My Gifts
                </h1>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-3 p-4 px-5">
                <div className="flex flex-col items-center gap-2 p-4 px-3 rounded-2xl bg-surface border border-border relative">
                    <Inbox size={20} className="text-primary" />
                    <div className="flex flex-col items-center">
                        <span className="text-[22px] font-bold text-foreground">{stats.receivedTotal}</span>
                        <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Received</span>
                    </div>
                    {stats.unreadCount > 0 && (
                        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-gradient-to-br from-primary-red to-primary-orange text-white text-[10px] font-semibold">{stats.unreadCount} new</span>
                    )}
                </div>
                <div className="flex flex-col items-center gap-2 p-4 px-3 rounded-2xl bg-surface border border-border relative">
                    <Send size={20} className="text-primary" />
                    <div className="flex flex-col items-center">
                        <span className="text-[22px] font-bold text-foreground">{stats.sentTotal}</span>
                        <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Sent</span>
                    </div>
                </div>
                <div className="flex flex-col items-center gap-2 p-4 px-3 rounded-2xl bg-surface border border-border relative">
                    <Star size={20} className="text-neon-yellow" />
                    <div className="flex flex-col items-center">
                        <span className="text-[22px] font-bold text-foreground">{stats.totalSpent}</span>
                        <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Stars Spent</span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex px-5 gap-2 border-b border-border">
                <button
                    className={`flex-1 flex items-center justify-center gap-2 p-3.5 border-none bg-transparent text-sm font-medium cursor-pointer relative transition-all ${activeTab === "shop" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
                    onClick={() => setActiveTab("shop")}
                >
                    <ShoppingBag size={18} />
                    Shop
                </button>
                <button
                    className={`flex-1 flex items-center justify-center gap-2 p-3.5 border-none bg-transparent text-sm font-medium cursor-pointer relative transition-all ${activeTab === "received" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
                    onClick={() => setActiveTab("received")}
                >
                    <Inbox size={18} />
                    Received
                    {stats.unreadCount > 0 && (
                        <span className="px-2 py-0.5 rounded-lg bg-gradient-to-br from-primary-red to-primary-orange text-white text-[11px] font-semibold">{stats.unreadCount}</span>
                    )}
                </button>
                <button
                    className={`flex-1 flex items-center justify-center gap-2 p-3.5 border-none bg-transparent text-sm font-medium cursor-pointer relative transition-all ${activeTab === "sent" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
                    onClick={() => setActiveTab("sent")}
                >
                    <Send size={18} />
                    Sent
                </button>
            </div>

            {/* Content */}
            {activeTab === "shop" ? (
                <div className="bg-background">
                    <GiftCatalog showSendButton={false} />
                </div>
            ) : (
                /* Gift List */
                <div className="p-4 px-5 flex flex-col gap-3">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center gap-4 p-12 text-muted-foreground">
                            <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin"></div>
                            <p>Loading gifts...</p>
                        </div>
                    ) : currentGifts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-12 px-5 text-muted-foreground text-center">
                            <Gift size={48} className="opacity-40" />
                            <h3 className="m-0 text-lg text-foreground">No gifts yet</h3>
                            <p className="m-0 text-sm">
                                {activeTab === "received"
                                    ? "Gifts you receive will appear here"
                                    : "Gifts you send will appear here"}
                            </p>
                        </div>
                    ) : (
                        currentGifts.map((transaction) => (
                            <div
                                key={transaction.id}
                                className={`flex items-center gap-3.5 p-4 rounded-2xl bg-surface border border-border cursor-pointer transition-all hover:translate-x-1 hover:border-primary relative ${!transaction.is_read && activeTab === "received" ? "bg-gradient-to-br from-primary/8 to-accent/4 border-primary/30" : ""}`}
                                onClick={() => handleGiftClick(transaction)}
                            >
                                {/* Gift Icon */}
                                <div className={`w-14 h-14 rounded-xl bg-background flex items-center justify-center text-[32px] shrink-0 ${transaction.gift?.is_premium ? "bg-gradient-to-br from-neon-yellow/20 to-neon-orange/10 shadow-[0_0_12px_rgba(234,179,8,0.3)]" : ""}`}>
                                    {transaction.gift ? getGiftEmoji(transaction.gift.name) : "🎁"}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <h4 className="m-0 text-base font-semibold text-foreground">{transaction.gift?.name || "Gift"}</h4>
                                        <span className="flex items-center gap-1 text-[13px] font-semibold text-primary">
                                            <Star size={12} className="text-neon-yellow" />
                                            {transaction.price_paid}
                                        </span>
                                    </div>

                                    {/* User Info */}
                                    <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground mb-1.5">
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
                                                            className="w-[18px] h-[18px] rounded-full object-cover"
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
                                                        className="w-[18px] h-[18px] rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <User size={14} />
                                                )}
                                                <span>To {transaction.receiver_name || "Someone"}</span>
                                                {transaction.is_anonymous && (
                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted/10 text-[11px]">
                                                        <EyeOff size={10} />
                                                        Anonymous
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </div>

                                    {/* Message */}
                                    {transaction.message && (
                                        <p className="m-0 mb-1.5 text-[13px] text-foreground italic truncate">&ldquo;{transaction.message}&rdquo;</p>
                                    )}

                                    {/* Time */}
                                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                        <Clock size={12} />
                                        {formatDate(transaction.created_at)}
                                    </div>
                                </div>

                                {/* Unread indicator */}
                                {!transaction.is_read && activeTab === "received" && (
                                    <div className="absolute top-1/2 right-10 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-gradient-to-br from-primary to-accent shadow-neon-pink/50"></div>
                                )}

                                <ChevronRight size={18} className="text-muted-foreground shrink-0" />
                            </div>
                        ))
                    )}

                </div>
            )}

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
