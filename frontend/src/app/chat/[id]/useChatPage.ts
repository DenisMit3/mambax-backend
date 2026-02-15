'use client';

import { useState, useEffect, useRef } from 'react';
import { Message, ChatUser } from '@/components/chat/VIPChatSystem';
import { useTelegram } from '@/lib/telegram';
import { authService } from '@/services/api';
import { useParams } from 'next/navigation';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import {
    UIGift,
    BackendMessage,
    BackendGift,
    BackendCategory,
    WebSocketMessageData,
} from './types';

/** Helper to fix image URLs from backend — proxy via Next.js */
const getFullUrl = (url?: string) => {
    if (!url) return undefined;
    if (url.startsWith('http') || url.startsWith('blob:')) return url;
    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    return `/api_proxy${cleanPath}`;
};

const getRarity = (price: number) => {
    if (price >= 500) return 'legendary';
    if (price >= 100) return 'rare';
    return 'common';
};

export function useChatPage() {
    const { id } = useParams() as { id: string };
    const { hapticFeedback } = useTelegram();
    const { isAuthed, isChecking } = useRequireAuth();

    // UI toggles
    const [showGiftPicker, setShowGiftPicker] = useState(false);
    const [showGifPicker, setShowGifPicker] = useState(false);
    const [showIcebreakers, setShowIcebreakers] = useState(false);
    const [injectInputText, setInjectInputText] = useState('');

    // Core state
    const [messages, setMessages] = useState<Message[]>([]);
    const [user, setUser] = useState<ChatUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [gifts, setGifts] = useState<UIGift[]>([]);

    // Call state
    const [showCall, setShowCall] = useState(false);
    const [callType, setCallType] = useState<'audio' | 'video'>('video');
    const [incomingCall, setIncomingCall] = useState<{ callerId: string; callerName: string; type: 'audio' | 'video' } | null>(null);

    // Ephemeral
    const [ephemeralEnabled, setEphemeralEnabled] = useState(false);
    const [ephemeralSeconds, setEphemeralSeconds] = useState(10);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Refs
    const ws = useRef<WebSocket | null>(null);
    const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
    const currentUserIdRef = useRef<string | null>(null);
    const mountedRef = useRef(true);
    const userRef = useRef(user);
    useEffect(() => { userRef.current = user; }, [user]);

    const ephemeralEnabledRef = useRef(ephemeralEnabled);
    const ephemeralSecondsRef = useRef(ephemeralSeconds);
    useEffect(() => { ephemeralEnabledRef.current = ephemeralEnabled; }, [ephemeralEnabled]);
    useEffect(() => { ephemeralSecondsRef.current = ephemeralSeconds; }, [ephemeralSeconds]);

    // --- Init ---
    useEffect(() => {
        if (id && isAuthed) {
            loadInitialData();
            connectWebSocket();
        }
        return () => {
            mountedRef.current = false;
            if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
            if (ws.current) ws.current.close();
        };
    }, [id, isAuthed]);

    const loadInitialData = async () => {
        try {
            // FIX: getMatch is the ONLY critical request — it determines if chat exists.
            // Messages and gifts are loaded separately so their failures don't cause "Чат не найден".
            const matchData = await authService.getMatch(id);

            if (matchData && matchData.user) {
                setUser({
                    id: matchData.user.id,
                    name: matchData.user.name,
                    photo: getFullUrl(matchData.user.photos?.[0]) || '',
                    isOnline: matchData.user.is_online,
                    lastSeen: matchData.user.last_seen ? new Date(matchData.user.last_seen) : undefined,
                    isTyping: false,
                    isPremium: matchData.user.is_premium || false
                });
            }

            const currentUserId = matchData?.current_user_id;
            currentUserIdRef.current = currentUserId || null;

            // Non-critical: load messages and gifts in parallel via allSettled
            const [msgsResult, catalogResult] = await Promise.allSettled([
                authService.getMessages(id),
                authService.getGiftsCatalog()
            ]);

            if (msgsResult.status === 'fulfilled') {
                const msgsData = msgsResult.value;
                const uiMessages: Message[] = (msgsData as BackendMessage[]).map((m) => ({
                    id: m.id,
                    text: m.content || m.text,
                    image: getFullUrl(m.photo_url || m.media_url),
                    timestamp: new Date(m.created_at || m.timestamp),
                    isOwn: m.sender_id === currentUserId,
                    status: m.is_read ? 'read' : 'sent',
                    type: (m.type === 'gift' || m.type === 'super_like') ? 'super_like' : (m.photo_url ? 'image' : 'text')
                }));
                setMessages(uiMessages);
            } else {
                console.warn('Failed to load messages (non-critical):', msgsResult.reason);
            }

            if (catalogResult.status === 'fulfilled') {
                const catalogData = catalogResult.value;
                const mappedGifts = catalogData.gifts.map((g: BackendGift) => {
                    const cat = catalogData.categories.find((c: BackendCategory) => c.id === g.category_id);
                    const catName = cat ? cat.name.toLowerCase() : 'romantic';
                    let uiCategory = 'romantic';
                    if (catName.includes('fun')) uiCategory = 'funny';
                    else if (catName.includes('epic') || catName.includes('premium')) uiCategory = 'epic';
                    return {
                        id: g.id,
                        name: g.name,
                        image: getFullUrl(g.image_url),
                        price: g.price,
                        category: uiCategory,
                        rarity: getRarity(g.price)
                    };
                });
                setGifts(mappedGifts);
            } else {
                console.warn('Failed to load gifts catalog (non-critical):', catalogResult.reason);
            }
        } catch (error) {
            console.error('Failed to load chat (match not found):', error);
        } finally {
            setLoading(false);
        }
    };

    // --- WebSocket ---
    const connectWebSocket = () => {
        const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
        if (!token) return;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/chat/ws`;
        const socket = new WebSocket(wsUrl);

        socket.onopen = () => {
            socket.send(JSON.stringify({ type: 'auth', token }));
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleWebSocketMessage(data);
            } catch (e) {
                console.error('WS Parse Error', e);
            }
        };

        socket.onclose = () => {
            ws.current = null;
            if (mountedRef.current) {
                reconnectTimeout.current = setTimeout(connectWebSocket, 3000);
            }
        };

        socket.onerror = () => {
            socket.close();
        };

        ws.current = socket;
    };

    const handleWebSocketMessage = (data: WebSocketMessageData) => {
        if (data.type === 'message' || data.type === 'text' || data.type === 'photo' || data.type === 'super_like') {
            if (data.match_id !== id) return;

            setMessages(prev => {
                const exists = prev.find(m => m.id === data.id);
                if (exists) {
                    return prev.map(m => m.id === data.id ? { ...m, status: 'delivered' } : m);
                }

                if (data.sender_id !== userRef.current?.id) {
                    const pendingMatch = prev.find(m =>
                        m.status === 'sending' &&
                        m.text === (data.text || data.content) &&
                        m.isOwn
                    );
                    if (pendingMatch) {
                        return prev.map(m => m.id === pendingMatch.id ? {
                            ...m, id: data.id, status: 'sent',
                            timestamp: new Date(data.timestamp || Date.now())
                        } : m);
                    }
                }

                const newMsg: Message = {
                    id: data.id,
                    text: data.text || data.content,
                    image: getFullUrl(data.photo_url || data.media_url),
                    timestamp: new Date(data.timestamp || Date.now()),
                    isOwn: data.sender_id === currentUserIdRef.current,
                    status: 'delivered',
                    type: data.type === 'super_like' ? 'super_like' : (data.photo_url ? 'image' : 'text')
                };
                hapticFeedback.impactOccurred('light');
                return [...prev, newMsg];
            });
        } else if (data.type === 'typing') {
            if (data.match_id === id && data.user_id === userRef.current?.id) {
                setUser(prev => prev ? { ...prev, isTyping: data.is_typing } : null);
            }
        } else if (data.type === 'online_status') {
            if (data.user_id === userRef.current?.id) {
                setUser(prev => prev ? { ...prev, isOnline: data.is_online } : null);
            }
        } else if (data.type === 'offer' && data.match_id === id) {
            setIncomingCall({
                callerId: data.caller_id!,
                callerName: userRef.current?.name || "Неизвестный",
                type: data.call_type || "video"
            });
            setCallType(data.call_type || "video");
            setShowCall(true);
        }
    };

    // --- Send handlers ---
    const handleSendMessage = async (text: string) => {
        if (!text.trim()) return;

        const tempId = `temp-${Date.now()}`;
        const optimisticMsg: Message = {
            id: tempId, text, timestamp: new Date(),
            isOwn: true, status: 'sending', type: 'text'
        };
        setMessages(prev => [...prev, optimisticMsg]);
        hapticFeedback.impactOccurred('light');

        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({
                type: 'message', match_id: id, content: text,
                is_ephemeral: ephemeralEnabledRef.current,
                ephemeral_seconds: ephemeralEnabledRef.current ? ephemeralSecondsRef.current : undefined
            }));
        } else {
            try {
                const sentMsg = await authService.sendMessage(id, text) as { id: string; created_at: string };
                setMessages(prev => prev.map(m => m.id === tempId ? {
                    ...m, id: sentMsg.id, status: 'sent',
                    timestamp: new Date(sentMsg.created_at)
                } : m));
            } catch (error) {
                console.error('Failed to send', error);
                setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'failed' } : m));
            }
        }

        // DEV ONLY: Simulated reply
        if (process.env.NODE_ENV === 'development') {
            setTimeout(() => {
                setMessages(prev => prev.map(m =>
                    (m.isOwn && (m.status === 'sent' || m.status === 'delivered'))
                        ? { ...m, status: 'read' } : m
                ));
                setUser(prev => prev ? { ...prev, isTyping: true } : null);

                setTimeout(() => {
                    setUser(prev => prev ? { ...prev, isTyping: false } : null);
                    const replies = [
                        "Интересно! Расскажи подробнее 🤔",
                        "Ха-ха, это точно! 😂",
                        "Ты супер! 🔥",
                        "Я тут, слушаю внимательно...",
                        "Круто звучит!"
                    ];
                    const randomReply = replies[Math.floor(Math.random() * replies.length)];
                    const aiMsg: Message = {
                        id: `ai-${Date.now()}`, text: randomReply,
                        timestamp: new Date(), isOwn: false, status: 'read', type: 'text'
                    };
                    setMessages(prev => [...prev, aiMsg]);
                    hapticFeedback.notificationOccurred('success');
                }, 1500 + Math.random() * 1000);
            }, 1000);
        }
    };

    const handleReaction = (msgId: string, reaction: string) => {
        setMessages(prev => prev.map(m =>
            m.id === msgId ? { ...m, reaction } : m
        ));
        hapticFeedback.selection();
    };

    const handleSendImage = async (file: File) => {
        try {
            const response = await authService.uploadChatMedia(file) as { url: string };
            const imageUrl = response.url;
            if (!imageUrl) throw new Error("No URL returned from upload");

            const tempId = `temp-img-${Date.now()}`;
            const optimisticMsg: Message = {
                id: tempId, text: '', image: getFullUrl(imageUrl),
                timestamp: new Date(), isOwn: true, status: 'sending', type: 'image'
            };
            setMessages(prev => [...prev, optimisticMsg]);
            hapticFeedback.impactOccurred('light');

            const sentMsg = await authService.sendMessage(id, '', 'photo', imageUrl) as { id: string; created_at: string };
            setMessages(prev => prev.map(m => m.id === tempId ? {
                ...m, id: sentMsg.id, status: 'sent',
                timestamp: new Date(sentMsg.created_at)
            } : m));
        } catch (error) {
            console.error("Image send failed", error);
            setToast({ message: "Не удалось отправить фото", type: 'error' });
        }
    };

    const handleSendGift = async (gift: { id: string; name: string; image?: string }) => {
        if (!user) return;
        try {
            hapticFeedback.notificationOccurred('success');
            await authService.sendGift(gift.id, user.id);

            const giftMsg: Message = {
                id: `temp-gift-${Date.now()}`,
                text: `🎁 Подарок: ${gift.name}`,
                type: 'super_like',
                image: gift.image,
                timestamp: new Date(),
                isOwn: true,
                status: 'sending'
            };
            setMessages(prev => [...prev, giftMsg]);
            setShowGiftPicker(false);
        } catch (error) {
            console.error("Failed to send gift", error);
            setToast({ message: "Недостаточно средств или ошибка отправки.", type: 'error' });
        }
    };

    return {
        id,
        isChecking, loading,
        user,
        messages,
        gifts,
        // UI toggles
        showGiftPicker, setShowGiftPicker,
        showGifPicker, setShowGifPicker,
        showIcebreakers, setShowIcebreakers,
        injectInputText, setInjectInputText,
        // Call
        showCall, setShowCall,
        callType, setCallType,
        incomingCall, setIncomingCall,
        // Ephemeral
        ephemeralEnabled, setEphemeralEnabled,
        ephemeralSeconds, setEphemeralSeconds,
        toast, setToast,
        // Refs
        ws,
        currentUserIdRef,
        // Handlers
        handleSendMessage,
        handleReaction,
        handleSendImage,
        handleSendGift,
    };
}
