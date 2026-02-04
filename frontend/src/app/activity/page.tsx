'use client';

import { useState, useEffect } from 'react';
import { MatchHub } from '@/components/activity/MatchHub';
import { authService } from '@/services/api';
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
    const [matches, setMatches] = useState<any[]>([]);
    const [chats, setChats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPremium, setIsPremium] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const matchesData = await authService.getMatches();

            // Map backend data to UI format
            const uiMatches = (matchesData as any[]).map((m: BackendMatch) => ({
                id: m.id,
                user: {
                    id: m.user.id,
                    name: m.user.name,
                    photo: m.user.photos?.[0] || '/api/placeholder/150/200',
                    age: m.user.age || 25 // Default if not provided
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
            onInstantMatch={(userId: string) => console.log('Instant match:', userId)}
            onUpgradeToPremium={() => setIsPremium(true)}
        />
    );
}
