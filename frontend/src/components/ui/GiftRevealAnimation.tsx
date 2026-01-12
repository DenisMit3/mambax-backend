"use client";

import { useEffect, useRef } from "react";
import { X, Sparkles } from "lucide-react";

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

    useEffect(() => {
        if (!isOpen) return;

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

        // Create particles
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

            // Remove particles that have fallen off screen
            const activeParticles = particles.filter(p => p.y < canvas.height + 50);
            if (activeParticles.length > 0) {
                animationId = requestAnimationFrame(animate);
            }
        };

        animate();

        // Try to play celebration sound
        try {
            audioRef.current = new Audio("/sounds/celebration.mp3");
            audioRef.current.volume = 0.3;
            audioRef.current.play().catch(() => {
                // Silently fail if audio can't play
            });
        } catch {
            // No audio available
        }

        return () => {
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
            if (audioRef.current) {
                audioRef.current.pause();
            }
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(10px)"
        }}>
            {/* Confetti Canvas */}
            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    pointerEvents: "none"
                }}
            />

            {/* Close Button */}
            <button
                onClick={onClose}
                style={{
                    position: "absolute",
                    top: "20px",
                    right: "20px",
                    width: "44px",
                    height: "44px",
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.1)",
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    zIndex: 10
                }}
            >
                <X size={24} color="white" />
            </button>

            {/* Gift Content */}
            <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "24px",
                animation: "giftReveal 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
                zIndex: 5
            }}>
                {/* Sparkles */}
                <div style={{
                    position: "absolute",
                    top: "20%",
                    display: "flex",
                    gap: "20px"
                }}>
                    <Sparkles size={32} color="#FFD700" style={{ animation: "sparkle 1s ease-in-out infinite" }} />
                    <Sparkles size={24} color="#FF69B4" style={{ animation: "sparkle 1s ease-in-out infinite 0.3s" }} />
                    <Sparkles size={32} color="#4ECDC4" style={{ animation: "sparkle 1s ease-in-out infinite 0.6s" }} />
                </div>

                {/* Gift Icon/Image */}
                <div style={{
                    width: "160px",
                    height: "160px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #ec4899, #a855f7)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 0 60px rgba(236, 72, 153, 0.5), 0 0 120px rgba(168, 85, 247, 0.3)",
                    animation: "pulse 2s ease-in-out infinite"
                }}>
                    {giftImage ? (
                        <img
                            src={giftImage.startsWith("http") ? giftImage : `/api_proxy${giftImage}`}
                            alt={giftName}
                            style={{ width: "100px", height: "100px", objectFit: "contain" }}
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                            }}
                        />
                    ) : (
                        <span style={{ fontSize: "80px" }}>{giftEmoji}</span>
                    )}
                </div>

                {/* Title */}
                <h1 style={{
                    margin: 0,
                    fontSize: "32px",
                    fontWeight: 800,
                    color: "white",
                    textAlign: "center",
                    textShadow: "0 2px 10px rgba(0,0,0,0.5)"
                }}>
                    You received a gift! 🎉
                </h1>

                {/* Gift Name */}
                <div style={{
                    padding: "12px 32px",
                    borderRadius: "50px",
                    background: "linear-gradient(135deg, rgba(236, 72, 153, 0.2), rgba(168, 85, 247, 0.2))",
                    border: "1px solid rgba(236, 72, 153, 0.4)"
                }}>
                    <span style={{
                        fontSize: "20px",
                        fontWeight: 700,
                        color: "#ec4899"
                    }}>
                        {giftName}
                    </span>
                </div>

                {/* Sender */}
                {senderName && (
                    <p style={{
                        margin: 0,
                        fontSize: "16px",
                        color: "rgba(255,255,255,0.7)"
                    }}>
                        From <span style={{ color: "#FFD700", fontWeight: 600 }}>{senderName}</span>
                    </p>
                )}

                {/* Message */}
                {message && (
                    <div style={{
                        maxWidth: "300px",
                        padding: "16px 24px",
                        borderRadius: "16px",
                        background: "rgba(255,255,255,0.1)",
                        backdropFilter: "blur(10px)"
                    }}>
                        <p style={{
                            margin: 0,
                            fontSize: "16px",
                            color: "white",
                            textAlign: "center",
                            fontStyle: "italic"
                        }}>
                            &ldquo;{message}&rdquo;
                        </p>
                    </div>
                )}

                {/* Thank You Button */}
                <button
                    onClick={onClose}
                    style={{
                        marginTop: "16px",
                        padding: "16px 48px",
                        borderRadius: "50px",
                        border: "none",
                        background: "linear-gradient(135deg, #ec4899, #a855f7)",
                        color: "white",
                        fontSize: "18px",
                        fontWeight: 700,
                        cursor: "pointer",
                        boxShadow: "0 8px 30px rgba(236, 72, 153, 0.4)"
                    }}
                >
                    Thank You! 💝
                </button>
            </div>

            {/* Inline CSS for animations */}
            <style jsx global>{`
                @keyframes giftReveal {
                    0% {
                        opacity: 0;
                        transform: scale(0.3) translateY(50px);
                    }
                    100% {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }

                @keyframes pulse {
                    0%, 100% {
                        transform: scale(1);
                        box-shadow: 0 0 60px rgba(236, 72, 153, 0.5);
                    }
                    50% {
                        transform: scale(1.05);
                        box-shadow: 0 0 80px rgba(236, 72, 153, 0.7);
                    }
                }

                @keyframes sparkle {
                    0%, 100% {
                        opacity: 1;
                        transform: scale(1);
                    }
                    50% {
                        opacity: 0.5;
                        transform: scale(1.2);
                    }
                }
            `}</style>
        </div>
    );
}
