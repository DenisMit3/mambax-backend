'use client';

import React, { useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useMotionValue } from 'framer-motion';
import { Rocket } from 'lucide-react';

interface PullToRefreshProps {
    onRefresh: () => Promise<void>;
    children: React.ReactNode;
}

export const PullToRefresh = ({ onRefresh, children }: PullToRefreshProps) => {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const pullThreshold = 80;

    const y = useMotionValue(0);
    const rocketScale = useTransform(y, [0, pullThreshold], [0.5, 1.2]);
    const rocketOpacity = useTransform(y, [0, pullThreshold], [0, 1]);
    const rocketRotate = useTransform(y, [0, pullThreshold], [-45, 0]);

    const handleDragEnd = async () => {
        if (y.get() >= pullThreshold) {
            setIsRefreshing(true);
            await onRefresh();
            setIsRefreshing(false);
        }
        y.set(0);
    };

    return (
        <div className="relative w-full h-full overflow-hidden">
            <motion.div
                className="absolute top-0 left-0 right-0 flex flex-col items-center justify-center py-4"
                style={{
                    opacity: rocketOpacity,
                    scale: rocketScale,
                    translateY: useTransform(y, [0, pullThreshold], [-20, 0])
                }}
            >
                <motion.div
                    animate={isRefreshing ? {
                        y: [-2, -20, -2],
                        transition: { duration: 0.5, repeat: Infinity }
                    } : {}}
                    style={{ rotate: rocketRotate }}
                >
                    <Rocket className="text-blue-500 w-8 h-8 fill-blue-500/20" />
                </motion.div>
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mt-2">
                    {isRefreshing ? 'Launching...' : 'Pull to Launch'}
                </p>
            </motion.div>

            <motion.div
                className="h-full w-full"
                drag="y"
                dragConstraints={{ top: 0, bottom: pullThreshold + 20 }}
                dragElastic={0.4}
                style={{ y }}
                onDragEnd={handleDragEnd}
            >
                {children}
            </motion.div>
        </div>
    );
};
