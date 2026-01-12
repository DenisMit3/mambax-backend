/* eslint-disable @next/next/no-img-element */
"use client";

import { motion, useMotionValue, useTransform, useAnimation, PanInfo } from "framer-motion";
import { Gift } from "lucide-react";

interface SwipeCardProps {
    name: string;
    age: number;
    bio: string;
    image: string;
    onSwipe: (direction: "left" | "right") => void;
    onGiftClick?: () => void;
}

export function SwipeCard({ name, age, bio, image, onSwipe, onGiftClick, onProfileClick }: SwipeCardProps & { onProfileClick?: () => void }) {
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
            style={{
                x,
                rotate,
                position: 'absolute',
                top: 0,
                width: '100%',
                height: '100%',
                maxWidth: '480px', // Match mobile constraint
                maxHeight: '100%',
                cursor: 'grab',
                background: 'var(--surface)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            animate={controls}
            onDragEnd={handleDragEnd}
            whileTap={{ cursor: 'grabbing' }}
        >
            {/* Background Image */}
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <img
                    src={image}
                    alt={name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
                />

                {/* Gradient Overlay */}
                <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '50%',
                    background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)',
                    pointerEvents: 'none'
                }} />

                {/* Stamps */}
                <motion.div style={{ opacity: opacityLike, position: 'absolute', top: 40, left: 40, border: '4px solid #4CAF50', color: '#4CAF50', padding: '5px 20px', borderRadius: '8px', fontSize: '32px', fontWeight: 900, transform: 'rotate(-20deg)' }}>
                    LIKE
                </motion.div>

                <motion.div style={{ opacity: opacityNope, position: 'absolute', top: 40, right: 40, border: '4px solid #FF4D6D', color: '#FF4D6D', padding: '5px 20px', borderRadius: '8px', fontSize: '32px', fontWeight: 900, transform: 'rotate(20deg)' }}>
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
                        style={{
                            position: 'absolute',
                            top: '20px',
                            right: '20px',
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #ec4899, #a855f7)',
                            boxShadow: '0 4px 12px rgba(236, 72, 153, 0.4)',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            zIndex: 10
                        }}
                    >
                        <Gift size={24} color="white" />
                    </button>
                )}

                {/* Info Content - Click to View Profile */}
                <div
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onProfileClick) onProfileClick();
                    }}
                    style={{
                        position: 'absolute',
                        bottom: 30,
                        left: 20,
                        right: 20,
                        textAlign: 'left',
                        cursor: 'pointer',
                        zIndex: 5
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                        <h2 style={{ fontSize: '32px', fontWeight: 800, textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                            {name}, {age}
                        </h2>
                        {/* Verified Badge */}
                        <span style={{ background: '#3b82f6', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>✓</span>
                    </div>

                    <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {/* Tags removed for MVP simplicity or can be passed as prop later */}
                    </div>

                    <p style={{ marginTop: '15px', fontSize: '16px', lineHeight: '1.4', fontWeight: 400 }}>
                        {bio}
                    </p>
                </div>
            </div>
        </motion.div>
    );
}
