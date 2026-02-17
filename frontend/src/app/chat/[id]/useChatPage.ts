'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Message, ChatUser } from '@/components/chat/VIPChatSystem';
import { useTelegram } from '@/lib/telegram';
import { authService } from '@/services/api';
import { useParams } from 'next/navigation';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { getWsUrl } from '@/utils/env';
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
    const queryClient = useQueryClient();

    // UI toggles
    const [showGiftPicker, setShowGiftPicker] = useState(false);
    const [showGifPicker, setShowGifPicker] = useState(false);
    const [showIcebreakers, setShowIcebreakers] = useState(false);
    const [injectInputText, setInjectInputText] = useState('');

    // Core state - messages stay in useState (updated by polling/WS)
    const [messages, setMessages] = useState<Message[]>([]);
    const [user, setUser] = useState<ChatUser | null>(null);
    const [gifts, setGifts] = useState<UIGift[]>([]);

    // React Query: cache match data (staleTime 60s - instant on back-navigation)
    const { data: matchData, isLoading: matchLoading } = useQuery({
        queryKey: ['chat-match', id],
        queryFn: () => authService.getMatch(id),
        staleTime: 60000,
        enabled: !!id && isAuthed,
    });

    // React Query: cache gifts catalog (staleTime 5min)
    const { data: catalogData } = useQuery({
        queryKey: ['gifts-catalog'],
        queryFn: () => authService.getGiftsCatalog(),
        staleTime: 5 * 60 * 1000,
        enabled: isAuthed,
    });

    const loading = matchLoading;

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
    const wsReconnectAttempts = useRef(0);
    const MAX_WS_RECONNECT = 2;
    const currentUserIdRef = useRef<string | null>(null);
    const mountedRef = useRef(true);
    const userRef = useRef(user);
    useEffect(() => { userRef.current = user; }, [user]);
    const wsConnected = useRef(false);
    const pollInterval = useRef<NodeJS.Timeout | null>(null);
    const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);
    const lastMessageTime = useRef<string | null>(null);
    const pollIntervalMs = useRef(5000);
    const lastNewMessageAt = useRef(Date.now());

    const ephemeralEnabledRef = useRef(ephemeralEnabled);
    const ephemeralSecondsRef = useRef(ephemeralSeconds);
    useEffect(() => { ephemeralEnabledRef.current = ephemeralEnabled; }, [ephemeralEnabled]);
    useEffect(() => { ephemeralSecondsRef.current = ephemeralSeconds; }, [ephemeralSeconds]);

    // --- Init ---
    useEffect(() => {
        if (id && isAuthed) {
            loadMessages();
            connectWebSocket();
            startHeartbeat();
        }
        return () => {
            mountedRef.current = false;
            if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
            if (pollInterval.current) clearTimeout(pollInterval.current);
            if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
            if (ws.current) ws.current.close();
        };
    }, [id, isAuthed]);

    // Process match data from React Query cache
    useEffect(() => {
        if (matchData?.user) {
            setUser({
                id: matchData.user.id,
                name: matchData.user.name,
                photo: getFullUrl(matchData.user.photos?.[0]) || '',
                isOnline: matchData.user.is_online,
                lastSeen: matchData.user.last_seen ? new Date(matchData.user.last_seen) : undefined,
                isTyping: false,
                isPremium: matchData.user.is_premium || false
            });
            currentUserIdRef.current = matchData.current_user_id || null;
        }
    }, [matchData]);

    // Process gifts catalog from React Query cache
    useEffect(() => {
        if (catalogData?.gifts) {
            const mappedGifts = catalogData.gifts.map((g: BackendGift) => {
                const cat = catalogData.categories.find((c: BackendCategory) => c.id === g.category_id);
                const catName = cat ? cat.name.toLowerCase() : 'romantic';
                let uiCategory = 'romantic';
                if (catName.includes('fun')) uiCategory = 'funny';
                else if (catName.includes('epic') || catName.includes('premium')) uiCategory = 'epic';
                return {
                    id: g.id, name: g.name, image: getFullUrl(g.image_url),
                    price: g.price, category: uiCategory, rarity: getRarity(g.price)
                };
            });
            setGifts(mappedGifts);
        }
    }, [catalogData]);

    // --- Heartbeat: keep online status alive in Redis ---
    const startHeartbeat = () => {
        authService.heartbeat().catch(() => {});
        heartbeatInterval.current = setInterval(() => {
            if (mountedRef.current) {
                authService.heartbeat().catch(() => {});
            }
        }, 30_000);
    };

    // --- Polling fallback: when WS is not connected ---
    const schedulePoll = () => {
        if (pollInterval.current) return;
        const doPoll = async () => {
            if (!mountedRef.current || wsConnected.current) {
                pollInterval.current = null;
                return;
            }
            try {
                const data = await authService.pollMessages(id, lastMessageTime.current || undefined);

                // Update partner online status and last seen
                if (userRef.current) {
                    setUser(prev => prev ? {
                        ...prev,
                        isOnline: data.partner_online,
                        lastSeen: data.partner_last_seen ? new Date(data.partner_last_seen) : prev.lastSeen,
                    } : null);
                }

                // Update read status of own messages (double checkmark)
                if (data.read_by_partner && data.read_by_partner.length > 0) {
                    setMessages(prev => prev.map(m =>
                        m.isOwn && data.read_by_partner.includes(m.id) && m.status !== 'read'
                            ? { ...m, status: 'read' as const }
                            : m
                    ));
                }

                if (data.messages && data.messages.length > 0) {
                    const currentUserId = currentUserIdRef.current;
                    let hasIncoming = false;

                    for (const m of data.messages) {
                        const msgTime = m.created_at;
                        if (msgTime && (!lastMessageTime.current || msgTime > lastMessageTime.current)) {
                            lastMessageTime.current = msgTime;
                        }
                    }

                    setMessages(prev => {
                        let updated = [...prev];
                        for (const m of data.messages) {
                            const exists = updated.find(existing => existing.id === m.id);
                            if (exists) {
                                // Update read status of own messages
                                if (m.is_read && exists.isOwn && exists.status !== 'read') {
                                    updated = updated.map(msg => msg.id === m.id ? { ...msg, status: 'read' as const } : msg);
                                }
                                continue;
                            }

                            const isOwn = m.sender_id === currentUserId;
                            if (!isOwn) hasIncoming = true;

                            updated.push({
                                id: m.id,
                                text: m.content || m.text,
                                image: getFullUrl(m.photo_url || m.media_url),
                                timestamp: new Date(m.created_at || Date.now()),
                                isOwn,
                                status: m.is_read ? 'read' : (isOwn ? 'delivered' : 'delivered'),
                                type: m.photo_url ? 'image' : 'text'
                            });
                        }
                        return updated;
                    });

                    // Got new messages - reset to fast polling
                    lastNewMessageAt.current = Date.now();
                    pollIntervalMs.current = 5000;

                    // Auto mark-read incoming messages via REST
                    if (hasIncoming) {
                        authService.markReadBatch(id).catch(() => {});
                    }
                } else {
                    // No new messages - adaptive backoff: slow down after 30s of silence
                    if (Date.now() - lastNewMessageAt.current > 30000) {
                        pollIntervalMs.current = Math.min(pollIntervalMs.current + 2000, 15000);
                    }
                }
            } catch {
                // Polling error — silent
            }
            // Schedule next poll
            if (mountedRef.current && !wsConnected.current) {
                pollInterval.current = setTimeout(doPoll, pollIntervalMs.current);
            } else {
                pollInterval.current = null;
            }
        };
        pollInterval.current = setTimeout(doPoll, pollIntervalMs.current);
    };

    const startPolling = () => {
        pollIntervalMs.current = 5000;
        lastNewMessageAt.current = Date.now();
        schedulePoll();
    };

    const stopPolling = () => {
        if (pollInterval.current) {
            clearTimeout(pollInterval.current);
            pollInterval.current = null;
        }
    };

    const loadMessages = async () => {
        try {
            const msgs = await authService.getMessages(id);
            const currentUserId = matchData?.current_user_id || currentUserIdRef.current;
            const uiMessages: Message[] = (msgs as BackendMessage[]).map((m) => {
                const isOwn = m.sender_id === currentUserId;
                return {
                    id: m.id,
                    text: m.content || m.text,
                    image: getFullUrl(m.photo_url || m.media_url),
                    timestamp: new Date(m.created_at || m.timestamp),
                    isOwn,
                    status: isOwn ? (m.is_read ? 'read' : 'delivered') : 'delivered',
                    type: (m.type === 'gift' || m.type === 'super_like') ? 'super_like' : (m.photo_url ? 'image' : 'text')
                };
            });
            setMessages(uiMessages);
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    };

    // --- WebSocket ---
    const connectWebSocket = () => {
        const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
        if (!token) {
            startPolling();
            return;
        }

        const wsUrl = getWsUrl();
        if (!wsUrl) {
            startPolling();
            return;
        }

        try {
            const socket = new WebSocket(wsUrl);

            socket.onopen = () => {
                wsConnected.current = true;
                wsReconnectAttempts.current = 0; // Reset on successful connect
                stopPolling();
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
                wsConnected.current = false;
                if (mountedRef.current) {
                    startPolling();
                    // Exponential backoff with max retries — stop hammering if WS unavailable (e.g. Vercel serverless)
                    if (wsReconnectAttempts.current < MAX_WS_RECONNECT) {
                        const delay = Math.min(5000 * Math.pow(2, wsReconnectAttempts.current), 60000);
                        reconnectTimeout.current = setTimeout(connectWebSocket, delay);
                        wsReconnectAttempts.current++;
                    }
                }
            };

            socket.onerror = () => {
                socket.close();
            };

            ws.current = socket;
        } catch {
            startPolling();
        }
    };

    const handleWebSocketMessage = (data: WebSocketMessageData) => {
        if (data.type === 'message' || data.type === 'text' || data.type === 'photo' || data.type === 'voice' || data.type === 'super_like') {
            if (data.match_id !== id) return;

            const msgId = data.id || data.message_id || `ws-${Date.now()}`;

            setMessages(prev => {
                const exists = prev.find(m => m.id === msgId);
                if (exists) {
                    return prev.map(m => m.id === msgId ? { ...m, status: 'delivered' } : m);
                }

                if (data.sender_id === currentUserIdRef.current) {
                    const pendingMatch = prev.find(m =>
                        m.status === 'sending' &&
                        m.text === (data.text || data.content) &&
                        m.isOwn
                    );
                    if (pendingMatch) {
                        return prev.map(m => m.id === pendingMatch.id ? {
                            ...m, id: data.id || data.message_id, status: 'sent',
                            timestamp: new Date(data.timestamp || Date.now())
                        } : m);
                    }
                }

                const newMsg: Message = {
                    id: msgId,
                    text: data.text || data.content,
                    image: getFullUrl(data.photo_url || data.media_url),
                    timestamp: new Date(data.timestamp || Date.now()),
                    isOwn: data.sender_id === currentUserIdRef.current,
                    status: 'delivered',
                    type: data.type === 'super_like' ? 'super_like' : (data.photo_url ? 'image' : 'text')
                };
                hapticFeedback.impactOccurred('light');

                // Auto-send read receipt for incoming messages
                if (!newMsg.isOwn) {
                    if (ws.current?.readyState === WebSocket.OPEN) {
                        ws.current.send(JSON.stringify({
                            type: 'read',
                            match_id: id,
                            message_ids: [msgId],
                            sender_id: data.sender_id,
                        }));
                    } else {
                        // REST fallback for read receipt
                        authService.markReadBatch(id).catch(() => {});
                    }
                }

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
        } else if (data.type === 'read') {
            // Partner read our messages — update checkmarks to double
            if (data.match_id === id) {
                const readIds = data.message_ids as string[] | undefined;
                if (readIds && readIds.length > 0) {
                    setMessages(prev => prev.map(m =>
                        m.isOwn && readIds.includes(m.id) ? { ...m, status: 'read' } : m
                    ));
                } else {
                    // If no specific IDs, mark all own sent/delivered as read
                    setMessages(prev => prev.map(m =>
                        m.isOwn && (m.status === 'sent' || m.status === 'delivered') ? { ...m, status: 'read' } : m
                    ));
                }
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
                const sentMsg = await authService.sendMessage(id, text) as { id: string; created_at?: string; timestamp?: string };
                setMessages(prev => prev.map(m => m.id === tempId ? {
                    ...m, id: sentMsg.id, status: 'sent',
                    timestamp: new Date(sentMsg.created_at || sentMsg.timestamp || Date.now())
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

            const sentMsg = await authService.sendMessage(id, '', 'photo', imageUrl) as { id: string; created_at?: string; timestamp?: string };
            setMessages(prev => prev.map(m => m.id === tempId ? {
                ...m, id: sentMsg.id, status: 'sent',
                timestamp: new Date(sentMsg.created_at || sentMsg.timestamp || Date.now())
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
