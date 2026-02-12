'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    RefreshCw,
    DollarSign,
    Clock,
    CheckCircle,
    XCircle,
    Calendar,
    MessageSquare,
    ChevronRight,
    Search,
    AlertTriangle,
    Loader2,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { adminApi } from '@/services/adminApi';
import styles from '../../admin.module.css';

// Интерфейс запроса на возврат (snake_case от API)
interface RefundRequest {
    id: string;
    transaction_id: string;
    user_id: string;
    user_name: string;
    user_email: string;
    amount: number;
    reason: string;
    status: 'pending' | 'approved' | 'rejected' | 'processed';
    plan: string;
    original_purchase_date: string;
    request_date: string;
    days_since_purchase: number;
    reviewed_at?: string;
    admin_notes?: string;
}

// Статистика возвратов от API
interface RefundStatsData {
    pending: number;
    approved_month: number;
    rejected_month: number;
    total_refunded: number;
    refund_rate: number;
    avg_processing_days: number;
}

// === Компонент статистики ===
function RefundStats({ stats, loading }: { stats: RefundStatsData | null; loading: boolean }) {
    const items = stats
        ? [
            { label: 'Pending', value: stats.pending, icon: <Clock size={18} />, color: '#f97316' },
            { label: 'Approved (Month)', value: stats.approved_month, icon: <CheckCircle size={18} />, color: '#10b981' },
            { label: 'Rejected (Month)', value: stats.rejected_month, icon: <XCircle size={18} />, color: '#ef4444' },
            { label: 'Total Refunded', value: `$${stats.total_refunded >= 1000 ? (stats.total_refunded / 1000).toFixed(1) + 'K' : stats.total_refunded}`, icon: <DollarSign size={18} />, color: '#3b82f6' },
            { label: 'Refund Rate', value: `${stats.refund_rate}%`, icon: <RefreshCw size={18} />, color: '#a855f7' },
            { label: 'Avg Processing', value: `${stats.avg_processing_days} days`, icon: <Calendar size={18} />, color: '#10b981' },
        ]
        : [];

    // Скелетон при загрузке
    if (loading) {
        return (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
                {Array.from({ length: 6 }).map((_, i) => (
                    <GlassCard key={i} className="p-4 flex items-center gap-3" hover={false}>
                        <div className="w-[42px] h-[42px] rounded-xl bg-slate-700/30 animate-pulse" />
                        <div className="flex flex-col gap-2">
                            <div className="w-12 h-5 bg-slate-700/30 rounded animate-pulse" />
                            <div className="w-16 h-3 bg-slate-700/30 rounded animate-pulse" />
                        </div>
                    </GlassCard>
                ))}
            </div>
        );
    }

    if (!stats) return null;

    return (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
            {items.map((stat, index) => (
                <GlassCard key={stat.label} className="p-4 flex items-center gap-3" hover={false}>
                    <motion.div
                        className="w-[42px] h-[42px] rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${stat.color}20`, color: stat.color }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                    >
                        {stat.icon}
                    </motion.div>
                    <div className="flex flex-col">
                        <span className="text-xl font-bold text-[var(--admin-text-primary)]">{stat.value}</span>
                        <span className="text-[11px] text-[var(--admin-text-muted)]">{stat.label}</span>
                    </div>
                </GlassCard>
            ))}
        </div>
    );
}

// === Карточка возврата ===
function RefundCard({ refund, onAction, actionLoading }: {
    refund: RefundRequest;
    onAction: (id: string, action: 'approve' | 'reject') => void;
    actionLoading: string | null;
}) {
    const [showDetails, setShowDetails] = useState(false);

    const statusConfig = {
        pending: { bg: 'bg-orange-500/15', text: 'text-orange-500', border: 'border-l-orange-500', icon: <Clock size={12} /> },
        approved: { bg: 'bg-emerald-500/15', text: 'text-emerald-500', border: 'border-l-emerald-500', icon: <CheckCircle size={12} /> },
        rejected: { bg: 'bg-red-500/15', text: 'text-red-500', border: 'border-l-red-500', icon: <XCircle size={12} /> },
        processed: { bg: 'bg-blue-500/15', text: 'text-blue-500', border: 'border-l-blue-500', icon: <CheckCircle size={12} /> },
    };

    const planConfig: Record<string, string> = {
        gold: 'bg-amber-500/15 text-amber-500',
        platinum: 'bg-purple-500/15 text-purple-500',
    };

    const getEligibility = () => {
        if (refund.days_since_purchase <= 7) return { label: 'Full Refund Eligible', cls: 'text-emerald-500' };
        if (refund.days_since_purchase <= 30) return { label: 'Partial Refund Eligible', cls: 'text-amber-500' };
        return { label: 'Outside Refund Window', cls: 'text-red-500' };
    };

    const eligibility = getEligibility();
    const sc = statusConfig[refund.status];
    const isProcessing = actionLoading === refund.id;

    return (
        <motion.div
            className={`bg-[rgba(15,23,42,0.65)] backdrop-blur-[20px] border border-slate-400/20 rounded-2xl overflow-hidden mb-3 transition-all hover:border-slate-400/40 border-l-[3px] ${sc.border}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
        >
            {/* Основная строка */}
            <div
                className="flex items-center gap-5 px-5 py-4 cursor-pointer"
                onClick={() => setShowDetails(!showDetails)}
            >
                {/* Аватар + имя */}
                <div className="flex items-center gap-3 min-w-[200px]">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-600 rounded-[10px] flex items-center justify-center text-base font-semibold text-white">
                        {refund.user_name.charAt(0)}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold text-[var(--admin-text-primary)]">{refund.user_name}</span>
                        <span className="text-xs text-slate-500">{refund.user_email}</span>
                    </div>
                </div>

                {/* Сумма + план */}
                <div className="flex flex-col items-end min-w-[100px]">
                    <span className="text-lg font-bold text-[var(--admin-text-primary)]">${refund.amount.toFixed(2)}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-[10px] uppercase ${planConfig[refund.plan] || 'bg-slate-700/30 text-slate-400'}`}>
                        {refund.plan}
                    </span>
                </div>

                {/* Мета */}
                <div className="flex-1 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Calendar size={14} />
                        <span>{refund.days_since_purchase} days ago</span>
                    </div>
                    <span className={`text-[11px] font-semibold ${eligibility.cls}`}>
                        {eligibility.label}
                    </span>
                </div>

                {/* Статус */}
                <span className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full capitalize ${sc.bg} ${sc.text}`}>
                    {sc.icon}
                    {refund.status}
                </span>

                {/* Стрелка раскрытия */}
                <ChevronRight
                    size={18}
                    className={`text-slate-500 transition-transform duration-200 ${showDetails ? 'rotate-90' : ''}`}
                />
            </div>

            {/* Детали (раскрываемая секция) */}
            {showDetails && (
                <motion.div
                    className="px-5 pb-5 border-t border-slate-400/10"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                >
                    {/* Сетка деталей */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
                        <div className="flex flex-col">
                            <span className="text-[11px] text-slate-500 mb-1">Transaction ID</span>
                            <span className="text-[13px] font-medium text-[var(--admin-text-primary)]">{refund.transaction_id}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[11px] text-slate-500 mb-1">Purchase Date</span>
                            <span className="text-[13px] font-medium text-[var(--admin-text-primary)]">
                                {new Date(refund.original_purchase_date).toLocaleDateString()}
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[11px] text-slate-500 mb-1">Request Date</span>
                            <span className="text-[13px] font-medium text-[var(--admin-text-primary)]">
                                {new Date(refund.request_date).toLocaleDateString()}
                            </span>
                        </div>
                        {refund.reviewed_at && (
                            <div className="flex flex-col">
                                <span className="text-[11px] text-slate-500 mb-1">Reviewed At</span>
                                <span className="text-[13px] font-medium text-[var(--admin-text-primary)]">
                                    {new Date(refund.reviewed_at).toLocaleDateString()}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Причина */}
                    <div className="p-3 bg-slate-800/40 rounded-[10px] mb-3">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-2">
                            <MessageSquare size={14} /> Reason
                        </span>
                        <p className="text-[13px] text-[var(--admin-text-primary)] leading-relaxed m-0">{refund.reason}</p>
                    </div>

                    {/* Заметки админа */}
                    {refund.admin_notes && (
                        <div className="p-3 bg-orange-500/10 rounded-[10px] mb-3">
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-2">Admin Notes</span>
                            <p className="text-[13px] text-[var(--admin-text-primary)] leading-relaxed m-0">{refund.admin_notes}</p>
                        </div>
                    )}

                    {/* Кнопки действий */}
                    {refund.status === 'pending' && (
                        <div className="flex gap-3 pt-3">
                            <button
                                className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-[10px] text-sm font-semibold cursor-pointer transition-all bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={(e) => { e.stopPropagation(); onAction(refund.id, 'approve'); }}
                                disabled={isProcessing}
                            >
                                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                Approve Refund
                            </button>
                            <button
                                className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-[10px] text-sm font-semibold cursor-pointer transition-all bg-red-500/15 border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={(e) => { e.stopPropagation(); onAction(refund.id, 'reject'); }}
                                disabled={isProcessing}
                            >
                                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                                Reject
                            </button>
                        </div>
                    )}
                </motion.div>
            )}
        </motion.div>
    );
}

// === Скелетон списка ===
function RefundListSkeleton() {
    return (
        <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
                <div
                    key={i}
                    className="bg-[rgba(15,23,42,0.65)] border border-slate-400/20 rounded-2xl p-5 flex items-center gap-5"
                >
                    <div className="w-10 h-10 rounded-[10px] bg-slate-700/30 animate-pulse" />
                    <div className="flex flex-col gap-2 flex-1">
                        <div className="w-32 h-4 bg-slate-700/30 rounded animate-pulse" />
                        <div className="w-48 h-3 bg-slate-700/30 rounded animate-pulse" />
                    </div>
                    <div className="w-16 h-5 bg-slate-700/30 rounded animate-pulse" />
                    <div className="w-20 h-6 bg-slate-700/30 rounded-full animate-pulse" />
                </div>
            ))}
        </div>
    );
}

// === Главная страница ===
export default function RefundsPage() {
    const [refunds, setRefunds] = useState<RefundRequest[]>([]);
    const [stats, setStats] = useState<RefundStatsData | null>(null);
    const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Загрузка данных с API
    const fetchRefunds = useCallback(async () => {
        try {
            setError(null);
            setLoading(true);
            const data = await adminApi.monetization.refunds.list(
                filter !== 'all' ? filter : undefined
            );
            setRefunds(data.refunds ?? []);
            setStats(data.stats ?? null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Не удалось загрузить данные о возвратах');
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => {
        fetchRefunds();
    }, [fetchRefunds]);

    // Обработка approve/reject
    const handleAction = async (id: string, action: 'approve' | 'reject') => {
        try {
            setActionLoading(id);
            await adminApi.monetization.refunds.action(id, action);
            // Перезагружаем список после действия
            await fetchRefunds();
        } catch (err) {
            console.error('Refund action failed:', err);
        } finally {
            setActionLoading(null);
        }
    };

    // Фильтрация по поиску (клиентская)
    const filteredRefunds = refunds.filter(r => {
        if (!search) return true;
        const q = search.toLowerCase();
        return r.user_name.toLowerCase().includes(q) || r.user_email.toLowerCase().includes(q);
    });

    return (
        <div className={styles.pageContainer}>
            {/* Заголовок */}
            <div className={styles.headerSection}>
                <div className={styles.headerContent}>
                    <h1 className={styles.headerTitle}>Refund Processing</h1>
                    <p className={styles.headerDescription}>Review and process refund requests</p>
                </div>
            </div>

            {/* Статистика */}
            <RefundStats stats={stats} loading={loading} />

            {/* Фильтры + поиск */}
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <div className="flex gap-2">
                    {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
                        <button
                            key={f}
                            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-[10px] text-[13px] cursor-pointer transition-all duration-200 border ${
                                filter === f
                                    ? 'bg-purple-500/20 border-purple-500/40 text-purple-400'
                                    : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-800'
                            }`}
                            onClick={() => setFilter(f)}
                        >
                            {f === 'pending' && <Clock size={14} />}
                            {f === 'approved' && <CheckCircle size={14} />}
                            {f === 'rejected' && <XCircle size={14} />}
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-[10px] min-w-[300px]">
                    <Search size={16} className="text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="flex-1 bg-transparent border-none outline-none text-[var(--admin-text-primary)] text-sm placeholder:text-slate-500"
                    />
                </div>
            </div>

            {/* Состояние ошибки */}
            {error && (
                <div className={styles.errorContainer}>
                    <AlertTriangle size={48} className={styles.errorIcon} />
                    <h3 className={styles.errorTitle}>Ошибка загрузки</h3>
                    <p className={styles.errorMessage}>{error}</p>
                    <button className={styles.retryButton} onClick={fetchRefunds}>
                        <RefreshCw size={16} />
                        Повторить
                    </button>
                </div>
            )}

            {/* Скелетон загрузки */}
            {loading && !error && <RefundListSkeleton />}

            {/* Список возвратов */}
            {!loading && !error && (
                <div className="flex flex-col">
                    {filteredRefunds.map((refund) => (
                        <RefundCard
                            key={refund.id}
                            refund={refund}
                            onAction={handleAction}
                            actionLoading={actionLoading}
                        />
                    ))}

                    {filteredRefunds.length === 0 && (
                        <div className="text-center py-16 text-slate-500">
                            <CheckCircle size={48} className="mx-auto mb-4 opacity-50" />
                            <h3 className="text-xl font-semibold text-[var(--admin-text-primary)] mb-2">All caught up!</h3>
                            <p>No refund requests matching your filters</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
