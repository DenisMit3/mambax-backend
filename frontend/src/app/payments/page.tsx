'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  CreditCard, ArrowLeft, Star, Gift, Crown,
  Check, Clock, XCircle
} from 'lucide-react';
import { authService } from '@/services/api';
import { useHaptic } from '@/hooks/useHaptic';

// Типы платежей
interface Payment {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  created_at: string;
}

// Табы фильтрации
const FILTER_TABS = [
  { key: 'all', label: 'Все' },
  { key: 'purchase', label: 'Покупки' },
  { key: 'subscription', label: 'Подписки' },
  { key: 'gift', label: 'Подарки' },
] as const;

type FilterKey = (typeof FILTER_TABS)[number]['key'];

// Иконка по типу платежа
function PaymentIcon({ type }: { type: string }) {
  const cls = 'w-5 h-5';
  switch (type) {
    case 'subscription': return <Crown className={`${cls} text-yellow-400`} />;
    case 'gift':         return <Gift className={`${cls} text-pink-400`} />;
    case 'purchase':     return <Star className={`${cls} text-purple-400`} />;
    default:             return <CreditCard className={`${cls} text-slate-400`} />;
  }
}

// Бейдж статуса
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { icon: React.ReactNode; label: string; cls: string }> = {
    success: { icon: <Check className="w-3 h-3" />, label: 'Успешно', cls: 'text-green-400 bg-green-400/10' },
    pending: { icon: <Clock className="w-3 h-3" />, label: 'В обработке', cls: 'text-yellow-400 bg-yellow-400/10' },
    failed:  { icon: <XCircle className="w-3 h-3" />, label: 'Ошибка', cls: 'text-red-400 bg-red-400/10' },
  };
  const s = map[status] || map.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
      {s.icon} {s.label}
    </span>
  );
}

// Форматирование даты
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// Ключ группировки по месяцу
function monthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}`;
}

function monthLabel(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
}

export default function PaymentsPage() {
  const router = useRouter();
  const haptic = useHaptic();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('all');

  useEffect(() => {
    (async () => {
      try {
        const data = await authService.getPaymentHistory();
        // Сортировка: новые сверху
        const sorted = (data.payments || []).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setPayments(sorted);
      } catch (e) {
        console.error('Не удалось загрузить историю платежей', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Фильтрация
  const filtered = useMemo(
    () => filter === 'all' ? payments : payments.filter(p => p.type === filter),
    [payments, filter]
  );

  // Группировка по месяцам
  const grouped = useMemo(() => {
    const map = new Map<string, Payment[]>();
    for (const p of filtered) {
      const key = monthKey(p.created_at);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return map;
  }, [filtered]);

  // Лоадер
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <motion.div
          className="w-10 h-10 border-2 border-purple-500 rounded-full border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Хедер */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-lg border-b border-white/5">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => { haptic.light(); router.back(); }}
            className="p-2 -ml-2 rounded-xl hover:bg-white/5 active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">История платежей</h1>
        </div>

        {/* Фильтры */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => { haptic.selection(); setFilter(tab.key); }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === tab.key
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : 'bg-slate-950 text-slate-400 border border-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Контент */}
      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center pt-32 px-6 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-slate-950 flex items-center justify-center mb-4">
            <CreditCard className="w-8 h-8 text-slate-600" />
          </div>
          <p className="text-slate-400 text-sm">Платежей пока нет</p>
        </motion.div>
      ) : (
        <div className="px-4 pt-4 space-y-6">
          <AnimatePresence mode="popLayout">
            {[...grouped.entries()].map(([key, items]) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
              >
                {/* Заголовок месяца */}
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 capitalize">
                  {monthLabel(items[0].created_at)}
                </p>

                <div className="space-y-2">
                  {items.map((p, i) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-slate-950 border border-white/5"
                    >
                      {/* Иконка */}
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                        <PaymentIcon type={p.type} />
                      </div>

                      {/* Описание + дата */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.description}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{formatDate(p.created_at)}</p>
                      </div>

                      {/* Сумма + статус */}
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold">
                          {p.amount} <span className="text-yellow-400">⭐</span>
                        </p>
                        <StatusBadge status={p.status} />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
