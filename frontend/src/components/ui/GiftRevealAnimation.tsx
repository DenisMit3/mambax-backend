"use client";

import { useEffect, useRef } from "react";
import Image from 'next/image';
import { X, Sparkles, Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface GiftRevealAnimationProps {
    isOpen: boolean;
    giftName: string;
    giftImage?: string;
    giftEmoji?: string;
    senderName?: string;
    message?: string;
    onClose: () => void;
}

export function GiftRevealAnimation({
    isOpen,
    giftName,
    giftImage,
    giftEmoji = "🎁",
    senderName,
    message,
    onClose
}: GiftRevealAnimationProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const prefersReducedMotion = useReducedMotion();

    useEffect(() => {
        if (!isOpen) return;
        if (prefersReducedMotion) return; // Disable confetti for reduced motion

        // Confetti animation
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        interface Particle {
            x: number;
            y: number;
            vx: number;
            vy: number;
            color: string;
            size: number;
            rotation: number;
            rotationSpeed: number;
        }

        const particles: Particle[] = [];
        const colors = ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#FF69B4"];

        for (let i = 0; i < 150; i++) {
            particles.push({
                x: canvas.width / 2,
                y: canvas.height / 2,
                vx: (Math.random() - 0.5) * 20,
                vy: (Math.random() - 0.5) * 20 - 10,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: Math.random() * 10 + 5,
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 10
            });
        }

        let animationId: number;
        const gravity = 0.3;

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach((p) => {
                p.vy += gravity;
                p.x += p.vx;
                p.y += p.vy;
                p.rotation += p.rotationSpeed;
                p.vx *= 0.99;

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size / 2);
                ctx.restore();
            });

            const activeParticles = particles.filter(p => p.y < canvas.height + 50);
            if (activeParticles.length > 0) {
                animationId = requestAnimationFrame(animate);
            }
        };

        animate();

        try {
            audioRef.current = new Audio("/sounds/celebration.mp3");
            audioRef.current.volume = 0.3;
            audioRef.current.play().catch(() => { /* Audio autoplay may be blocked by browser policy */ });
        } catch { /* Audio autoplay may be blocked by browser */ }

        return () => {
            if (animationId) cancelAnimationFrame(animationId);
            if (audioRef.current) audioRef.current.pause();
        };
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-xl">
                    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

                    {/* Close Button */}
                    <motion.button
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0 }}
                        onClick={onClose}
                        className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-50 overflow-hidden group"
                    >
                        <X size={24} className="text-white group-hover:rotate-90 transition-transform duration-300" />
                    </motion.button>

                    {/* Content */}
                    <div className="relative z-10 flex flex-col items-center gap-8 max-w-sm px-6 text-center">
                        {/* Pulse Ring */}
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", damping: 15, stiffness: 100 }}
                            className="relative"
                        >
                            <motion.div
                                animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="absolute inset-0 rounded-full bg-pink-500 blur-3xl opacity-30"
                            />

                            <div className="w-40 h-40 rounded-full bg-gradient-to-br from-neon-pink to-neon-purple flex items-center justify-center shadow-[0_0_60px_rgba(236,72,153,0.4)] border border-white/20 overflow-hidden">
                                {giftImage ? (
                                    <Image
                                        src={giftImage.startsWith("http") ? giftImage : `/api_proxy${giftImage}`}
                                        alt={giftName}
                                        className="w-24 h-24 object-contain drop-shadow-2xl"
                                        width={96}
                                        height={96}
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = "none";
                                        }}
                                    />
                                ) : (
                                    <span className="text-7xl drop-shadow-2xl">{giftEmoji}</span>
                                )}
                            </div>

                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                className="absolute -top-4 -right-4"
                            >
                                <Sparkles size={32} className="text-amber-400 fill-amber-400" />
                            </motion.div>
                        </motion.div>

                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            <h1 className="text-3xl font-black text-white mb-2 leading-tight">
                                Вам прислали подарок! 🎉
                            </h1>

                            <div className="inline-block px-6 py-2 rounded-full bg-pink-500/20 border border-pink-500/40 mt-2">
                                <span className="text-pink-400 text-xl font-black uppercase tracking-wider">
                                    {giftName}
                                </span>
                            </div>
                        </motion.div>

                        {senderName && (
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="text-slate-400 font-bold uppercase tracking-widest text-sm"
                            >
                                От <span className="text-amber-400">{senderName}</span>
                            </motion.p>
                        )}

                        {message && (
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="p-6 rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 shadow-inner relative"
                            >
                                <Heart size={16} className="absolute -top-2 -left-2 text-pink-500 fill-pink-500 rotate-[-15deg]" />
                                <p className="text-white text-lg font-medium italic leading-relaxed">
                                    &ldquo;{message}&rdquo;
                                </p>
                            </motion.div>
                        )}

                        <motion.button
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.6 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onClose}
                            className="mt-4 px-10 py-4 rounded-2xl bg-gradient-to-r from-neon-pink to-neon-purple text-white text-lg font-black shadow-[0_8px_30px_rgba(236,72,153,0.4)] hover:shadow-neon-pink/60 transition-shadow uppercase tracking-widest"
                        >
                            Спасибо! 💝
                        </motion.button>
                    </div>
                </div>
            )}
        </AnimatePresence>
    );
}
