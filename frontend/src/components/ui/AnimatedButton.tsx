'use client';

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useHaptic } from "@/hooks/useHaptic";
import { useSoundService } from "@/hooks/useSoundService";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { forwardRef } from "react";

// Extend Shadcn Button props, adding back custom props for compatibility if needed.
// Omit 'variant' and 'size' to redefine them with extended options if we want to be strict,
// or just use them as is and cast.
import { Loader2 } from "lucide-react";

interface AnimatedButtonProps extends Omit<React.ComponentProps<typeof Button>, 'variant' | 'size' | 'onAnimationStart' | 'onDragStart' | 'onDragEnd' | 'onDrag'> {
    // We keep these for backward compatibility
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'primary' | 'success' | 'danger';
    size?: 'default' | 'sm' | 'lg' | 'icon' | 'md';
    isLoading?: boolean;
    icon?: React.ReactNode;
    soundOnClick?: 'whoosh' | 'success' | 'tap' | null;
    hapticType?: 'light' | 'medium' | 'heavy' | 'success';
}

const MotionButton = motion(Button);

export const AnimatedButton = forwardRef<HTMLButtonElement, AnimatedButtonProps>(({
    children,
    onClick,
    variant = 'default',
    size = 'default',
    disabled = false,
    className,
    isLoading,
    icon,
    soundOnClick,
    hapticType = 'light',
    ...props
}, ref) => {
    const haptic = useHaptic();
    const soundService = useSoundService();
    const prefersReducedMotion = useReducedMotion();

    // Map legacy 'primary' to 'default' for base Shadcn styles, 
    // but we will override with custom classes below.
    const shadcnVariant = (variant === 'primary' || variant === 'success' || variant === 'danger') ? 'default' : variant;
    // Map legacy 'md' to 'default'
    const shadcnSize = size === 'md' ? 'default' : size;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (!disabled && !isLoading) {
            haptic[hapticType]();
            if (soundOnClick) soundService.play(soundOnClick);
            onClick?.(e);
        }
    };

    return (
        <MotionButton
            ref={ref}
            variant={shadcnVariant as React.ComponentProps<typeof Button>['variant']}
            size={shadcnSize as React.ComponentProps<typeof Button>['size']}
            disabled={disabled || isLoading}
            onClick={handleClick}
            className={cn(
                "relative overflow-hidden font-semibold transition-all duration-300 ease-out",
                // Custom styles for 'primary' to match original design
                (variant === 'primary' || variant === 'default') && "bg-gradient-to-r from-primary-red to-primary-orange text-white shadow-lg neon-glow hover:shadow-xl hover:brightness-110 border-0",
                (variant === 'success') && "bg-emerald-500 hover:bg-emerald-600 text-white border-0",
                (variant === 'danger') && "bg-red-500 hover:bg-red-600 text-white border-0",

                // Ensure rounded corners match original design if needed
                (size === 'lg') && "rounded-2xl px-8 py-4 text-lg",
                (size === 'md' || size === 'default') && "rounded-2xl px-6 py-3 text-base",
                (size === 'sm') && "rounded-xl px-4 py-2 text-sm",
                className
            )}
            variants={{
                initial: { scale: 1, y: 0 },
                hover: { scale: 1.02, y: -1 },
                tap: { scale: 0.98 }
            }}
            initial="initial"
            whileHover={(!disabled && !isLoading && !prefersReducedMotion) ? "hover" : undefined}
            whileTap={(!disabled && !isLoading && !prefersReducedMotion) ? "tap" : "initial"}
            transition={{ type: 'spring', stiffness: prefersReducedMotion ? 0 : 400, damping: 17 }}
            {...props}
        >
            <motion.div
                className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent pointer-events-none"
                variants={{
                    initial: { x: '-100%' },
                    hover: {
                        x: '100%',
                        transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
                    }
                }}
            />
            <span className="relative z-10 flex items-center justify-center gap-2">
                {isLoading && <Loader2 className="animate-spin w-4 h-4" />}
                {!isLoading && icon && <span className="mr-1">{icon}</span>}
                {children}
            </span>
        </MotionButton>
    );
});

AnimatedButton.displayName = "AnimatedButton";
