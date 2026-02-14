'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X } from 'lucide-react';
import { useHaptic } from '@/hooks/useHaptic';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { authService } from '@/services/api';

interface ConversationPromptsButtonProps {
  matchId: string;
  onSelectPrompt: (text: string) => void;
  className?: string;
}

export function ConversationPromptsButton({
  matchId,
  onSelectPrompt,
  className = '',
}: ConversationPromptsButtonProps) {
  const [prompts, setPrompts] = useState<string[]>([]);
  const [stalled, setStalled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const haptic = useHaptic();
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!matchId) return;
    setLoading(true);
    authService
      .getConversationPrompts(matchId)
      .then((res) => {
        setStalled(res.stalled ?? false);
        setPrompts(res.prompts ?? []);
      })
      .catch(() => {
        setStalled(false);
        setPrompts([]);
      })
      .finally(() => setLoading(false));
  }, [matchId]);

  if (!stalled || prompts.length === 0) return null;

  return (
    <>
      <motion.button
        type="button"
        onClick={() => {
          haptic.medium();
          setOpen(true);
        }}
        className={`relative flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white/90 text-sm transition-colors ${className}`}
        whileTap={{ scale: 0.98 }}
      >
        <MessageSquare className="w-4 h-4 text-amber-400" />
        <span>Идеи для разговора</span>
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-primary-red text-xs font-semibold text-white">
          {prompts.length}
        </span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
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
                    <MessageSquare className="w-5 h-5 text-amber-400" />
                    Продолжи разговор
                  </h2>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                    aria-label="Закрыть"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <ul className="space-y-3">
                  {prompts.map((text, index) => (
                    <motion.li
                      key={text || index}
                      initial={prefersReducedMotion ? undefined : { opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          haptic.medium();
                          onSelectPrompt(text);
                          setOpen(false);
                        }}
                        className="w-full text-left p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-red/50"
                      >
                        <span className="text-white/90 text-sm leading-relaxed">{text}</span>
                      </button>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
