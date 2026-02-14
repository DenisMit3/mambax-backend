// Типы для страницы детальной информации о пользователе

export interface UserDetail {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    age: number | null;
    gender: string | null;
    bio: string | null;
    photos: string[];
    location: string | null;
    city: string | null;
    status: string;
    subscription_tier: string;
    stars_balance: number;
    is_verified: boolean;
    created_at: string;
    updated_at: string;
    last_active: string | null;
    // Статистика
    matches_count: number;
    messages_count: number;
    reports_received: number;
    reports_sent: number;
    // Фрод
    fraud_score: number;
    fraud_factors: Record<string, number>;
}

export interface TimelineEvent {
    type: string;
    icon: string;
    title: string;
    description: string;
    timestamp: string | null;
    color: string;
}

export interface PaymentRecord {
    id: string;
    type: string;
    amount: number;
    currency: string;
    status: string;
    description: string;
    created_at: string;
}
