/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { authService, CatalogResponse, GiftCategory, VirtualGift } from "@/services/api";
import { Sparkles, Star, Heart, Search, Loader2, Gift as GiftIcon } from "lucide-react";
import { useHaptic } from "@/hooks/useHaptic";

// Remove local interfaces that are now imported
// interface GiftCategory { ... }
// interface VirtualGift { ... }

interface GiftCatalogProps {
    onGiftSelect?: (gift: VirtualGift) => void;
    receiverId?: string;
    showSendButton?: boolean;
}

// Fallback mock data
const FALLBACK_CATEGORIES: GiftCategory[] = [
    { id: "1", name: "Романтика", description: "Подарки для проявления нежных чувств", icon: "❤️", sort_order: 1, is_active: true },
    { id: "2", name: "Веселье", description: "Поднимите настроение собеседнику", icon: "🎉", sort_order: 2, is_active: true },
    { id: "3", name: "Премиум", description: "Эксклюзивные подарки для особенных случаев", icon: "💎", sort_order: 3, is_active: true },
];

const FALLBACK_GIFTS: VirtualGift[] = [
    { id: "1", name: "Красная роза", description: "Классический символ любви", image_url: "/static/gifts/rose.png", animation_url: null, price: 10, currency: "XTR", is_animated: false, is_premium: false, is_limited: false, is_active: true, times_sent: 1250, category_id: "1", sort_order: 1, available_until: null, max_quantity: null },
    { id: "2", name: "Воздушное сердце", description: "Милый воздушный шарик-сердечко", image_url: "/static/gifts/heart_balloon.png", animation_url: null, price: 15, currency: "XTR", is_animated: true, is_premium: false, is_limited: false, is_active: true, times_sent: 980, category_id: "1", sort_order: 2, available_until: null, max_quantity: null },
    { id: "3", name: "Плюшевый мишка", description: "Уютный плюшевый медвежонок", image_url: "/static/gifts/teddy.png", animation_url: null, price: 25, currency: "XTR", is_animated: false, is_premium: false, is_limited: false, is_active: true, times_sent: 750, category_id: "1", sort_order: 3, available_until: null, max_quantity: null },
    { id: "4", name: "Шампанское", description: "Отпразднуйте особенный момент", image_url: "/static/gifts/champagne.png", animation_url: null, price: 30, currency: "XTR", is_animated: true, is_premium: false, is_limited: false, is_active: true, times_sent: 620, category_id: "2", sort_order: 4, available_until: null, max_quantity: null },
    { id: "5", name: "Звезда", description: "Ты - моя звезда!", image_url: "/static/gifts/star.png", animation_url: null, price: 5, currency: "XTR", is_animated: true, is_premium: false, is_limited: false, is_active: true, times_sent: 2100, category_id: "2", sort_order: 7, available_until: null, max_quantity: null },
    { id: "6", name: "Коробка конфет", description: "Сладкая, как ты", image_url: "/static/gifts/chocolate.png", animation_url: null, price: 20, currency: "XTR", is_animated: false, is_premium: false, is_limited: false, is_active: true, times_sent: 890, category_id: "2", sort_order: 8, available_until: null, max_quantity: null },
    { id: "7", name: "Бриллиантовое кольцо", description: "Для самого особенного человека", image_url: "/static/gifts/diamond_ring.png", animation_url: null, price: 100, currency: "XTR", is_animated: true, is_premium: true, is_limited: false, is_active: true, times_sent: 320, category_id: "3", sort_order: 5, available_until: null, max_quantity: null },
    { id: "8", name: "Романтический ужин", description: "Виртуальное свидание за ужином", image_url: "/static/gifts/dinner.png", animation_url: null, price: 50, currency: "XTR", is_animated: false, is_premium: true, is_limited: false, is_active: true, times_sent: 450, category_id: "3", sort_order: 6, available_until: null, max_quantity: null },
];

export function GiftCatalog({ onGiftSelect, receiverId, showSendButton = false }: GiftCatalogProps) {
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedGift, setSelectedGift] = useState<VirtualGift | null>(null);
    const haptic = useHaptic();

    // FIX (CACHE): Use React Query with aggressive caching
    // Gift catalog rarely changes - cache for 1 hour
    const { data, isLoading } = useQuery<CatalogResponse>({
        queryKey: ['giftsCatalog', selectedCategory],
        queryFn: () => authService.getGiftsCatalog(selectedCategory || undefined),
        staleTime: 1000 * 60 * 60, // 1 hour - catalog rarely changes
        gcTime: 1000 * 60 * 60 * 24, // 24 hours cache time
        retry: 2,
    });

    const categories = data?.categories || FALLBACK_CATEGORIES;
    const gifts = data?.gifts || FALLBACK_GIFTS;

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
        haptic.medium();
        setSelectedGift(gift);
        if (onGiftSelect) {
            onGiftSelect(gift);
        }
    };

    const getGiftImage = (gift: VirtualGift) => {
        const emojiMap: { [key: string]: string } = {
            "Красная роза": "🌹",
            "Воздушное сердце": "🎈",
            "Плюшевый мишка": "🧸",
            "Бриллиантовое кольцо": "💍",
            "Шампанское": "🍾",
            "Звезда": "⭐",
            "Коробка конфет": "🍫",
            "Романтический ужин": "🍽️",
            // English fallbacks
            "Red Rose": "🌹",
            "Heart Balloon": "🎈",
            "Teddy Bear": "🧸",
            "Diamond Ring": "💍",
            "Champagne": "🍾",
            "Star": "⭐",
            "Chocolate Box": "🍫",
            "Romantic Dinner": "🍽️",
        };
        return emojiMap[gift.name] || "🎁";
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 py-12 text-muted-foreground">
                <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin"></div>
                <p>Загрузка подарков...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 p-4 max-w-full">
            {/* Search Bar */}
            <div className="relative flex items-center">
                <Search className="absolute left-3 text-muted-foreground" size={18} />
                <input
                    type="text"
                    placeholder="Поиск подарков..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full py-3 pl-10 pr-3 rounded-xl border border-border bg-surface text-foreground text-sm transition-all focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
            </div>

            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto py-1 scrollbar-hide no-scrollbar">
                <button
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-border bg-surface text-muted-foreground text-[13px] font-medium cursor-pointer transition-all hover:border-primary hover:text-primary whitespace-nowrap ${!selectedCategory ? "bg-gradient-to-br from-primary to-accent border-transparent text-white" : ""}`}
                    onClick={() => setSelectedCategory(null)}
                >
                    <GiftIcon size={14} />
                    Все
                </button>
                {categories.map((category) => (
                    <button
                        key={category.id}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-border bg-surface text-muted-foreground text-[13px] font-medium cursor-pointer transition-all hover:border-primary hover:text-primary whitespace-nowrap ${selectedCategory === category.id ? "bg-gradient-to-br from-primary to-accent border-transparent text-white" : ""}`}
                        onClick={() => setSelectedCategory(category.id)}
                    >
                        <span>{category.icon || "🎁"}</span>
                        {category.name}
                    </button>
                ))}
            </div>

            {/* Gifts Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredGifts.map((gift) => (
                    <div
                        key={gift.id}
                        className={`relative flex flex-col items-center p-4 rounded-2xl bg-surface border-2 border-transparent cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl hover:border-primary ${gift.is_premium ? "bg-gradient-to-br from-yellow-500/10 to-orange-500/5 hover:shadow-yellow-500/30" : ""} ${selectedGift?.id === gift.id ? "border-primary bg-gradient-to-br from-primary/10 to-accent/10" : ""}`}
                        onClick={() => handleGiftClick(gift)}
                    >
                        {gift.is_premium && (
                            <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 text-black text-[10px] font-semibold">
                                <Sparkles size={10} />
                                Premium
                            </div>
                        )}
                        {gift.is_animated && (
                            <div className="absolute top-2 left-2 flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 text-white animate-pulse">
                                <Star size={10} />
                            </div>
                        )}

                        <div className="w-16 h-16 flex items-center justify-center mb-3">
                            {gift.image_url ? (
                                <img
                                    src={gift.image_url.startsWith("http") || gift.image_url.startsWith("/") ? gift.image_url : `/api_proxy/${gift.image_url}`}
                                    alt={gift.name}
                                    loading="lazy"
                                    className="max-w-full max-h-full object-contain"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = "none";
                                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                                    }}
                                />
                            ) : null}
                            <div className={`text-[48px] leading-none ${gift.image_url ? "hidden" : ""}`}>
                                {getGiftImage(gift)}
                            </div>
                        </div>

                        <div className="text-center">
                            <h4 className="text-sm font-semibold text-foreground mb-1.5">{gift.name}</h4>
                            <div className="flex items-center justify-center gap-1 text-[13px] font-semibold text-primary">
                                <Star size={12} className="text-[#FFD700]" />
                                {gift.price} {gift.currency}
                            </div>
                        </div>

                        {gift.times_sent > 0 && (
                            <div className="absolute bottom-2 right-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Heart size={10} className="text-red-500" />
                                {gift.times_sent.toLocaleString()}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {filteredGifts.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
                    <GiftIcon size={48} className="opacity-50" />
                    <p>Подарки не найдены</p>
                </div>
            )}
        </div>
    );
}
