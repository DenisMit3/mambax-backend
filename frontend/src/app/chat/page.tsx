/* FIX (PERF-002): Using next/image for optimization */
'use client';

import { Search, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useDeferredValue } from 'react';
import { authService, Match, MatchMessage } from '@/services/api';
import { wsService } from '@/services/websocket';
import { motion } from 'framer-motion';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import { useSoundService } from '@/hooks/useSoundService';
import { useHaptic } from '@/hooks/useHaptic';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { FALLBACK_AVATAR } from '@/lib/constants';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { ErrorState } from '@/components/ui/ErrorState';

export default function ChatListPage() {
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const soundService = useSoundService();
    const haptic = useHaptic();
    const prefersReducedMotion = useReducedMotion();
    const { isAuthed, isChecking } = useRequireAuth();
    // FIX: Use deferred value to prevent UI blocking during search
    const deferredSearchQuery = useDeferredValue(searchQuery);

    const fetchMatches = async () => {
        try {
            setError(false);
            const data = await authService.getMatches();
            if (data && Array.isArray(data)) {
                setMatches(data);
            } else {
                setMatches([]);
            }
        } catch (err) {
            console.error('Matches error', err);
            setError(true);
            setMatches([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isAuthed) return;
        let cancelled = false;
        fetchMatches().then(() => {
            if (cancelled) return;
        });
        return () => { cancelled = true; };
    }, [isAuthed]);

    // Обновление last_message в реальном времени через WebSocket
    useEffect(() => {
        if (!isAuthed) return;

        const handleIncomingMessage = (data: Record<string, unknown>) => {
            const matchId = data.match_id as string;
            const text = (data.text || data.content) as string | undefined;
            const msgType = (data.type as string) || 'text';
            const createdAt = (data.created_at || data.timestamp) as string | undefined;
            const senderId = data.sender_id as string;

            let previewText = text;
            if (!previewText) {
                if (msgType === 'voice') previewText = '🎤 Голосовое сообщение';
                else if (msgType === 'photo') previewText = '📷 Фото';
                else previewText = 'Новое сообщение';
            }

            setMatches(prev => prev.map(m => {
                if (m.id === matchId) {
                    return {
                        ...m,
                        last_message: {
                            id: (data.id || data.message_id) as string,
                            text: previewText!,
                            type: msgType,
                            sender_id: senderId,
                            created_at: createdAt || new Date().toISOString(),
                        }
                    };
                }
                return m;
            }));
        };

        wsService.on('text', handleIncomingMessage);
        wsService.on('voice', handleIncomingMessage);
        wsService.on('photo', handleIncomingMessage);

        return () => {
            wsService.off('text', handleIncomingMessage);
            wsService.off('voice', handleIncomingMessage);
            wsService.off('photo', handleIncomingMessage);
        };
    }, [isAuthed]);

    const handleRefresh = async () => {
        haptic.medium();
        await fetchMatches();
        haptic.success();
        soundService.playSuccess();
    };

    // Filter out matches with null users and then search
    const validMatches = matches.filter(m => m.user != null);
    const filteredMatches = validMatches.filter(m =>
        m.user.name.toLowerCase().includes(deferredSearchQuery.toLowerCase())
    );

    return (
        <PullToRefresh onRefresh={handleRefresh}>
            <div className="min-h-full relative bg-transparent">
                {/* Loading skeleton */}
                {(isChecking || loading) && (
                    <div className="px-4 pt-20 space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-3 p-2">
                                <div className="w-[52px] h-[52px] rounded-full bg-white/5 animate-pulse flex-shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-24 bg-white/5 rounded animate-pulse" />
                                    <div className="h-3 w-40 bg-white/5 rounded animate-pulse" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Error state */}
                {!isChecking && !loading && error && (
                    <ErrorState onRetry={fetchMatches} />
                )}

                {/* Content */}
                {!isChecking && !loading && !error && (
                <>
                {/* STICKY: Header */}
                <div className="px-5 pt-6 pb-2 space-y-3 bg-[#0f0f11] border-b border-white/5 sticky top-0 z-30">
                    <div className="flex justify-between items-end">
                        <h1 className="text-xl font-black text-white tracking-wide">
                            ЧАТЫ
                        </h1>
                        <div className="bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                            <span className="text-[10px] font-bold text-slate-400">{filteredMatches.length} ПАР</span>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="w-3.5 h-3.5 text-slate-500 group-focus-within:text-white transition-colors" />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Поиск..."
                            inputMode="search"
                            autoComplete="off"
                            autoCapitalize="off"
                            enterKeyHint="search"
                            className="w-full bg-black/40 border border-white/5 rounded-xl py-2 pl-9 pr-3 text-white text-[13px] outline-none focus:border-white/20 focus:bg-white/5 transition-all placeholder:text-slate-600"
                        />
                    </div>
                </div>

                {/* STICKY: New Matches Reel */}
                {!searchQuery && (
                    <motion.div
                        className="px-4 py-2 space-y-1.5 bg-[#0f0f11] sticky top-[88px] z-20"
                        initial="hidden"
                        animate="visible"
                        variants={{
                            hidden: { opacity: 0 },
                            visible: {
                                opacity: 1,
                                transition: { staggerChildren: prefersReducedMotion ? 0 : 0.1 }
                            }
                        }}
                    >
                        <h3 className="text-[9px] font-bold text-slate-600 uppercase tracking-widest pl-1">
                            НОВЫЕ ПАРЫ
                        </h3>

                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
                            {matches.length === 0 && !loading && (
                                <div className="text-center w-full py-2 text-slate-600 text-[10px] font-medium">
                                    Нет новых
                                </div>
                            )}

                            {validMatches.map((m: Match) => (
                                <motion.div
                                    key={m.id}
                                    variants={{
                                        hidden: { opacity: 0, scale: 0.8 },
                                        visible: {
                                            opacity: 1,
                                            scale: 1,
                                            transition: prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 20 }
                                        }
                                    }}
                                    className="flex-shrink-0"
                                >
                                    <Link href={`/chat/${m.id}`} className="flex flex-col items-center space-y-1 group w-[64px]">
                                        <div className={`relative w-[56px] h-[56px] rounded-full p-0.5 ${m.user.is_premium ? 'bg-gradient-to-tr from-[#ff4b91] to-[#ff9e4a]' : 'bg-gradient-to-tr from-cyan-500 to-blue-500'} group-hover:scale-105 transition-transform duration-300`}>
                                            <div className="w-full h-full rounded-full overflow-hidden border-2 border-slate-950 relative">
                                                <Image
                                                    src={m.user.photos?.[0] || FALLBACK_AVATAR}
                                                    alt={m.user.name}
                                                    fill
                                                    sizes="56px"
                                                    className="object-cover"
                                                />
                                            </div>
                                            {/* Premium Badge */}
                                            {m.user.is_premium && (
                                                <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-0.5 shadow-lg border border-slate-900">
                                                    <div className="w-2.5 h-2.5 bg-yellow-400 flex items-center justify-center text-[8px] text-slate-900 font-black">★</div>
                                                </div>
                                            )}
                                            {/* Online Dot */}
                                            <div className="absolute bottom-0.5 right-0.5 w-[10px] h-[10px] bg-green-500 rounded-full border-2 border-slate-950" />
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400 truncate w-full text-center group-hover:text-white transition-colors">
                                            {m.user.name}
                                        </span>
                                    </Link>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Messages List */}
                <div className="px-4">
                    <motion.div
                        className="space-y-1"
                        initial="hidden"
                        animate="visible"
                        variants={{
                            hidden: { opacity: 0 },
                            visible: {
                                opacity: 1,
                                transition: { staggerChildren: prefersReducedMotion ? 0 : 0.05, delayChildren: prefersReducedMotion ? 0 : 0.2 }
                            }
                        }}
                    >
                        {!searchQuery && (
                            <h3 className="text-[9px] font-bold text-slate-600 uppercase tracking-widest pl-1 mb-1 pt-2">
                                СООБЩЕНИЯ
                            </h3>
                        )}

                        {filteredMatches.map((m: Match) => (
                            <motion.div
                                key={m.id}
                                variants={{
                                    hidden: { opacity: 0, y: 10 },
                                    visible: { opacity: 1, y: 0 }
                                }}
                            >
                                <Link href={`/chat/${m.id}`} className="flex items-center space-x-3 p-2 -mx-2 rounded-xl hover:bg-white/5 transition active:scale-[0.99] group">
                                    <div className="relative flex-shrink-0 w-[52px] h-[52px]">
                                        <Image
                                            src={m.user.photos?.[0] || FALLBACK_AVATAR}
                                            alt={m.user.name}
                                            fill
                                            sizes="52px"
                                            className="rounded-full object-cover"
                                        />
                                        {/* Online indicator on list item too? Optional */}
                                    </div>

                                    <div className="flex-1 min-w-0 border-b border-white/5 pb-3 group-hover:border-transparent transition-colors">
                                        <div className="flex justify-between items-baseline mb-0.5">
                                            <h4 className="text-white font-bold text-[15px] truncate pr-2">{m.user.name}</h4>
                                            <span className="text-[10px] font-medium text-slate-500 whitespace-nowrap">
                                                {m.last_message?.created_at
                                                    ? new Date(m.last_message.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
                                                    : ''}
                                            </span>
                                        </div>
                                        <p className="text-[13px] text-slate-400 truncate pr-4 leading-tight line-clamp-1">
                                            {m.last_message?.text || <span className="text-blue-400 font-medium opacity-80">Написать первое сообщение...</span>}
                                        </p>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}

                        {filteredMatches.length === 0 && !loading && (
                            <div className="flex flex-col items-center justify-center py-8 opacity-50 space-y-2">
                                <Search className="w-6 h-6 text-slate-600" />
                                <p className="text-slate-500 font-medium text-xs">Никого не найдено</p>
                            </div>
                        )}
                    </motion.div>
                </div>
                </>
                )}
            </div>
        </PullToRefresh>
    );
}
