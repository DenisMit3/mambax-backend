'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Sparkles } from 'lucide-react';
import { useHaptic } from '@/hooks/useHaptic';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { wsService } from '@/services/websocket';

const AUTO_DISMISS_MS = 5000;

interface BadgePayload {
  type: 'badge_earned';
  badge: string;
  title: string;
}

export function BadgeEarnedToast() {
  const [payload, setPayload] = useState<BadgePayload | null>(null);
  const haptic = useHaptic();
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const handler = (data: { type: string; [key: string]: unknown }) => {
      if (data.type !== 'badge_earned' || typeof data.badge !== 'string') return;
      haptic.heavy();
      setPayload({ type: 'badge_earned', badge: data.badge, title: (data.title as string) || data.badge });
    };
    wsService.on('badge_earned', handler);
    return () => {
      wsService.off('badge_earned', handler);
    };
  }, [haptic]);

  useEffect(() => {
    if (!payload) return;
    const t = setTimeout(() => setPayload(null), AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [payload]);

  return (
    <AnimatePresence>
      {payload && (
        <motion.div
          className="fixed top-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-[200] pointer-events-none"
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={prefersReducedMotion ? undefined : { opacity: 0, y: -24 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          <div className="rounded-2xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 shadow-lg backdrop-blur-xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/30 flex items-center justify-center shrink-0">
              <Award className="w-6 h-6 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-amber-200 font-semibold text-sm">Новое достижение!</p>
              <p className="text-white font-bold truncate">{payload.title}</p>
            </div>
            {!prefersReducedMotion && (
              <Sparkles className="w-5 h-5 text-amber-400/80 shrink-0" />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
