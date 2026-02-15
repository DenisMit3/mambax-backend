export interface Match {
    id: string;
    user: {
        id: string;
        name: string;
        photo: string;
        age: number;
    };
    matchedAt: Date;
    isNew: boolean;
}

export interface Chat {
    id: string;
    user: {
        id: string;
        name: string;
        photo: string;
        isOnline: boolean;
    };
    lastMessage: {
        text: string;
        timestamp: Date;
        isRead: boolean;
        isOwn: boolean;
    };
    unreadCount: number;
}

export interface LikedUser {
    id: string;
    name: string;
    photo: string;
    age: number;
    likedAt: Date;
    canInstantMatch: boolean;
}

export interface MatchHubProps {
    matches: Match[];
    chats: Chat[];
    likedUsers: LikedUser[];
    isPremium: boolean;
    onMatchClick: (matchId: string) => void;
    onChatClick: (chatId: string) => void;
    onInstantMatch: (userId: string) => void;
    onUpgradeToPremium: () => void;
}
