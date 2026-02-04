'use client';

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { forwardRef } from "react";

// Create a motion version of the Shadcn Card
const MotionCard = motion(Card);

interface GlassCardProps extends React.ComponentProps<typeof MotionCard> {
    children?: React.ReactNode;
    hover?: boolean;
    glow?: boolean;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(({
    children,
    className,
    hover = true,
    glow = false,
    ...props
}, ref) => {
    return (
        <MotionCard
            ref={ref}
            className={cn(
                // Base glass styles
                "glass-panel relative overflow-hidden",
                // Override Card default styles that might conflict or be unwanted
                "rounded-3xl border-0",
                // Glow effect
                glow && "shadow-[0_0_40px_rgba(255,45,85,0.3)] border-primary-red/50 ring-primary-red/30",
                className
            )}
            whileHover={hover ? {
                scale: 1.02,
                translateY: -4,
                boxShadow: glow
                    ? '0 0 60px rgba(255, 149, 0, 0.4)'
                    : '0 20px 60px rgba(0, 0, 0, 0.4)',
            } : undefined}
            transition={{
                type: 'spring',
                stiffness: 300,
                damping: 20
            }}
            {...props}
        >
            {/* Subtle Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

            <div className="relative z-10">{children}</div>
        </MotionCard>
    );
});

GlassCard.displayName = "GlassCard";
