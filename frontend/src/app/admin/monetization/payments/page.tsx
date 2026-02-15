'use client';

import {
    CreditCard, CheckCircle, XCircle, AlertTriangle,
    RefreshCw, Activity, DollarSign, Zap, Server, ShieldCheck,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import styles from '../../admin.module.css';
import { usePaymentsPage } from './usePaymentsPage';
import type { Gateway, FailedPayment, OverallStatsData } from './usePaymentsPage';

function Skeleton({ className = '' }: { className?: string }) {
    return <div className={`animate-pulse bg-slate-700/30 rounded-lg ${className}`} />;
}

function OverallStats({ stats, loading }: { stats: OverallStatsData | null; loading: boolean }) {
    if (loading || !stats) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
                {Array.from({ length: 6 }).map((_, i) => (
                    <GlassCard key={i} className="p-4 flex flex-col gap-3">
                        <Skeleton className="w-10 h-10 rounded-xl" />
                        <div><Skeleton className="h-6 w-16 mb-2" /><Skeleton className="h-3 w-24" /></div>
                    </GlassCard>
                ))}
            </div>
        );
    }
    const allOnline = stats.success_rate > 90;
    const items = [
        { label: 'Всего транзакций', value: stats.total_transactions >= 1000 ? `${(stats.total_transactions / 1000).toFixed(2)}K` : stats.total_transactions.toString(), icon: <CreditCard size={18} />, color: '#3b82f6' },
        { label: 'Успешность', value: `${stats.success_rate.toFixed(1)}%`, icon: <CheckCircle size={18} />, color: '#10b981' },
        { label: 'Общий объём', value: `$${stats.total_volume >= 1000 ? `${(stats.total_volume / 1000).toFixed(1)}K` : stats.total_volume.toFixed(0)}`, icon: <DollarSign size={18} />, color: '#a855f7' },
        { label: 'Неудачные платежи', value: stats.failed_count.toString(), icon: <XCircle size={18} />, color: '#ef4444' },
        { label: 'Среднее время', value: `${Math.round(stats.avg_response_ms)}мс`, icon: <Zap size={18} />, color: '#f59e0b' },
        { label: 'Все системы', value: allOnline ? 'Онлайн' : 'Проблемы', icon: <Server size={18} />, color: allOnline ? '#10b981' : '#f59e0b' },
    ];
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
            {items.map((stat) => (
                <GlassCard key={stat.label} className="p-4 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${stat.color}15`, color: stat.color }}>{stat.icon}</div>
                    </div>
                    <div>
                        <div className="text-xl font-bold text-[var(--admin-text-primary)]">{stat.value}</div>
                        <div className="text-xs text-[var(--admin-text-muted)] mt-1">{stat.label}</div>
                    </div>
                </GlassCard>
            ))}
        </div>
    );
}

function GatewayCard({ gateway }: { gateway: Gateway }) {
    const statusColors = {
        operational: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', label: 'Работает' },
        degraded: { bg: 'rgba(249, 115, 22, 0.15)', color: '#f97316', label: 'Деградация' },
        down: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', label: 'Недоступен' }
    };
    const status = statusColors[gateway.status];
    const ping = gateway.avgResponseMs;
    return (
        <GlassCard className="p-6">
            <div className="flex justify-between items-center mb-5">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">{gateway.icon}</span>
                    <h3 className="text-lg font-semibold text-[var(--admin-text-primary)]">{gateway.displayName}</h3>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: status.bg, color: status.color }}>
                    {gateway.status === 'operational' && <CheckCircle size={12} />}
                    {gateway.status === 'degraded' && <AlertTriangle size={12} />}
                    {gateway.status === 'down' && <XCircle size={12} />}
                    {status.label}
                </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-slate-900/40 rounded-xl mb-5 border border-slate-700/30">
                <Activity size={16} className="text-emerald-500 animate-pulse" />
                <span className="text-sm font-semibold text-[var(--admin-text-primary)]">{ping}ms</span>
                <span className={`text-xs ml-auto ${ping < 300 ? 'text-emerald-500' : ping < 500 ? 'text-orange-500' : 'text-red-500'}`}>
                    {ping < 300 ? 'Быстро' : ping < 500 ? 'Средне' : 'Медленно'}
                </span>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="text-center p-2 rounded-lg bg-slate-800/20">
                    <span className="block text-lg font-bold text-[var(--admin-text-primary)]">{gateway.transactions24h.toLocaleString()}</span>
                    <span className="text-[10px] text-[var(--admin-text-muted)] uppercase tracking-wider">Txns (24h)</span>
                </div>
                <div className="text-center p-2 rounded-lg bg-slate-800/20">
                    <span className="block text-lg font-bold" style={{ color: gateway.successRate >= 98 ? '#10b981' : gateway.successRate >= 95 ? '#f59e0b' : '#ef4444' }}>{gateway.successRate}%</span>
                    <span className="text-[10px] text-[var(--admin-text-muted)] uppercase tracking-wider">Success</span>
                </div>
                <div className="text-center p-2 rounded-lg bg-slate-800/20">
                    <span className="block text-lg font-bold text-[var(--admin-text-primary)]">${(gateway.volume24h / 1000).toFixed(1)}K</span>
                    <span className="text-[10px] text-[var(--admin-text-muted)] uppercase tracking-wider">Vol (24h)</span>
                </div>
                <div className="text-center p-2 rounded-lg bg-slate-800/20">
                    <span className="block text-lg font-bold text-red-500">{gateway.failedTransactions}</span>
                    <span className="text-[10px] text-[var(--admin-text-muted)] uppercase tracking-wider">Failed</span>
                </div>
            </div>
            <div className="h-1.5 bg-slate-700/30 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${gateway.successRate}%`, background: gateway.successRate >= 98 ? '#10b981' : gateway.successRate >= 95 ? '#f59e0b' : '#ef4444' }} />
            </div>
        </GlassCard>
    );
}

function GatewaysSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
                <GlassCard key={i} className="p-6">
                    <div className="flex justify-between items-center mb-5">
                        <div className="flex items-center gap-3"><Skeleton className="w-8 h-8 rounded-lg" /><Skeleton className="h-5 w-24" /></div>
                        <Skeleton className="h-6 w-24 rounded-full" />
                    </div>
                    <Skeleton className="h-10 w-full rounded-xl mb-5" />
                    <div className="grid grid-cols-2 gap-4 mb-5">{Array.from({ length: 4 }).map((_, j) => <Skeleton key={j} className="h-16 rounded-lg" />)}</div>
                    <Skeleton className="h-1.5 w-full rounded-full" />
                </GlassCard>
            ))}
        </div>
    );
}

function FailedPaymentsTable({ payments, onRetry, retryingId }: { payments: FailedPayment[]; onRetry: (id: string) => void; retryingId: string | null }) {
    const getErrorColor = (code: string) => {
        switch (code) {
            case 'card_declined': return '#ef4444';
            case 'insufficient_funds': return '#f97316';
            case 'expired_card': return '#f59e0b';
            default: return '#94a3b8';
        }
    };
    return (
        <GlassCard className="p-6">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-[var(--admin-text-primary)] mb-1">Неудачные платежи</h2>
                    <p className="text-sm text-[var(--admin-text-muted)]">Недавние неудачные транзакции, требующие внимания</p>
                </div>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] transition-colors">
                    <RefreshCw size={14} /> Обновить
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-[var(--admin-glass-border)]">
                            <th className="pb-3 text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wider">Пользователь</th>
                            <th className="pb-3 text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wider">Сумма</th>
                            <th className="pb-3 text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wider">Шлюз</th>
                            <th className="pb-3 text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wider">Ошибка</th>
                            <th className="pb-3 text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wider">Попытки</th>
                            <th className="pb-3 text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wider text-right">Действие</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--admin-glass-border)]">
                        {payments.length === 0 ? (
                            <tr><td colSpan={6} className="py-8 text-center text-sm text-[var(--admin-text-muted)]">Нет неудачных платежей — всё чисто! ✨</td></tr>
                        ) : payments.map((payment) => (
                            <tr key={payment.id} className="group">
                                <td className="py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white">{payment.userName.charAt(0)}</div>
                                        <span className="text-sm font-medium text-[var(--admin-text-primary)]">{payment.userName}</span>
                                    </div>
                                </td>
                                <td className="py-4 text-sm font-semibold text-[var(--admin-text-primary)]">${payment.amount.toFixed(2)}</td>
                                <td className="py-4"><span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-500 capitalize">{payment.gateway.replace('_', ' ')}</span></td>
                                <td className="py-4">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-xs font-semibold" style={{ color: getErrorColor(payment.errorCode) }}>{payment.errorCode}</span>
                                        <span className="text-[10px] text-[var(--admin-text-muted)] max-w-[200px] truncate">{payment.errorMessage}</span>
                                    </div>
                                </td>
                                <td className="py-4 text-sm text-[var(--admin-text-muted)]">
                                    <span className={payment.retryCount >= 3 ? 'text-red-500 font-medium' : ''}>{payment.retryCount}/3</span>
                                </td>
                                <td className="py-4 text-right">
                                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-500 text-xs font-medium hover:bg-blue-500 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed mx-0"
                                        onClick={() => onRetry(payment.id)} disabled={payment.retryCount >= 3 || retryingId === payment.id}>
                                        <RefreshCw size={12} className={retryingId === payment.id ? 'animate-spin' : ''} />
                                        {retryingId === payment.id ? '...' : 'Повторить'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </GlassCard>
    );
}

function ErrorBlock({ message, onRetry }: { message: string; onRetry: () => void }) {
    return (
        <GlassCard className="p-8 flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center"><AlertTriangle size={28} className="text-red-500" /></div>
            <p className="text-sm text-[var(--admin-text-muted)] text-center">{message}</p>
            <button onClick={onRetry} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-500 text-sm font-medium hover:bg-blue-500 hover:text-white transition-all">
                <RefreshCw size={14} /> Повторить
            </button>
        </GlassCard>
    );
}

export default function PaymentGatewayPage() {
    const {
        gateways, stats, failedPayments, loading, error,
        retryingId, systemStatus, fetchData, handleRetry
    } = usePaymentsPage();

    return (
        <div className={styles.pageContainer}>
            <div className={styles.headerSection}>
                <div className={styles.headerContent}>
                    <h1 className={styles.headerTitle}>Мониторинг платёжных шлюзов</h1>
                    <p className={styles.headerDescription}>Мониторинг систем обработки платежей в реальном времени</p>
                </div>
                {!loading && !error && (
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ${
                        systemStatus === 'operational' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500'
                        : systemStatus === 'degraded' ? 'bg-orange-500/10 border border-orange-500/20 text-orange-500'
                        : 'bg-red-500/10 border border-red-500/20 text-red-500'
                    }`}>
                        <ShieldCheck size={18} />
                        <span>{systemStatus === 'operational' ? 'Все системы работают' : systemStatus === 'degraded' ? 'Снижение производительности' : 'Проблемы с системой'}</span>
                    </div>
                )}
            </div>
            {error ? (
                <ErrorBlock message={error} onRetry={fetchData} />
            ) : (
                <>
                    <OverallStats stats={stats} loading={loading} />
                    {loading ? <GatewaysSkeleton /> : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            {gateways.map((gateway) => <GatewayCard key={gateway.name} gateway={gateway} />)}
                        </div>
                    )}
                    {loading ? (
                        <GlassCard className="p-6">
                            <Skeleton className="h-5 w-40 mb-2" /><Skeleton className="h-4 w-64 mb-6" />
                            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full mb-3" />)}
                        </GlassCard>
                    ) : (
                        <FailedPaymentsTable payments={failedPayments} onRetry={handleRetry} retryingId={retryingId} />
                    )}
                </>
            )}
        </div>
    );
}
