/**
 * API Types & Interfaces
 */

export interface AuthResponse {
    access_token: string;
    token_type: string;
    has_profile: boolean;
    is_new_user: boolean;
    user?: UserProfile;
}

export interface PhotoUploadResponse {
    photos: string[];
}

export interface MatchUser {
    id: string;
    name: string;
    age: number;
    photos: string[];
    bio?: string;
    is_verified: boolean;
    online_status?: "online" | "offline";
    last_seen?: string;
    city?: string;
}

export interface MatchMessage {
    id: string;
    text: string;
    sender_id: string;
    created_at: string;
}

export interface Match {
    id: string;
    user: MatchUser;
    last_message?: MatchMessage;
    current_user_id?: string;
    user1_id?: string;
    user2_id?: string;
    created_at?: string;
}

export interface MatchesResponse {
    matches: Match[];
}

export interface VirtualGiftTransaction {
    id: string;
    from_user_id: string;
    from_user_name?: string;
    from_user_photo?: string;
    to_user_id: string;
    gift_type: string;
    gift_name: string;
    gift_image_url?: string;
    message?: string;
    stars_cost: number;
    is_read: boolean;
    created_at: string;
}

export interface GiftListResponse {
    gifts: VirtualGiftTransaction[];
    total: number;
    page?: number;
    pages?: number;
    unread_count?: number;
    total_spent?: number;
}

export type UserRole = 'user' | 'moderator' | 'admin';
export type SubscriptionTier = 'free' | 'plus' | 'premium' | 'vip';
export type Gender = 'male' | 'female' | 'other';

export interface UserLocation {
    lat: number;
    lon: number;
}

export interface UserProfile {
    id: string;
    telegram_id?: string;
    username?: string;
    name: string;
    age: number;
    gender: Gender;
    bio?: string;
    photos: string[];
    interests: string[];
    location?: UserLocation;
    city?: string;

    // Status flags
    is_verified: boolean;
    is_active: boolean;
    is_complete?: boolean;
    verification_selfie?: string;
    online_status?: 'online' | 'offline';
    last_seen?: string;

    // Meta
    role: UserRole;
    subscription_tier: SubscriptionTier;
    stars_balance: number;
    created_at: string;

    // Feed specific
    distance_km?: number;
    compatibility_score?: number;

    // Gamification
    achievements?: { badge: string; earned_at: string; level: number }[];

    // Extended profile info
    work?: string;
    education?: string;
    gifts_received?: number;

    // UX Preferences
    ux_preferences?: {
        sounds_enabled: boolean;
        haptic_enabled: boolean;
        reduced_motion: boolean;
    };

    // Onboarding tracking
    onboarding_completed_steps?: Record<string, boolean>;
}

export interface GiftCategory {
    id: string;
    name: string;
    description: string;
    icon: string;
    sort_order: number;
    is_active: boolean;
}

export interface VirtualGift {
    id: string;
    name: string;
    description: string;
    image_url: string;
    animation_url: string | null;
    price: number;
    currency: string;
    is_animated: boolean;
    is_premium: boolean;
    is_limited: boolean;
    is_active: boolean;
    available_until: string | null;
    max_quantity: number | null;
    times_sent: number;
    category_id: string | null;
    sort_order: number;
}

export interface CatalogResponse {
    categories: GiftCategory[];
    gifts: VirtualGift[];
}

export interface GiftPurchaseResponse {
    status: string;
    transaction_id: string;
    invoice_link?: string;
    payment_id?: string;
}

export interface VapidKeyResponse {
    publicKey: string;
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    size: number;
    pages: number;
    has_more: boolean;
    next_cursor?: string;
}
