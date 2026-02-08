/* FIX (PERF-002): Using next/image for optimization */
"use client";

import { motion, useMotionValue, useTransform, useAnimation, PanInfo } from "framer-motion";
import { Gift, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface SwipeCardProps {
    name: string;
    age: number;
    bio: string;
    image: string;
    onSwipe: (direction: "left" | "right") => void;
    onGiftClick?: () => void;
    onProfileClick?: () => void;
    compatibilityScore?: number;
    commonInterests?: string[];
    /** PERF: Only set true for the first visible card when absolutely necessary */
    isHero?: boolean;
}

export function SwipeCard({
    name,
    age,
    bio,
    image,
    onSwipe,
    onGiftClick,
    onProfileClick,
    compatibilityScore,
    commonInterests,
    isHero = false
}: SwipeCardProps) {
    const x = useMotionValue(0);
    const controls = useAnimation();

    // Rotation based on X drag
    const rotate = useTransform(x, [-200, 200], [-15, 15]);

    // Opacity of "Like" / "Nope" stamps
    const opacityLike = useTransform(x, [20, 150], [0, 1]);
    const opacityNope = useTransform(x, [-20, -150], [0, 1]);

    const handleDragEnd = async (_: unknown, info: PanInfo) => {
        const offset = info.offset.x;
        const velocity = info.velocity.x;

        if (offset > 100 || velocity > 500) {
            await controls.start({ x: 500, opacity: 0, transition: { duration: 0.2 } });
            onSwipe("right");
        } else if (offset < -100 || velocity < -500) {
            await controls.start({ x: -500, opacity: 0, transition: { duration: 0.2 } });
            onSwipe("left");
        } else {
            controls.start({ x: 0 });
        }
    };

    return (
        <motion.div
            className={cn(
                "absolute top-0 w-full h-full max-w-[480px] max-h-full cursor-grab active:cursor-grabbing rounded-3xl overflow-hidden shadow-2xl",
                "glass-panel neon-glow"
            )}
            style={{ x, rotate }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            animate={controls}
            onDragEnd={handleDragEnd}
        >
            {/* Background Image */}
            <div className="relative w-full h-full">
                <Image
                    src={image}
                    alt={name}
                    fill
                    sizes="(max-width: 768px) 100vw, 400px"
                    className="object-cover pointer-events-none"
                    priority={isHero}
                    loading={isHero ? undefined : "lazy"}
                />

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent pointer-events-none" />

                {/* Stamps */}
                <motion.div
                    style={{ opacity: opacityLike }}
                    className="absolute top-10 left-10 border-4 border-emerald-500 text-emerald-500 px-5 py-1 rounded-xl text-3xl font-black rotate-[-20deg] pointer-events-none z-20"
                >
                    LIKE
                </motion.div>

                <motion.div
                    style={{ opacity: opacityNope }}
                    className="absolute top-10 right-10 border-4 border-rose-500 text-rose-500 px-5 py-1 rounded-xl text-3xl font-black rotate-[20deg] pointer-events-none z-20"
                >
                    NOPE
                </motion.div>

                {/* Gift Button */}
                {onGiftClick && (
                    <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                            e.stopPropagation();
                            onGiftClick();
                        }}
                        className="absolute top-5 right-5 w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 shadow-lg shadow-pink-500/40 border-none flex items-center justify-center cursor-pointer z-30 transition-transform active:scale-90"
                    >
                        <Gift size={24} className="text-white" />
                    </button>
                )}

                {/* Info Content - Click to View Profile */}
                <div
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onProfileClick) onProfileClick();
                    }}
                    className="absolute bottom-0 left-0 right-0 p-6 pt-10 text-left cursor-pointer z-10 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <h2 className="text-3xl font-bold text-white drop-shadow-md">
                            {name}, {age}
                        </h2>
                        <div className="bg-blue-500 rounded-full p-0.5 flex items-center justify-center">
                            <Check size={12} className="text-white font-bold" strokeWidth={4} />
                        </div>
                    </div>

                    {compatibilityScore && (
                        <div className="flex items-center gap-2 mt-2">
                            <div className="bg-green-500/20 px-3 py-1 rounded-full">
                                <span className="text-green-400 text-xs font-black">
                                    {Math.round(compatibilityScore)}% совместимость
                                </span>
                            </div>
                        </div>
                    )}

                    {commonInterests && commonInterests.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                            {commonInterests.map((interest) => (
                                <span
                                    key={interest}
                                    className="bg-pink-500/20 text-pink-300 px-3 py-1 rounded-full text-[10px] font-bold"
                                >
                                    ✨ {interest}
                                </span>
                            ))}
                        </div>
                    )}

                    <p className="text-slate-300 text-sm line-clamp-2 drop-shadow-sm font-medium">
                        {bio}
                    </p>

                    <div className="mt-4 flex gap-2">
                        {/* Optional tags can go here */}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
