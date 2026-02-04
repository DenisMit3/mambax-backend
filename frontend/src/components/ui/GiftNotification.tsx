"use client";

import { useEffect } from "react";
import { X, Sparkles, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface GiftNotificationProps {
    data: {
        gift_name: string;
        sender_name: string;
        image_url?: string;
        gift_image?: string;
        message?: string;
        bonus_received?: number;
    } | null;
    onClose: () => void;
}

export function GiftNotification({ data, onClose }: GiftNotificationProps) {
    const router = useRouter();

    useEffect(() => {
        if (data) {
            const timer = setTimeout(() => {
                onClose();
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [data, onClose]);

    return (
        <AnimatePresence>
            {data && (
                <motion.div
                    initial={{ y: -100, x: "-50%", opacity: 0 }}
                    animate={{ y: 0, x: "-50%", opacity: 1 }}
                    exit={{ y: -100, x: "-50%", opacity: 0 }}
                    transition={{ type: "spring", damping: 20, stiffness: 300 }}
                    onClick={() => router.push("/gifts")}
                    className={cn(
                        "fixed top-6 left-1/2 -translate-x-1/2 z-[9999] min-w-[320px] max-w-[90%] cursor-pointer group"
                    )}
                >
                    <div className={cn(
                        "p-4 rounded-2xl flex items-center gap-4 shadow-[0_20px_40px_rgba(0,0,0,0.3)] hover:border-pink-500/50 transition-colors",
                        // Use manual glass styles here as they are specific (border-pink-500/30)
                        "bg-slate-900/80 backdrop-blur-xl border border-neon-pink/30"
                    )}>
                        <div className="relative">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-pink to-neon-purple flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                {data?.gift_image ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img src={data.gift_image} alt="Gift" className="w-4/5 h-4/5 object-contain" />
                                ) : <Sparkles size={20} className="text-white" />}
                            </div>
                            {data?.bonus_received && data.bonus_received > 0 && (
                                <div className="absolute -bottom-1 -right-1 bg-amber-400 rounded-full w-5 h-5 flex items-center justify-center border-2 border-slate-900">
                                    <Star size={10} className="text-slate-900 fill-slate-900" />
                                </div>
                            )}
                        </div>

                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <h4 className="text-white font-black text-sm uppercase tracking-wider">
                                    Gift Received!
                                </h4>
                                {data?.bonus_received && data.bonus_received > 0 && (
                                    <span className="text-emerald-400 text-[10px] font-black uppercase bg-emerald-400/10 px-1.5 py-0.5 rounded border border-emerald-400/20">
                                        +{data.bonus_received} ⭐
                                    </span>
                                )}
                            </div>
                            <p className="text-slate-400 text-xs font-bold leading-tight mt-1">
                                <span className="text-neon-pink">{data?.sender_name}</span> sent you a <span className="text-slate-200">{data?.gift_name}</span>
                            </p>
                        </div>

                        <button
                            onClick={(e) => { e.stopPropagation(); onClose(); }}
                            className="p-2 rounded-full hover:bg-white/5 text-slate-500 hover:text-white transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>
                    {/* Progress bar timer */}
                    <motion.div
                        initial={{ scaleX: 1 }}
                        animate={{ scaleX: 0 }}
                        transition={{ duration: 5, ease: "linear" }}
                        className="absolute bottom-0 left-4 right-4 h-0.5 bg-neon-pink/30 origin-left"
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
}
