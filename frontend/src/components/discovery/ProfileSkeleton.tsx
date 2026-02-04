'use client';

import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { GlassCard } from '@/components/ui/GlassCard';

export const ProfileSkeleton = () => {
    return (
        <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <GlassCard className="h-full w-full overflow-hidden">
                {/* Photo Skeleton */}
                <div className="relative h-2/3 overflow-hidden rounded-t-3xl">
                    <Skeleton className="h-full w-full" />

                    {/* Photo indicators */}
                    <div className="absolute top-4 left-4 right-4 flex space-x-1">
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-1 flex-1 rounded-full" />
                        ))}
                    </div>
                </div>

                {/* Info Skeleton */}
                <div className="h-1/3 p-6 space-y-3">
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-8 w-32" />
                        <Skeleton className="h-6 w-12" />
                    </div>
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-16 w-full" />
                </div>
            </GlassCard>
        </motion.div>
    );
};
