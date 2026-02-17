'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MatchHub } from '@/components/activity/MatchHub';
import { authService } from '@/services/api';
import { FALLBACK_AVATAR } from '@/lib/constants';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { ErrorState } from '@/components/ui/ErrorState';

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
    const { isAuthed, isChecking } = useRequireAuth();
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

    const [chats] = useState<UIChat[]>([]);

    const { data: matchesRaw = [], isLoading: matchesLoading, error: matchesError, refetch: loadData } = useQuery({
        queryKey: ['activity', 'matches'],
        queryFn: async () => {
            const matchesData = await authService.getMatches();
            return (matchesData as BackendMatch[]).map((m: BackendMatch) => ({
                id: m.id,
                user: {
                    id: m.user.id,
                    name: m.user.name,
                    photo: m.user.photos?.[0] || FALLBACK_AVATAR,
                    age: m.user.age
                },
                matchedAt: new Date(m.created_at),
                isNew: (Date.now() - new Date(m.created_at).getTime()) < 1000 * 60 * 60 * 24
            }));
        },
        staleTime: 30000,
        enabled: isAuthed,
    });
    const matches = matchesRaw as UIMatch[];
    const error = !!matchesError;
    const loading = matchesLoading;

    // Загрузка статуса подписки через единый cache key
    const { data: meData } = useQuery({
        queryKey: ['user', 'me'],
        queryFn: () => authService.getMe(),
        staleTime: 5 * 60 * 1000,
        enabled: isAuthed,
    });
    const isPremium = meData?.subscription_tier !== 'free';

    if (isChecking || loading) {
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

    if (error) {
        return <ErrorState onRetry={loadData} />;
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
