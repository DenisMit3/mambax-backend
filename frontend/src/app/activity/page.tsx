'use client';

import { useState, useEffect } from 'react';
import { MatchHub } from '@/components/activity/MatchHub';
import { authService } from '@/services/api';
import { FALLBACK_AVATAR } from '@/lib/constants';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface BackendMatch {
    id: string;
    created_at: string;
    user: {
        id: string;
        name: string;
        photos: string[];
        is_online: boolean;
        age?: number;
    };
}

export default function ActivityPage() {
    const router = useRouter();
    interface UIMatch {
        id: string;
        user: { id: string; name: string; photo: string; age: number };
        matchedAt: Date;
        isNew: boolean;
    }

    interface UIChat {
        id: string;
        user: { id: string; name: string; photo: string };
        lastMessage?: string;
        timestamp?: Date;
    }

    const [matches, setMatches] = useState<UIMatch[]>([]);
    const [chats, setChats] = useState<UIChat[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPremium, setIsPremium] = useState(false);

    useEffect(() => {
        loadData();
        // Загрузка статуса подписки
        authService.getMe().then(me => {
            setIsPremium(me.subscription_tier !== 'free');
        }).catch((e) => console.warn('Silent catch:', e));
    }, []);

    const loadData = async () => {
        try {
            const matchesData = await authService.getMatches();

            // Map backend data to UI format
            const uiMatches = (matchesData as BackendMatch[]).map((m: BackendMatch) => ({
                id: m.id,
                user: {
                    id: m.user.id,
                    name: m.user.name,
                    photo: m.user.photos?.[0] || FALLBACK_AVATAR,
                    age: m.user.age
                },
                matchedAt: new Date(m.created_at),
                isNew: (Date.now() - new Date(m.created_at).getTime()) < 1000 * 60 * 60 * 24 // New if < 24h
            }));

            setMatches(uiMatches);

            // For chats, we'd normally fetch last messages. 
            // For now, let's treat matches with messages as chats.
            // Since we don't have last_message in /matches, we'll show empty placeholder chats or fetch history
            // In a real production app, the backend should return this in one call.
            setChats([]);

        } catch (error) {
            console.error('Failed to load activity data', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-black">
                <motion.div
                    className="w-10 h-10 border-2 border-primary-red rounded-full border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
            </div>
        );
    }

    return (
        <MatchHub
            matches={matches}
            chats={chats}
            likedUsers={[]}
            isPremium={isPremium}
            onMatchClick={(id: string) => router.push(`/chat/${id}`)}
            onChatClick={(id: string) => router.push(`/chat/${id}`)}
            onInstantMatch={async (userId: string) => {
                try {
                    const result = await authService.startChat(userId);
                    router.push(`/chat/${result.match_id}`);
                } catch (e) {
                    console.error('Failed to start instant match chat', e);
                }
            }}
            onUpgradeToPremium={() => router.push('/profile/premium')}
        />
    );
}
