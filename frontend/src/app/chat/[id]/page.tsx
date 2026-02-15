'use client';

import { useState, useEffect, useRef } from 'react';
import { VIPChatSystem, Message, ChatUser } from '@/components/chat/VIPChatSystem';
import { GiftPicker } from '@/components/chat/GiftPicker';
import { GifPicker } from '@/components/chat/GifPicker';
import { QuestionOfTheDayCard } from '@/components/chat/QuestionOfTheDayCard';
import { ConversationPromptsButton } from '@/components/chat/ConversationPromptsButton';
import { IcebreakersModal } from '@/components/chat/IcebreakersModal';
import { useTelegram } from '@/lib/telegram';
import { authService } from '@/services/api';
import { useParams, useRouter } from 'next/navigation';
import { Lightbulb, Phone, Video } from 'lucide-react';
import dynamic from 'next/dynamic';
import { EphemeralToggle } from '@/components/chat/EphemeralMessages';
import { Toast } from '@/components/ui/Toast';
import { useRequireAuth } from '@/hooks/useRequireAuth';

const CallScreen = dynamic(() => import('@/components/chat/CallScreen').then(m => ({ default: m.CallScreen })), {
    ssr: false,
    loading: () => null
});

export default function ChatPage() {
    const { id } = useParams() as { id: string };
    const router = useRouter();
    const { hapticFeedback } = useTelegram();
    const { isAuthed, isChecking } = useRequireAuth();
    const [showGiftPicker, setShowGiftPicker] = useState(false);
    const [showGifPicker, setShowGifPicker] = useState(false);
    const [showIcebreakers, setShowIcebreakers] = useState(false);
    const [injectInputText, setInjectInputText] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [user, setUser] = useState<ChatUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [isTyping, setIsTyping] = useState(false);
    interface UIGift {
        id: string;
        name: string;
        image?: string;
        price: number;
        category: string;
        rarity: string;
    }

    const [gifts, setGifts] = useState<UIGift[]>([]);

    // Call State
    const [showCall, setShowCall] = useState(false);
    const [callType, setCallType] = useState<"audio" | "video">("video");
    const [incomingCall, setIncomingCall] = useState<{ callerId: string; callerName: string; type: "audio" | "video" } | null>(null);

    // Ephemeral Messages
    const [ephemeralEnabled, setEphemeralEnabled] = useState(false);
    const [ephemeralSeconds, setEphemeralSeconds] = useState(10);
    const [toast, setToast] = useState<{message: string; type: 'success' | 'error'} | null>(null);

    // WebSocket Refs
    const ws = useRef<WebSocket | null>(null);
    const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
    const currentUserIdRef = useRef<string | null>(null);

    // Ref для актуального user (избегаем stale closure в handleWebSocketMessage)
    const userRef = useRef(user);
    useEffect(() => { userRef.current = user; }, [user]);

    useEffect(() => {
        if (id && isAuthed) {
            loadInitialData();
            connectWebSocket();
        }

        return () => {
            if (ws.current) ws.current.close();
            if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
        };
    }, [id, isAuthed]);

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

            const currentUserId = matchData?.current_user_id;
            currentUserIdRef.current = currentUserId || null; // Store for WebSocket handler

            interface BackendMessage {
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

            // Helper to determine rarity based on price (Temporary frontend logic until Backend adds 'rarity' field)
            const getRarity = (price: number) => {
                if (price >= 500) return 'legendary';
                if (price >= 100) return 'rare';
                return 'common';
            };

            // Map backend gifts to UI Gift interface
            interface BackendGift {
                id: string;
                name: string;
                emoji?: string;
                price: number;
                category_id?: string;
            }

            interface BackendCategory {
                id: string;
                name: string;
            }

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
        // Use relative URL via Next.js proxy to avoid exposing backend
        const wsUrl = `${protocol}//${window.location.host}/api_proxy/chat/ws`;

        const socket = new WebSocket(wsUrl);

        socket.onopen = () => {
            // FIX (SEC-005): Send auth message immediately after connection
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
            reconnectTimeout.current = setTimeout(connectWebSocket, 3000);
        };

        socket.onerror = (err) => {
            // Silently handle - backend WS may not be running in dev
            // console.error('WS Error', err);
            socket.close();
        };

        // WebSocket connection for this chat (separate from global WebSocketService)
        ws.current = socket;
    };

    interface WebSocketMessageData {
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
    }

    const handleWebSocketMessage = (data: WebSocketMessageData) => {
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
                if (data.sender_id !== userRef.current?.id) {
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
            if (data.match_id === id && data.user_id === userRef.current?.id) {
                // Update user typing status in local state or ref
                // For now, simpler to just log or use a separate state if VIPChatSystem supports it
                // VIPChatSystem takes `user` prop which has `isTyping`. We need to update that.
                setUser(prev => prev ? { ...prev, isTyping: data.is_typing } : null);
            }
        } else if (data.type === 'online_status') {
            if (data.user_id === userRef.current?.id) {
                setUser(prev => prev ? { ...prev, isOnline: data.is_online } : null);
            }
        } else if (data.type === 'offer' && data.match_id === id) {
            // Incoming call
            setIncomingCall({
                callerId: data.caller_id,
                callerName: user?.name || "Unknown",
                type: data.call_type || "video"
            });
            setCallType(data.call_type || "video");
            setShowCall(true);
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
                content: text,
                is_ephemeral: ephemeralEnabled,
                ephemeral_seconds: ephemeralEnabled ? ephemeralSeconds : undefined
            }));
        } else {
            // Fallback to REST
            try {
                const sentMsg = await authService.sendMessage(id, text) as { id: string; created_at: string };
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
            const response = await authService.uploadChatMedia(file) as { url: string };
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
            const sentMsg = await authService.sendMessage(id, '', 'photo', imageUrl) as { id: string; created_at: string };

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
            setToast({message: "Не удалось отправить фото", type: 'error'});
        }
    };

    if (isChecking || loading) return (
        <div className="h-screen bg-black flex flex-col items-center justify-center text-white font-mono space-y-4">
            <div className="w-12 h-12 border-2 border-primary-red/30 border-t-primary-red rounded-full animate-spin" />
            <p className="text-primary-red animate-pulse">Установка защищенного соединения...</p>
        </div>
    );

    if (!user) return <div className="h-screen bg-black flex items-center justify-center text-white">Чат не найден</div>;

    return (
        <div className="absolute inset-0 flex flex-col bg-black overflow-hidden">
            <div className="sticky top-0 z-10 flex flex-col gap-2 p-2 bg-black/80 backdrop-blur-sm border-b border-white/5">
                <QuestionOfTheDayCard
                    matchId={id}
                    onBothAnswered={() => { /* No action needed after both answer */ }}
                />
                <div className="flex items-center gap-2">
                    {/* Call Buttons */}
                    <button
                        type="button"
                        onClick={() => {
                            setCallType("audio");
                            setIncomingCall(null);
                            setShowCall(true);
                        }}
                        className="p-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white/90 transition-colors"
                        title="Аудиозвонок"
                    >
                        <Phone className="w-4 h-4 text-green-400" />
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setCallType("video");
                            setIncomingCall(null);
                            setShowCall(true);
                        }}
                        className="p-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white/90 transition-colors"
                        title="Видеозвонок"
                    >
                        <Video className="w-4 h-4 text-blue-400" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowGifPicker(true)}
                        className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white/90 text-sm font-bold transition-colors"
                        title="Отправить GIF"
                    >
                        GIF
                    </button>
                    <EphemeralToggle
                        isEnabled={ephemeralEnabled}
                        seconds={ephemeralSeconds}
                        onToggle={setEphemeralEnabled}
                        onChangeSeconds={setEphemeralSeconds}
                    />
                    <ConversationPromptsButton
                        matchId={id}
                        onSelectPrompt={(text) => setInjectInputText(text)}
                    />
                    <button
                        type="button"
                        onClick={() => setShowIcebreakers(true)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white/90 text-sm transition-colors"
                        title="Идеи для разговора"
                    >
                        <Lightbulb className="w-4 h-4 text-amber-400" />
                        <span>Идеи</span>
                    </button>
                </div>
            </div>
            <VIPChatSystem
                user={user}
                messages={messages}
                isPremium={true}
                onSendMessage={handleSendMessage}
                onSendImage={handleSendImage}
                onSendSuperLike={() => setShowGiftPicker(true)}
                onReaction={handleReaction}
                onBack={() => router.back()}
                injectInputText={injectInputText}
                onConsumedInject={() => setInjectInputText('')}
            />
            <IcebreakersModal
                isOpen={showIcebreakers}
                onClose={() => setShowIcebreakers(false)}
                matchId={id}
                onSelectIcebreaker={(text) => {
                    setInjectInputText(text);
                    setShowIcebreakers(false);
                }}
            />

            <GiftPicker
                isOpen={showGiftPicker}
                gifts={gifts}
                onClose={() => setShowGiftPicker(false)}
                onSelectGift={async (gift: { id: string; name: string }) => {
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
                        setToast({message: "Недостаточно средств или ошибка отправки.", type: 'error'});
                    }
                }}
            />

            {/* Call Screen */}
            <CallScreen
                isOpen={showCall}
                matchId={id}
                callType={callType}
                callerName={user?.name || ""}
                callerPhoto={user?.photo || ""}
                isIncoming={!!incomingCall}
                ws={ws.current}
                currentUserId={currentUserIdRef.current || ""}
                remoteUserId={user?.id || ""}
                onClose={() => {
                    setShowCall(false);
                    setIncomingCall(null);
                }}
            />

            {/* GIF Picker */}
            <GifPicker
                isOpen={showGifPicker}
                onClose={() => setShowGifPicker(false)}
                onSelectGif={(gifUrl) => {
                    handleSendMessage(`[GIF] ${gifUrl}`);
                    setShowGifPicker(false);
                }}
            />
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
