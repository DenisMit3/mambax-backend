'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { adminApi, TransactionListResponse } from '@/services/admin';
import { GlassCard } from '@/components/ui/GlassCard';
import { Toast } from '@/components/ui/Toast';

/** Таблица транзакций с возможностью возврата */
export function MonetizationTransactionsTable() {
  const [data, setData] = useState<TransactionListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ page: 1, size: 20 });
  const [refundId, setRefundId] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [toast, setToast] = useState<{message: string; type: 'success' | 'error'} | null>(null);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.monetization.getTransactions(filters);
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    let cancelled = false;
    fetchTransactions().then(() => {
      if (cancelled) return;
    });
    return () => { cancelled = true; };
  }, [fetchTransactions]);

  const handleRefund = async () => {
    if (!refundId) return;
    try {
      await adminApi.monetization.refundTransaction(refundId, refundReason || "Admin Refund");
      setToast({message: "Возвращено!", type: 'success'});
      setRefundId(null);
      fetchTransactions();
    } catch (e) {
      setToast({message: "Ошибка возврата: " + e, type: 'error'});
    }
  };

  return (
    <GlassCard className="mt-6 p-6 overflow-hidden">
      <h3 className="text-lg font-semibold text-[var(--admin-text-primary)] mb-4">Транзакции</h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left border-b border-[var(--admin-glass-border)] text-[var(--admin-text-muted)] text-sm">
              <th className="p-3 font-medium">Дата</th>
              <th className="p-3 font-medium">Пользователь</th>
              <th className="p-3 font-medium">Сумма</th>
              <th className="p-3 font-medium">Тип</th>
              <th className="p-3 font-medium">Статус</th>
              <th className="p-3 font-medium">Действие</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map(tx => (
              <tr key={tx.id} className="border-b border-[var(--admin-glass-border)] text-sm text-[var(--admin-text-secondary)] hover:bg-slate-800/30">
                <td className="p-3">{new Date(tx.created_at).toLocaleDateString()}</td>
                <td className="p-3">{tx.user_id.substring(0, 8)}...</td>
                <td className="p-3 font-medium text-neon-green">{tx.amount} {tx.currency}</td>
                <td className="p-3">{tx.metadata?.transaction_type || 'Неизвестно'}</td>
                <td className="p-3">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${tx.status === 'completed' ? 'bg-neon-green/20 text-neon-green' :
                      tx.status === 'refunded' ? 'bg-primary-red/20 text-primary-red' :
                        'bg-slate-500/20 text-slate-400'
                      }`}
                  >
                    {tx.status}
                  </span>
                </td>
                <td className="p-3">
                  {tx.status === 'completed' && (
                    <button
                      onClick={() => { setRefundId(tx.id); setRefundReason("Requested by User"); }}
                      className="px-2 py-1 rounded text-xs font-medium bg-primary-red/10 text-primary-red hover:bg-primary-red/20 transition-colors"
                    >
                      Возврат
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Модалка возврата */}
      {refundId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
          <GlassCard className="w-full max-w-md p-6 bg-[#1e293b] border-slate-700">
            <h3 className="text-lg font-bold text-white mb-3">Возврат транзакции</h3>
            <p className="text-sm text-slate-400 mb-2">Причина возврата:</p>
            <input
              value={refundReason}
              onChange={e => setRefundReason(e.target.value)}
              className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white mb-4 focus:border-blue-500 outline-none transition-colors"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setRefundId(null)}
                className="px-4 py-2 rounded-lg border border-slate-700 text-white hover:bg-slate-800 transition-colors text-sm font-medium"
              >
                Отмена
              </button>
              <button
                onClick={handleRefund}
                className="px-4 py-2 rounded-lg bg-primary-red text-white hover:bg-primary-red/90 transition-colors text-sm font-medium border border-transparent"
              >
                Подтвердить возврат
              </button>
            </div>
          </GlassCard>
        </div>
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </GlassCard>
  );
}
