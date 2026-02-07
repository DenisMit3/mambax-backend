'use client';

import { motion } from 'framer-motion';
import { MessageCircle, Target, Calendar } from 'lucide-react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { GlassCard } from '@/components/ui/GlassCard';

const BADGE_CONFIG: Record<string, { icon: React.ReactNode; title: string; desc: string }> = {
  conversationalist: {
    icon: <MessageCircle className="w-6 h-6 text-cyan-400" />,
    title: 'Conversationalist',
    desc: '10 активных диалогов',
  },
  icebreaker_master: {
    icon: <Target className="w-6 h-6 text-amber-400" />,
    title: 'Icebreaker Master',
    desc: '5 использований icebreakers',
  },
  daily_questioner: {
    icon: <Calendar className="w-6 h-6 text-emerald-400" />,
    title: 'Daily Questioner',
    desc: '7 ответов на QOTD',
  },
};

interface Achievement {
  badge: string;
  earned_at: string;
  level: number;
}

interface BadgesSectionProps {
  achievements?: Achievement[] | null;
  className?: string;
}

export function BadgesSection({ achievements = [], className = '' }: BadgesSectionProps) {
  const prefersReducedMotion = useReducedMotion();
  const list = Array.isArray(achievements) ? achievements : [];

  if (list.length === 0) return null;

  return (
    <div className={`mb-6 ${className}`}>
      <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider mb-3">Достижения</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {list.map((entry, index) => {
          const config = BADGE_CONFIG[entry.badge] ?? {
            icon: <MessageCircle className="w-6 h-6 text-white/60" />,
            title: entry.badge,
            desc: '',
          };
          return (
            <motion.div
              key={entry.badge}
              initial={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.08 }}
            >
              <GlassCard className="p-4 flex items-center gap-3 hover:bg-white/5 transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
                  {config.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{config.title}</p>
                  {config.desc && (
                    <p className="text-white/50 text-xs truncate">{config.desc}</p>
                  )}
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
