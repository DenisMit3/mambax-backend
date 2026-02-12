'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    FileText,
    Search,
    Filter,
    User,
    Clock,
    ChevronRight,
    Download,
    Eye,
    Shield,
    Settings,
    UserCheck,
    Ban,
    DollarSign,
    AlertTriangle,
    AlertCircle,
    Info,
    Loader2,
    ChevronLeft,
    RefreshCw,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { adminApi } from '@/services/adminApi';
import styles from '../../admin.module.css';

// Типы из API
interface AuditLog {
    id: string;
    action: string;
    user_name: string;
    target: string;
    ip_address: string;
    timestamp: string;
    severity: 'info' | 'warning' | 'critical';
}

interface AuditStats {
    total: number;
    today: number;
    critical: number;
}

interface AuditResponse {
    logs: AuditLog[];
    stats: AuditStats;
    total: number;
    page: number;
}

// Цвета по severity
const severityConfig = {
    info: { color: '#3b82f6', bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', icon: <Info size={14} /> },
    warning: { color: '#f97316', bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400', icon: <AlertTriangle size={14} /> },
    critical: { color: '#ef4444', bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', icon: <AlertCircle size={14} /> },
};

// === Компонент статистики ===
function LogStats({ stats, loading }: { stats: AuditStats | null; loading: boolean }) {
    // Скелетон при загрузке
    if (loading) {
        return (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {Array.from({ length: 3 }).map((_, i) => (
                    <GlassCard key={i} className="p-4 flex items-center gap-3" hover={false}>
                        <div className="w-[44px] h-[44px] rounded-xl bg-slate-700/30 animate-pulse" />
                        <div className="flex flex-col gap-2">
                            <div className="w-14 h-5 bg-slate-700/30 rounded animate-pulse" />
                            <div className="w-20 h-3 bg-slate-700/30 rounded animate-pulse" />
                        </div>
                    </GlassCard>
                ))}
            </div>
        );
    }

    if (!stats) return null;

    const items = [
        { label: 'Всего записей', value: stats.total.toLocaleString(), icon: <FileText size={18} />, color: '#3b82f6' },
        { label: 'Сегодня', value: stats.today.toLocaleString(), icon: <Clock size={18} />, color: '#10b981' },
        { label: 'Критические', value: stats.critical.toLocaleString(), icon: <AlertCircle size={18} />, color: '#ef4444' },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {items.map((stat, index) => (
                <GlassCard key={stat.label} className="p-4 flex items-center gap-3" hover={false}>
                    <motion.div
                        className="w-[44px] h-[44px] rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: `${stat.color}20`, color: stat.color }}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                    >
                        {stat.icon}
                    </motion.div>
                    <div className="flex flex-col">
                        <span className="text-xl font-bold text-slate-100">{stat.value}</span>
                        <span className="text-xs text-slate-400">{stat.label}</span>
                    </div>
                </GlassCard>
            ))}
        </div>
    );
}

// === Компонент записи лога ===
function LogEntry({ log }: { log: AuditLog }) {
    const [expanded, setExpanded] = useState(false);
    const severity = severityConfig[log.severity];

    const getActionIcon = (action: string) => {
        if (action.includes('ban')) return <Ban size={16} />;
        if (action.includes('verify')) return <UserCheck size={16} />;
        if (action.includes('refund')) return <DollarSign size={16} />;
        if (action.includes('config') || action.includes('flag') || action.includes('setting')) return <Settings size={16} />;
        if (action.includes('approve') || action.includes('reject')) return <Shield size={16} />;
        return <Eye size={16} />;
    };

    return (
        <GlassCard className="mb-2.5 !rounded-2xl overflow-hidden" hover={false}>
            <div
                className="flex items-center gap-4 p-4 cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                {/* Иконка действия */}
                <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${severity.color}20`, color: severity.color }}
                >
                    {getActionIcon(log.action)}
                </div>

                {/* Контент */}
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-slate-100">{log.user_name}</span>
                        <span className="text-sm text-slate-400 capitalize">{log.action.replace(/[._]/g, ' ')}</span>
                        <span className="text-xs font-mono text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded">
                            {log.target}
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                            <Clock size={12} /> {new Date(log.timestamp).toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                            <User size={12} /> {log.ip_address}
                        </span>
                    </div>
                </div>

                {/* Бейдж severity */}
                <span className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${severity.bg} ${severity.border} ${severity.text}`}>
                    {severity.icon}
                    {log.severity}
                </span>

                {/* Стрелка раскрытия */}
                <ChevronRight
                    size={18}
                    className={`text-slate-500 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
                />
            </div>

            {/* Развернутые детали */}
            {expanded && (
                <motion.div
                    className="px-5 pb-5 border-t border-slate-700/30"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                >
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase">Пользователь</span>
                            <span className="text-sm text-slate-100">{log.user_name}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase">Действие</span>
                            <span className="text-sm text-slate-100">{log.action}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase">Цель</span>
                            <span className="text-sm text-slate-100">{log.target}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase">IP адрес</span>
                            <span className="text-sm text-slate-100">{log.ip_address}</span>
                        </div>
                    </div>
                </motion.div>
            )}
        </GlassCard>
    );
}

// === Главная страница ===
export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [stats, setStats] = useState<AuditStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Фильтры (клиентские)
    const [search, setSearch] = useState('');
    const [filterSeverity, setFilterSeverity] = useState('all');

    // Загрузка данных с API
    const fetchLogs = useCallback(async (pageNum: number) => {
        setLoading(true);
        setError(null);
        try {
            const data = await adminApi.system.getAuditLogs(pageNum) as AuditResponse;
            setLogs(data.logs || []);
            setStats(data.stats || null);
            setPage(data.page || 1);
            // Предполагаем 20 записей на страницу
            setTotalPages(Math.max(1, Math.ceil((data.total || 0) / 20)));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Не удалось загрузить аудит-логи');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLogs(page);
    }, [fetchLogs, page]);

    // Клиентская фильтрация
    const filteredLogs = logs.filter(log => {
        if (search && !log.action.toLowerCase().includes(search.toLowerCase())
            && !log.target.toLowerCase().includes(search.toLowerCase())
            && !log.user_name.toLowerCase().includes(search.toLowerCase())) return false;
        if (filterSeverity !== 'all' && log.severity !== filterSeverity) return false;
        return true;
    });

    // Состояние ошибки
    if (error && !loading) {
        return (
            <div className={styles.pageContainer}>
                <div className={styles.headerSection}>
                    <div>
                        <h1 className={styles.headerTitle}>Аудит-логи</h1>
                        <p className={styles.headerDescription}>Отслеживание действий администраторов</p>
                    </div>
                </div>
                <div className={styles.errorContainer}>
                    <AlertTriangle size={48} className={styles.errorIcon} />
                    <h3 className={styles.errorTitle}>Ошибка загрузки</h3>
                    <p className={styles.errorMessage}>{error}</p>
                    <button className={styles.retryButton} onClick={() => fetchLogs(page)}>
                        <RefreshCw size={16} />
                        Повторить
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.pageContainer}>
            {/* Заголовок */}
            <div className={styles.headerSection}>
                <div>
                    <h1 className={styles.headerTitle}>Аудит-логи</h1>
                    <p className={styles.headerDescription}>Отслеживание действий администраторов</p>
                </div>
                <button
                    className="flex items-center gap-2 px-5 py-3 bg-slate-800/50 border border-slate-600/20 rounded-xl text-slate-100 text-sm font-medium cursor-pointer transition-all hover:bg-blue-500/20 hover:border-blue-500/30"
                    onClick={() => fetchLogs(page)}
                    disabled={loading}
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                    Обновить
                </button>
            </div>

            {/* Статистика */}
            <LogStats stats={stats} loading={loading} />

            {/* Фильтры */}
            <div className="flex gap-4 mb-6 flex-wrap">
                <div className="flex items-center gap-2.5 flex-1 min-w-[250px] px-4 py-3 bg-slate-800/50 border border-slate-600/20 rounded-xl">
                    <Search size={16} className="text-slate-500" />
                    <input
                        type="text"
                        placeholder="Поиск по действиям, целям..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="flex-1 bg-transparent border-none outline-none text-slate-100 text-sm placeholder:text-slate-500"
                    />
                </div>

                <div className="flex items-center gap-2 px-4 py-3 bg-slate-800/50 border border-slate-600/20 rounded-xl text-slate-500">
                    <Filter size={16} />
                    <select
                        value={filterSeverity}
                        onChange={(e) => setFilterSeverity(e.target.value)}
                        className="bg-transparent border-none outline-none text-slate-100 text-sm cursor-pointer"
                    >
                        <option value="all">Все уровни</option>
                        <option value="info">Info</option>
                        <option value="warning">Warning</option>
                        <option value="critical">Critical</option>
                    </select>
                </div>
            </div>

            {/* Скелетон загрузки списка */}
            {loading && logs.length === 0 ? (
                <div className="flex flex-col gap-2.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <GlassCard key={i} className="p-4 flex items-center gap-4" hover={false}>
                            <div className="w-10 h-10 rounded-xl bg-slate-700/30 animate-pulse shrink-0" />
                            <div className="flex-1 flex flex-col gap-2">
                                <div className="w-3/4 h-4 bg-slate-700/30 rounded animate-pulse" />
                                <div className="w-1/2 h-3 bg-slate-700/30 rounded animate-pulse" />
                            </div>
                            <div className="w-16 h-6 bg-slate-700/30 rounded-full animate-pulse" />
                        </GlassCard>
                    ))}
                </div>
            ) : (
                <>
                    {/* Список логов */}
                    <div className="flex flex-col">
                        {filteredLogs.map((log) => (
                            <LogEntry key={log.id} log={log} />
                        ))}

                        {filteredLogs.length === 0 && (
                            <div className="text-center py-16 text-slate-500">
                                <FileText size={48} className="mx-auto mb-4 opacity-50" />
                                <h3 className="text-lg font-semibold text-slate-100 mb-2">Логи не найдены</h3>
                                <p>Попробуйте изменить фильтры</p>
                            </div>
                        )}
                    </div>

                    {/* Пагинация */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-3 mt-8">
                            <button
                                className="flex items-center gap-1 px-4 py-2 bg-slate-800/50 border border-slate-600/20 rounded-lg text-slate-300 text-sm cursor-pointer transition-all hover:bg-slate-700/50 disabled:opacity-40 disabled:cursor-not-allowed"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page <= 1}
                            >
                                <ChevronLeft size={16} />
                                Назад
                            </button>
                            <span className="text-sm text-slate-400">
                                Страница {page} из {totalPages}
                            </span>
                            <button
                                className="flex items-center gap-1 px-4 py-2 bg-slate-800/50 border border-slate-600/20 rounded-lg text-slate-300 text-sm cursor-pointer transition-all hover:bg-slate-700/50 disabled:opacity-40 disabled:cursor-not-allowed"
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                            >
                                Вперёд
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
