'use client';

/**
 * Компактная карточка "Вопрос дня" — показывается НАД полем ввода.
 * Максимум 2 строки, кнопка закрыть (X), кнопка ответить.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, X, ChevronRight } from 'lucide-react';
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
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    // Проверяем, был ли уже закрыт сегодня
    const dismissedDate = localStorage.getItem(`qotd_dismissed_${matchId}`);
    const today = new Date().toISOString().split('T')[0];
    if (dismissedDate === today) {
      setDismissed(true);
      setLoading(false);
      return;
    }

    authService
      .getQuestionOfDay()
      .then((res) => {
        setQuestion(res.question ?? '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [matchId]);

  const handleDismiss = () => {
    setDismissed(true);
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem(`qotd_dismissed_${matchId}`, today);
  };

  const handleSubmit = async () => {
    if (!answer.trim() || sending) return;
    setSending(true);
    try {
      const res = await authService.postQuestionOfDayAnswer(matchId, answer.trim());
      setSubmitted(true);
      if (res.partner_answered) {
        onBothAnswered?.();
      }
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  // Не показываем если загрузка, нет вопроса или закрыто
  if (loading || !question || dismissed || submitted) return null;

  return (
    <AnimatePresence>
      <motion.div
        className={`shrink-0 ${className}`}
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="mx-2 mb-1 bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          {/* Компактная строка — вопрос + кнопки */}
          <div className="flex items-center gap-2 px-3 py-2">
            <HelpCircle className="w-4 h-4 text-primary-red shrink-0" />
            <p className="flex-1 text-white/80 text-xs leading-tight line-clamp-2 min-w-0">
              {question}
            </p>
            {!expanded && (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="shrink-0 text-primary-red"
                title="Ответить"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={handleDismiss}
              className="shrink-0 text-white/30 hover:text-white/60 transition-colors"
              title="Скрыть"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Раскрытая форма ответа */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-3 pb-2 flex gap-2">
                  <input
                    type="text"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSubmit();
                      }
                    }}
                    placeholder="Ваш ответ..."
                    autoCapitalize="sentences"
                    className="flex-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 text-xs focus:outline-none focus:ring-1 focus:ring-primary-red/50"
                    disabled={sending}
                  />
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!answer.trim() || sending}
                    className="px-3 py-1.5 rounded-lg bg-primary-red/80 hover:bg-primary-red text-white text-xs font-medium disabled:opacity-40 transition-colors shrink-0"
                  >
                    {sending ? '...' : 'Отправить'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
