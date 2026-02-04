'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, CheckCircle, Ban, AlertTriangle, UserX } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import adminApi, { ModerationQueueItem } from '@/services/adminApi';
import { cn } from '@/lib/utils';
import { useTelegram } from '@/lib/telegram';

const ItemSkeleton = () => (
    <div className="h-24 bg-slate-800/50 rounded-xl animate-pulse mb-3" />
);

export const ModerationTerminal = () => {
    const { hapticFeedback } = useTelegram();
    const queryClient = useQueryClient();

    // Fetch Queue
    const { data, isLoading, isError } = useQuery<{ items: ModerationQueueItem[] }>({
        queryKey: ['admin', 'moderation'],
        queryFn: async () => {
            try {
                const res = await adminApi.moderation.getQueue();
                return (res && (res as any).items) ? res : { items: [] };
            } catch (e) {
                console.error("Moderation queue fetch failed:", e);
                return { items: [] };
            }
        },
        staleTime: 5000
    });

    const items = data?.items || [];
    const hasItems = items.length > 0;

    // Actions
    const reviewMutation = useMutation({
        mutationFn: ({ id, action }: { id: string, action: 'approve' | 'reject' }) =>
            adminApi.moderation.review(id, action),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'moderation'] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'metrics'] }); // Update counts too
            hapticFeedback.notificationOccurred('success');
        },
        onError: () => {
            hapticFeedback.notificationOccurred('error');
        }
    });

    const handleAction = (id: string, action: 'ban' | 'approve') => {
        // Optimistic UI updates could be added here, but invalidate is safer for consistency
        reviewMutation.mutate({
            id,
            action: action === 'ban' ? 'reject' : 'approve'
        });
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map(i => <ItemSkeleton key={i} />)}
            </div>
        );
    }

    if (isError) {
        return (
            <div className="p-8 text-center text-red-400 bg-red-500/10 rounded-2xl border border-red-500/20">
                <ShieldAlert className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>System Error: Could not load safety queue.</p>
            </div>
        );
    }

    if (!hasItems) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center space-y-4 bg-slate-800/30 rounded-2xl border border-slate-700/30 border-dashed">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-emerald-500" />
                </div>
                <div>
                    <h3 className="text-xl font-semibold text-slate-100">All Clear!</h3>
                    <p className="text-slate-400">No content requires moderation right now.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-2 px-2">
                <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
                    Pending Review ({items.length})
                </h3>
            </div>

            <AnimatePresence mode="popLayout">
                {items.map((item) => (
                    <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, x: -100 }}
                        transition={{ duration: 0.2 }}
                    >
                        <GlassCard className="p-4 border-l-4 border-l-amber-500 overflow-hidden">
                            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                                <div className="flex items-start gap-4">
                                    {/* Thumbnail */}
                                    <div className="relative w-16 h-16 rounded-lg bg-slate-800 overflow-hidden flex-shrink-0">
                                        {item.content_type === 'image' || item.content_type === 'photo' ? (
                                            <img src={item.content} alt="Review" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-500">
                                                <AlertTriangle size={20} />
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-500 uppercase">
                                                {item.reason || 'SENSITIVE'}
                                            </span>
                                            <span className="text-xs text-slate-500">
                                                {new Date(item.created_at).toLocaleTimeString()}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-200 line-clamp-2">
                                            User ID: <span className="font-mono text-slate-400">{item.user_id.slice(0, 8)}...</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-2 w-full sm:w-auto">
                                    <AnimatedButton
                                        variant="danger"
                                        size="sm"
                                        className="flex-1 sm:flex-none justify-center"
                                        onClick={() => handleAction(item.id, 'ban')}
                                        disabled={reviewMutation.isPending}
                                    >
                                        <Ban size={16} className="mr-2" />
                                        Ban
                                    </AnimatedButton>
                                    <AnimatedButton
                                        variant="success"
                                        size="sm"
                                        className="flex-1 sm:flex-none justify-center"
                                        onClick={() => handleAction(item.id, 'approve')}
                                        disabled={reviewMutation.isPending}
                                    >
                                        <CheckCircle size={16} className="mr-2" />
                                        Approve
                                    </AnimatedButton>
                                </div>
                            </div>
                        </GlassCard>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};
