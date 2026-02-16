import { Message } from '@/components/chat/VIPChatSystem';

export interface UIGift {
    id: string;
    name: string;
    image?: string;
    price: number;
    category: string;
    rarity: string;
}

export interface BackendMessage {
    id: string;
    content?: string;
    text?: string;
    photo_url?: string;
    media_url?: string;
    created_at?: string;
    timestamp?: string;
    sender_id?: string;
    is_read?: boolean;
    type?: string;
}

export interface BackendGift {
    id: string;
    name: string;
    emoji?: string;
    image_url?: string;
    price: number;
    category_id?: string;
}

export interface BackendCategory {
    id: string;
    name: string;
}

export interface WebSocketMessageData {
    type: string;
    match_id?: string;
    id: string;
    text?: string;
    content?: string;
    photo_url?: string;
    media_url?: string;
    timestamp?: string;
    sender_id?: string;
    is_read?: boolean;
    message_id?: string;
    user_id?: string;
    is_typing?: boolean;
    is_online?: boolean;
    caller_id?: string;
    call_type?: 'audio' | 'video';
    message_ids?: string[];
    reader_id?: string;
}
