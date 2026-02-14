// Общие типы для чат-компонентов

export interface Message {
    id: string;
    text: string;
    senderId: string;
    timestamp: Date;
    type: 'text' | 'image' | 'gift' | 'reaction' | 'voice';
    isRead: boolean;
    isPending?: boolean;
    replyTo?: string;
    reactions?: { emoji: string; userId: string }[];
    audioUrl?: string;
    duration?: number;
}

export interface ChatParticipant {
    id: string;
    name: string;
    photo: string;
    isOnline: boolean;
    lastSeen?: Date;
}

export interface Chat {
    id: string;
    matchId: string;
    participants: ChatParticipant[];
    messages: Message[];
    isTyping: boolean;
    unreadCount: number;
}

export const REACTION_EMOJIS = ['❤️', '😍', '😂', '😮', '😢', '👍'];

export const EMOJI_PICKER_LIST = ['😀', '😂', '😍', '🥰', '😘', '😊', '😉', '😎', '🤔', '😮', '😢', '😡', '👍', '👎', '❤️', '💕', '🔥', '✨'];
