'use client';

import { useState, useEffect, useRef } from 'react';
import { VIPChatSystem, Message, ChatUser } from '@/components/chat/VIPChatSystem';
import { GiftPicker } from '@/components/chat/GiftPicker';
import { useTelegram } from '@/lib/telegram';
import { authService } from '@/services/api';
import { useParams, useRouter } from 'next/navigation';

export default function ChatPage() {
    const { id } = useParams() as { id: string };
    const router = useRouter();
    const { hapticFeedback } = useTelegram();
    const [showGiftPicker, setShowGiftPicker] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [user, setUser] = useState<ChatUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [isTyping, setIsTyping] = useState(false);
    const [gifts, setGifts] = useState<any[]>([]);

    // WebSocket Refs
    const ws = useRef<WebSocket | null>(null);
    const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
    const currentUserIdRef = useRef<string | null>(null);

    useEffect(() => {
        if (id) {
            loadInitialData();
            connectWebSocket();
        }

        return () => {
            if (ws.current) ws.current.close();
            if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
        };
    }, [id]);

    // Helper to fix image URLs from backend
    // Connect via Next.js Proxy to avoid CSP/CORS issues on localhost
    const getFullUrl = (url?: string) => {
        if (!url) return undefined;
        if (url.startsWith('http') || url.startsWith('blob:')) return url;

        // Ensure strictly one slash
        const cleanPath = url.startsWith('/') ? url : `/${url}`;
        return `/api_proxy${cleanPath}`;
    };

    const loadInitialData = async () => {
        try {
            // OPTIMIZED: Fetch only the specific match instead of all matches
            const [msgsData, matchData, catalogData] = await Promise.all([
                authService.getMessages(id),
                authService.getMatch(id),
                authService.getGiftsCatalog()
            ]);

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

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const currentUserId = matchData?.current_user_id;
            currentUserIdRef.current = currentUserId || null; // Store for WebSocket handler

            // DEBUG: Log values for troubleshooting
            console.log('DEBUG: currentUserId =', currentUserId);
            console.log('DEBUG: first message sender_id =', (msgsData as any[])?.[0]?.sender_id);

            const uiMessages: Message[] = (msgsData as any[]).map((m: any) => ({
                id: m.id,
                text: m.content || m.text,
                image: getFullUrl(m.photo_url || m.media_url),
                timestamp: new Date(m.created_at || m.timestamp),
                isOwn: m.sender_id === currentUserId,
                status: m.is_read ? 'read' : 'sent',
                type: (m.type === 'gift' || m.type === 'super_like') ? 'super_like' : (m.photo_url ? 'image' : 'text')
            }));

            setMessages(uiMessages);

            // Helper to determine rarity based on price (Temporary frontend logic until Backend adds 'rarity' field)
            const getRarity = (price: number) => {
                if (price >= 500) return 'legendary';
                if (price >= 100) return 'rare';
                return 'common';
            };

            // Map backend gifts to UI Gift interface
            const mappedGifts = catalogData.gifts.map((g: any) => {
                // Find category name
                const cat = catalogData.categories.find((c: any) => c.id === g.category_id);
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
            // @ts-ignore - We are setting the state defined below, but need to add it to component
            setGifts(mappedGifts);

        } catch (error) {
            console.error('Failed to load chat', error);
        } finally {
            setLoading(false);
        }
    };

    const connectWebSocket = () => {
        const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
        if (!token) return;

        // Use correct protocol (ws:// or wss://)
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Use standard API URL or relative if proxied. Assuming process.env or fallback.
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'localhost:8001';
        const wsUrl = `${protocol}//${apiUrl.replace('http://', '').replace('https://', '')}/chat/ws/${token}`;

        console.log('Connecting to WS:', wsUrl);

        const socket = new WebSocket(wsUrl);

        socket.onopen = () => {
            console.log('WS Connected');
            // Re-sync messages could happen here
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
            console.log('WS Closed, reconnecting...');
            ws.current = null;
            reconnectTimeout.current = setTimeout(connectWebSocket, 3000);
        };

        socket.onerror = (err) => {
            // Silently handle - backend WS may not be running in dev
            // console.error('WS Error', err);
            socket.close();
        };

        // TODO (PERF): Unify with services/websocket.ts WebSocketService
        // Currently duplicating WebSocket logic here
        ws.current = socket;
    };

    const handleWebSocketMessage = (data: any) => {
        if (data.type === 'message' || data.type === 'text' || data.type === 'photo' || data.type === 'super_like') {
            // Check if message belongs to this chat
            if (data.match_id !== id) return;

            // Avoid duplicating own messages if we added them optimistically
            setMessages(prev => {
                // 1. Check if we already have this exact message ID
                const exists = prev.find(m => m.id === data.id);
                if (exists) {
                    return prev.map(m => m.id === data.id ? { ...m, status: 'delivered' } : m);
                }

                // 2. Check if we have a pending/sending message with same content (Optimistic Match)
                // This prevents "double bubbles" when the server echoes back our own message
                // We assume if sender_id != user.id it might be ours (since user is the OTHER person in chat page context usually?)
                // Wait, user state holds the partner. So data.sender_id should be COMPARED to user.id.
                // If data.sender_id != user.id, it means sent by ME.
                if (data.sender_id !== user?.id) {
                    const pendingMatch = prev.find(m =>
                        m.status === 'sending' &&
                        m.text === (data.text || data.content) &&
                        m.isOwn // Ensure it was marked as ours
                    );

                    if (pendingMatch) {
                        // Replace the temp message with the real one
                        return prev.map(m => m.id === pendingMatch.id ? {
                            ...m,
                            id: data.id,
                            status: 'sent',
                            timestamp: new Date(data.timestamp || Date.now())
                        } : m);
                    }
                }

                // If it's a new message
                const newMsg: Message = {
                    id: data.id, // Real ID
                    text: data.text || data.content,
                    image: getFullUrl(data.photo_url || data.media_url),
                    timestamp: new Date(data.timestamp || Date.now()),
                    isOwn: data.sender_id === currentUserIdRef.current,
                    status: 'delivered', // Incoming is always delivered
                    type: data.type === 'super_like' ? 'super_like' : (data.photo_url ? 'image' : 'text')
                };

                hapticFeedback.impactOccurred('light');
                return [...prev, newMsg];
            });
        } else if (data.type === 'typing') {
            if (data.match_id === id && data.user_id === user?.id) {
                // Update user typing status in local state or ref
                // For now, simpler to just log or use a separate state if VIPChatSystem supports it
                // VIPChatSystem takes `user` prop which has `isTyping`. We need to update that.
                setUser(prev => prev ? { ...prev, isTyping: data.is_typing } : null);
            }
        } else if (data.type === 'online_status') {
            if (data.user_id === user?.id) {
                setUser(prev => prev ? { ...prev, isOnline: data.is_online } : null);
            }
        }
    };

    const handleSendMessage = async (text: string) => {
        if (!text.trim()) return;

        const tempId = `temp-${Date.now()}`;
        const optimisticMsg: Message = {
            id: tempId,
            text: text,
            timestamp: new Date(),
            isOwn: true,
            status: 'sending',
            type: 'text'
        };

        // 1. Optimistic Update
        setMessages(prev => [...prev, optimisticMsg]);
        hapticFeedback.impactOccurred('light');

        // 2. Send via WS if open, else REST
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({
                type: 'message',
                match_id: id,
                content: text
            }));
        } else {
            // Fallback to REST
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const sentMsg = await authService.sendMessage(id, text) as any;
                // Update the temp message with real one
                setMessages(prev => prev.map(m => m.id === tempId ? {
                    ...m,
                    id: sentMsg.id,
                    status: 'sent',
                    timestamp: new Date(sentMsg.created_at)
                } : m));
            } catch (error) {
                console.error('Failed to send', error);
                // Mark as failed
                setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'failed' } : m));
            }
        }

        // DEV ONLY: Simulated reply for testing
        // In production, real users/backend would send messages
        if (process.env.NODE_ENV === 'development') {
            setTimeout(() => {
                // Mark user's messages as READ (Double Checkmarks)
                setMessages(prev => prev.map(m =>
                    (m.isOwn && (m.status === 'sent' || m.status === 'delivered'))
                        ? { ...m, status: 'read' }
                        : m
                ));

                // Start typing
                setUser(prev => prev ? { ...prev, isTyping: true } : null);

                setTimeout(() => {
                    // Stop typing and send reply
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
                        id: `ai-${Date.now()}`,
                        text: randomReply,
                        timestamp: new Date(),
                        isOwn: false,
                        status: 'read',
                        type: 'text'
                    };
                    setMessages(prev => [...prev, aiMsg]);
                    hapticFeedback.notificationOccurred('success');
                }, 1500 + Math.random() * 1000);
            }, 1000);
        }
    };

    const handleReaction = (id: string, reaction: string) => {
        setMessages(prev => prev.map(m =>
            m.id === id ? { ...m, reaction: reaction } : m
        ));
        hapticFeedback.selection();
    };

    const handleSendImage = async (file: File) => {
        try {
            // 1. Upload
            // Use 'any' type to bypass strict restriction if needed, or update api.ts return type
            const response = await authService.uploadChatMedia(file) as any;
            const imageUrl = response.url; // Backend returns { url: "..." }

            if (!imageUrl) throw new Error("No URL returned from upload");

            // 2. Optimistic Update (Temp Message)
            const tempId = `temp-img-${Date.now()}`;
            const optimisticMsg: Message = {
                id: tempId,
                text: '',
                image: getFullUrl(imageUrl),
                timestamp: new Date(),
                isOwn: true,
                status: 'sending',
                type: 'image'
            };
            setMessages(prev => [...prev, optimisticMsg]);
            hapticFeedback.impactOccurred('light');

            // 3. Send Message
            // Type 'photo' match backend expectation
            // We pass imageUrl as 4th arg (mapped to media_url)
            const sentMsg = await authService.sendMessage(id, '', 'photo', imageUrl) as any;

            // 4. Update Status
            setMessages(prev => prev.map(m => m.id === tempId ? {
                ...m,
                id: sentMsg.id,
                status: 'sent',
                timestamp: new Date(sentMsg.created_at)
            } : m));

        } catch (error) {
            console.error("Image send failed", error);
            // Show error in UI (optional toast)
            alert("Не удалось отправить фото");
        }
    };

    if (loading) return (
        <div className="h-screen bg-black flex flex-col items-center justify-center text-white font-mono space-y-4">
            <div className="w-12 h-12 border-2 border-primary-red/30 border-t-primary-red rounded-full animate-spin" />
            <p className="text-primary-red animate-pulse">Установка защищенного соединения...</p>
        </div>
    );

    if (!user) return <div className="h-screen bg-black flex items-center justify-center text-white">Чат не найден</div>;

    return (
        <div className="absolute inset-0 flex flex-col bg-black overflow-hidden">
            <VIPChatSystem
                user={user}
                messages={messages}
                isPremium={true}
                onSendMessage={handleSendMessage}
                onSendImage={handleSendImage}
                onSendSuperLike={() => setShowGiftPicker(true)}
                onReaction={handleReaction}
                onBack={() => router.back()}
            />

            <GiftPicker
                isOpen={showGiftPicker}
                gifts={gifts}
                onClose={() => setShowGiftPicker(false)}
                onSelectGift={async (gift: any) => {
                    if (!user) return;
                    try {
                        hapticFeedback.notificationOccurred('success');
                        await authService.sendGift(gift.id, user.id);

                        // Optimistic Message (will be deduped by WS)
                        const giftMsg: Message = {
                            id: `temp-gift-${Date.now()}`,
                            text: `🎁 Подарок: ${gift.name}`, // Fixed: We are SENDING, not receiving
                            type: 'super_like', // Using super_like styling for now
                            image: gift.image,
                            timestamp: new Date(),
                            isOwn: true,
                            status: 'sending'
                        };

                        // We rely on backend to creating the message text "Gift: ...". 
                        // But for immediate feedback:
                        setMessages(prev => [...prev, giftMsg]);

                        setShowGiftPicker(false);
                    } catch (error) {
                        console.error("Failed to send gift", error);
                        alert("Недостаточно средств или ошибка отправки.");
                    }
                }}
            />
        </div>
    );
}
