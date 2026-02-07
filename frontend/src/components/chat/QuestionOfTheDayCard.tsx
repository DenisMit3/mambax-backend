'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, Send, Sparkles } from 'lucide-react';
import { useHaptic } from '@/hooks/useHaptic';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { GlassCard } from '@/components/ui/GlassCard';
import { authService } from '@/services/api';

interface QuestionOfTheDayCardProps {
  matchId: string;
  onBothAnswered?: () => void;
  className?: string;
}

export function QuestionOfTheDayCard({
  matchId,
  onBothAnswered,
  className = '',
}: QuestionOfTheDayCardProps) {
  const [question, setQuestion] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [partnerAnswered, setPartnerAnswered] = useState(false);
  const [bothAnswered, setBothAnswered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const haptic = useHaptic();
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    authService
      .getQuestionOfDay()
      .then((res) => {
        setQuestion(res.question ?? '');
        setDate(res.date ?? '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async () => {
    if (!answer.trim() || sending) return;
    setSending(true);
    haptic.medium();
    try {
      const res = await authService.postQuestionOfDayAnswer(matchId, answer.trim());
      setSubmitted(true);
      setPartnerAnswered(res.partner_answered ?? false);
      if (res.partner_answered) {
        setBothAnswered(true);
        onBothAnswered?.();
      }
    } catch {
      setSending(false);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    if (!token) return;
    
    // FIX: Use getWsUrl() for consistent WebSocket URL across the app
    // This ensures it works both with Next.js proxy and direct API connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || window.location.host;
    const cleanHost = apiUrl.replace('http://', '').replace('https://', '');
    // FIX (SEC-005): Token is now sent via first message, not in URL
    const wsUrl = `${protocol}//${cleanHost}/chat/ws`;
    const socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      // FIX (SEC-005): Send auth message immediately after connection
      socket.send(JSON.stringify({ type: 'auth', token }));
    };
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'qotd_both_answered' && data.match_id === matchId) {
          setBothAnswered(true);
          haptic.heavy();
          onBothAnswered?.();
        }
      } catch {
        // ignore
      }
    };
    return () => socket.close();
  }, [matchId, onBothAnswered, haptic]);

  if (loading || !question) return null;

  return (
    <AnimatePresence>
      {!collapsed && (
        <motion.div
          className={`sticky top-0 z-10 ${className}`}
          initial={prefersReducedMotion ? undefined : { opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={prefersReducedMotion ? undefined : { opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
      <GlassCard className="p-4 mb-2">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-red/20 flex items-center justify-center shrink-0">
            <HelpCircle className="w-5 h-5 text-primary-red" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white/50 mb-1">Вопрос дня {date}</p>
            <p className="text-white font-medium text-sm leading-relaxed mb-3">{question}</p>
            {!submitted ? (
              <>
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Ваш ответ..."
                  className="w-full min-h-[72px] px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-red/50"
                  rows={3}
                  disabled={sending}
                />
                <motion.button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!answer.trim() || sending}
                  className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-red/80 hover:bg-primary-red text-white text-sm font-medium disabled:opacity-50 disabled:pointer-events-none transition-colors"
                  whileTap={{ scale: 0.98 }}
                >
                  <Send className="w-4 h-4" />
                  {sending ? 'Отправка...' : 'Ответить'}
                </motion.button>
              </>
            ) : (
              <AnimatePresence>
                {bothAnswered && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 p-3 rounded-xl bg-primary-red/10 border border-primary-red/30 text-primary-red text-sm"
                  >
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span>Вы оба ответили! Сравните ответы 👀</span>
                  </motion.div>
                )}
                {submitted && !bothAnswered && (
                  <p className="text-white/60 text-sm">Ответ сохранён. Ждём ответ партнёра.</p>
                )}
                {submitted && (
                  <button
                    type="button"
                    onClick={() => setCollapsed(true)}
                    className="mt-2 text-xs text-white/50 hover:text-white/80 transition-colors"
                  >
                    Скрыть
                  </button>
                )}
              </AnimatePresence>
            )}
          </div>
        </div>
      </GlassCard>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
