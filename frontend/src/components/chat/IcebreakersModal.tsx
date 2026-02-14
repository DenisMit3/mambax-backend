'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw, MessageCircle } from 'lucide-react';
import { useHaptic } from '@/hooks/useHaptic';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { GlassCard } from '@/components/ui/GlassCard';
import { authService } from '@/services/api';

interface IcebreakersModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchId: string;
  onSelectIcebreaker: (text: string) => void;
}

export function IcebreakersModal({
  isOpen,
  onClose,
  matchId,
  onSelectIcebreaker,
}: IcebreakersModalProps) {
  const [icebreakers, setIcebreakers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const haptic = useHaptic();
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (isOpen && matchId) {
      setLoading(true);
      authService
        .getIcebreakers(matchId)
        .then((res) => {
          setIcebreakers(res.icebreakers || []);
        })
      .catch((e) => { console.warn('Silent catch:', e); setIcebreakers([]); })
        .finally(() => setLoading(false));
    }
  }, [isOpen, matchId]);

  const handleRefresh = () => {
    setLoading(true);
    authService
      .getIcebreakers(matchId, true)
      .then((res) => setIcebreakers(res.icebreakers || []))
      .catch((e) => console.warn('Operation failed:', e))
      .finally(() => setLoading(false));
  };

  const handleSelect = (text: string) => {
    haptic.medium();
    authService.recordIcebreakerUsed(matchId).catch((e) => console.warn('Operation failed:', e));
    onSelectIcebreaker(text);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden bg-zinc-900/95 border border-white/10 shadow-2xl"
            initial={prefersReducedMotion ? undefined : { y: '100%' }}
            animate={prefersReducedMotion ? undefined : { y: 0 }}
            exit={prefersReducedMotion ? undefined : { y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 pb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-primary-red" />
                  Начни диалог 💬
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Закрыть"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-16 rounded-2xl bg-white/5 animate-pulse"
                      style={{ animationDuration: '1.2s' }}
                    />
                  ))}
                </div>
              ) : (
                <ul className="space-y-3">
                  {icebreakers.map((text, index) => (
                    <motion.li
                      key={text || index}
                      initial={prefersReducedMotion ? undefined : { opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelect(text)}
                        className="w-full text-left p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-red/50"
                      >
                        <span className="text-white/90 text-sm leading-relaxed">{text}</span>
                      </button>
                    </motion.li>
                  ))}
                </ul>
              )}

              {!loading && icebreakers.length > 0 && (
                <motion.button
                  type="button"
                  onClick={handleRefresh}
                  className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 text-white/70 hover:text-white text-sm transition-colors"
                  initial={prefersReducedMotion ? undefined : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <RefreshCw className="w-4 h-4" />
                  Обновить
                </motion.button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
