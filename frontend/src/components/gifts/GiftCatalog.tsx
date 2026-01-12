/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import { authService } from "@/services/api";
import { Gift, Sparkles, Star, Heart, X, Search } from "lucide-react";
import styles from "./GiftCatalog.module.css";

interface GiftCategory {
    id: string;
    name: string;
    description: string | null;
    icon: string | null;
    sort_order: number;
}

interface VirtualGift {
    id: string;
    name: string;
    description: string | null;
    image_url: string;
    animation_url: string | null;
    price: number;
    currency: string;
    is_animated: boolean;
    is_premium: boolean;
    is_limited: boolean;
    times_sent: number;
    category_id: string | null;
}

interface GiftCatalogProps {
    onGiftSelect?: (gift: VirtualGift) => void;
    receiverId?: string;
    showSendButton?: boolean;
}

export function GiftCatalog({ onGiftSelect, receiverId, showSendButton = false }: GiftCatalogProps) {
    const [categories, setCategories] = useState<GiftCategory[]>([]);
    const [gifts, setGifts] = useState<VirtualGift[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedGift, setSelectedGift] = useState<VirtualGift | null>(null);

    useEffect(() => {
        loadCatalog();
    }, [selectedCategory]);

    const loadCatalog = async () => {
        try {
            setLoading(true);
            const data = await authService.getGiftsCatalog(selectedCategory || undefined);
            setCategories(data.categories);
            setGifts(data.gifts);
        } catch (error) {
            console.error("Failed to load gift catalog:", error);
            // Fallback mock data
            setCategories([
                { id: "1", name: "Romantic", description: "Express your feelings", icon: "💕", sort_order: 1 },
                { id: "2", name: "Fun", description: "Fun gifts", icon: "🎉", sort_order: 2 },
                { id: "3", name: "Premium", description: "Exclusive gifts", icon: "💎", sort_order: 3 },
            ]);
            setGifts([
                { id: "1", name: "Red Rose", description: "A classic symbol of love", image_url: "/static/gifts/rose.png", animation_url: null, price: 10, currency: "XTR", is_animated: false, is_premium: false, is_limited: false, times_sent: 1250, category_id: "1" },
                { id: "2", name: "Heart Balloon", description: "A cute heart balloon", image_url: "/static/gifts/heart_balloon.png", animation_url: null, price: 15, currency: "XTR", is_animated: true, is_premium: false, is_limited: false, times_sent: 980, category_id: "1" },
                { id: "3", name: "Teddy Bear", description: "A cuddly teddy bear", image_url: "/static/gifts/teddy.png", animation_url: null, price: 25, currency: "XTR", is_animated: false, is_premium: false, is_limited: false, times_sent: 756, category_id: "1" },
                { id: "4", name: "Diamond Ring", description: "For that special someone", image_url: "/static/gifts/diamond_ring.png", animation_url: null, price: 100, currency: "XTR", is_animated: true, is_premium: true, is_limited: false, times_sent: 234, category_id: "3" },
                { id: "5", name: "Party Popper", description: "Celebrate together", image_url: "/static/gifts/party.png", animation_url: null, price: 8, currency: "XTR", is_animated: true, is_premium: false, is_limited: false, times_sent: 1567, category_id: "2" },
                { id: "6", name: "Star", description: "You are my star", image_url: "/static/gifts/star.png", animation_url: null, price: 5, currency: "XTR", is_animated: true, is_premium: false, is_limited: false, times_sent: 2345, category_id: "2" },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const filteredGifts = gifts.filter(gift => {
        if (searchQuery) {
            return gift.name.toLowerCase().includes(searchQuery.toLowerCase());
        }
        if (selectedCategory) {
            return gift.category_id === selectedCategory;
        }
        return true;
    });

    const handleGiftClick = (gift: VirtualGift) => {
        setSelectedGift(gift);
        if (onGiftSelect) {
            onGiftSelect(gift);
        }
    };

    const getGiftImage = (gift: VirtualGift) => {
        // Use emoji fallback if image fails to load
        const emojiMap: { [key: string]: string } = {
            "Red Rose": "🌹",
            "Heart Balloon": "🎈",
            "Teddy Bear": "🧸",
            "Diamond Ring": "💍",
            "Party Popper": "🎉",
            "Star": "⭐",
            "Champagne": "🍾",
            "Chocolate Box": "🍫",
            "Romantic Dinner": "🍽️",
        };
        return emojiMap[gift.name] || "🎁";
    };

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner}></div>
                <p>Loading gifts...</p>
            </div>
        );
    }

    return (
        <div className={styles.catalogContainer}>
            {/* Search Bar */}
            <div className={styles.searchContainer}>
                <Search className={styles.searchIcon} size={18} />
                <input
                    type="text"
                    placeholder="Search gifts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={styles.searchInput}
                />
            </div>

            {/* Categories */}
            <div className={styles.categoriesContainer}>
                <button
                    className={`${styles.categoryChip} ${!selectedCategory ? styles.active : ""}`}
                    onClick={() => setSelectedCategory(null)}
                >
                    <Gift size={14} />
                    All
                </button>
                {categories.map((category) => (
                    <button
                        key={category.id}
                        className={`${styles.categoryChip} ${selectedCategory === category.id ? styles.active : ""}`}
                        onClick={() => setSelectedCategory(category.id)}
                    >
                        <span>{category.icon || "🎁"}</span>
                        {category.name}
                    </button>
                ))}
            </div>

            {/* Gifts Grid */}
            <div className={styles.giftsGrid}>
                {filteredGifts.map((gift) => (
                    <div
                        key={gift.id}
                        className={`${styles.giftCard} ${gift.is_premium ? styles.premium : ""} ${selectedGift?.id === gift.id ? styles.selected : ""}`}
                        onClick={() => handleGiftClick(gift)}
                    >
                        {gift.is_premium && (
                            <div className={styles.premiumBadge}>
                                <Sparkles size={10} />
                                Premium
                            </div>
                        )}
                        {gift.is_animated && (
                            <div className={styles.animatedBadge}>
                                <Star size={10} />
                            </div>
                        )}

                        <div className={styles.giftImageContainer}>
                            {gift.image_url ? (
                                <img
                                    src={gift.image_url.startsWith("http") || gift.image_url.startsWith("/") ? gift.image_url : `/api_proxy/${gift.image_url}`}
                                    alt={gift.name}
                                    className={styles.giftImage}
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = "none";
                                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove(styles.hidden);
                                    }}
                                />
                            ) : null}
                            <div className={`${styles.giftEmoji} ${gift.image_url ? styles.hidden : ""}`}>
                                {getGiftImage(gift)}
                            </div>
                        </div>

                        <div className={styles.giftInfo}>
                            <h4 className={styles.giftName}>{gift.name}</h4>
                            <div className={styles.giftPrice}>
                                <Star size={12} className={styles.starIcon} />
                                {gift.price} {gift.currency}
                            </div>
                        </div>

                        {gift.times_sent > 0 && (
                            <div className={styles.sentCount}>
                                <Heart size={10} />
                                {gift.times_sent.toLocaleString()}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {filteredGifts.length === 0 && (
                <div className={styles.emptyState}>
                    <Gift size={48} />
                    <p>No gifts found</p>
                </div>
            )}
        </div>
    );
}
