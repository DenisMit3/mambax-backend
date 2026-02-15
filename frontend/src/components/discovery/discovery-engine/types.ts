export interface Profile {
    id: string;
    name: string;
    age: number;
    bio: string;
    photos: string[];
    distance: number;
    isVerified: boolean;
    aiCompatibility: number;
    isOnline: boolean;
    lastSeen?: string;
    interests: string[];
    profession: string;
    education: string;
}

export interface DiscoveryFilters {
    ageRange: [number, number];
    maxDistance: number;
    interests: string[];
    verifiedOnly: boolean;
    onlineOnly: boolean;
    minCompatibility: number;
}

export interface DiscoveryEngineProps {
    profiles: Profile[];
    onSwipe: (direction: 'left' | 'right' | 'up', profileId: string) => void;
    onFiltersChange: (filters: DiscoveryFilters) => void;
    userLocation: { lat: number; lng: number };
    isPremium: boolean;
}
