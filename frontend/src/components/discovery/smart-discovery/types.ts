import { UserProfile } from '@/services/api';

export interface User extends UserProfile {
    compatibility?: number;
    distance?: number;
    lastSeen?: Date;
    last_seen?: string;
    isOnline?: boolean;
    is_online?: boolean;
    verificationBadge?: 'verified' | 'premium' | 'none';
    height?: string;
    work?: string;
    education?: string;
    interests?: string[];
}

export interface DiscoveryFilters {
    ageRange?: [number, number];
    distance?: number;
    gender?: string;
    [key: string]: unknown;
}

export interface SmartDiscoveryEngineProps {
    users: User[];
    filters: DiscoveryFilters;
    onSwipe: (userId: string, direction: 'like' | 'pass' | 'superlike') => void;
    onFilterChange: (filters: DiscoveryFilters) => void;
    onStartChat?: (userId: string) => void;
    isPremium: boolean;
    superLikesLeft: number;
    boostActive: boolean;
    onUpgradeToPremium: () => void;
    onUseBoost: () => void;
}
