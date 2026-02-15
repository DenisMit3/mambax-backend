export interface Plan {
    id: string;
    name: string;
    tier: 'free' | 'gold' | 'platinum';
    price: number;
    currency: string;
    duration: number;
    subscribers: number;
    mrr: number;
    isActive: boolean;
    isPopular: boolean;
    features: Record<string, boolean | number>;
}
