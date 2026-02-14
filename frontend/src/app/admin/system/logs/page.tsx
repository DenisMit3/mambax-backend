'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    FileText,
    Search,
    RefreshCw,
    AlertTriangle,
    Info,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    Loader2,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { adminApi } from '@/services/adminApi';
import styles from '../../admin.module.css';

// Типы
interface LogEntry {
    id: string;
    level: 'info' | 'warn' | 'error';
    message: string;
    source: string;
    timestamp: string;
}

type LogLevel = 'all' | 'info' | 'warn' | 'error';

// Конфиг цветов для уровней логов
const levelConfig: Record<string, { icon: React.ReactNode; bg: string; text: string; border: string }> = {
    info: {
        icon: <Info size={14} />,
        bg: 'bg-blue-500/15',
        text: 'text-blue-400',
        border: 'border-l-blue-500',
    },
    warn: {
        icon: <AlertTriangle size={14} />,
        bg: 'bg-amber-500/15',
        text: 'text-amber-400',
        border: 'border-l-amber-500',
    },
    error: {
        icon: <AlertCircle size={14} />,
        bg: 'bg-red-500/15',
        text: 'text-red-400',
        border: 'border-l-red-500',
    },
};

// === Скелетон загрузки ===
function LogsSkeleton() {
    return (
        <div className="flex flex-col gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
                <div
                    key={i}
                    className="bg-[rgba(15,23,42,0.65)] border border-slate-400/20 rounded-xl p-4 flex items-center gap-4"
                >
                    <div className="w-16 h-5 bg-slate-700/30 rounded-full animate-pulse" />
                    <div className="flex-1 flex flex-col gap-2">
                        <div className="w-3/4 h-4 bg-slate-700/30 rounded animate-pulse" />
                        <div className="w-1/3 h-3 bg-slate-700/30 rounded animate-pulse" />
                    </div>
                    <div className="w-32 h-3 bg-slate-700/30 rounded animate-pulse" />
                </div>
            ))}
        </div>
    );
}

// === Строка лога ===
function LogRow({ log }: { log: LogEntry }) {
    const config = levelConfig[log.level] ?? levelConfig.info;

    return (
        <motion.div
            className={`bg-[rgba(15,23,42,0.65)] backdrop-blur-[20px] border border-slate-400/20 rounded-xl p-4 flex items-start gap-4 border-l-[3px] ${config.border} hover:border-slate-400/40 transition-colors`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
        >
            {/* Бейдж уровня */}
            <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${config.bg} ${config.text}`}>
                {config.icon}
                {log.level.toUpperCase()}
            </span>

            {/* Сообщение + источник */}
            <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--admin-text-primary)] leading-relaxed m-0 break-words">
                    {log.message}
                </p>
                <span className="text-xs text-slate-500 mt-1 inline-block">
                    {log.source}
                </span>
            </div>

            {/* Время */}
            <span className="text-xs text-slate-500 whitespace-nowrap font-mono shrink-0">
                {new Date(log.timestamp).toLocaleString()}
            </span>
        </motion.div>
    );
}

// === Пагинация ===
function Pagination({ page, total, perPage, onPageChange }: {
    page: number;
    total: number;
    perPage: number;
    onPageChange: (p: number) => void;
}) {
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-center gap-3 mt-6">
            <button
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
            >
                <ChevronLeft size={16} />
                Назад
            </button>

            <span className="text-sm text-slate-400">
                {page} / {totalPages}
                <span className="text-slate-600 ml-2">({total} записей)</span>
            </span>

            <button
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
            >
                Вперёд
                <ChevronRight size={16} />
            </button>
        </div>
    );
}

// === Главная страница ===
export default function SystemLogsPage() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [level, setLevel] = useState<LogLevel>('all');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const perPage = 20;

    // Загрузка логов с API
    const fetchLogs = useCallback(async () => {
        try {
            setError(null);
            setLoading(true);
            const data = await adminApi.system.getLogs(
                page,
                level !== 'all' ? level : undefined
            );
            setLogs(data.logs ?? []);
            setTotal(data.total ?? 0);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Не удалось загрузить логи');
        } finally {
            setLoading(false);
        }
    }, [page, level]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    // Сброс страницы при смене фильтра
    const handleLevelChange = (newLevel: LogLevel) => {
        setLevel(newLevel);
        setPage(1);
    };

    // Клиентская фильтрация по поиску
    const filteredLogs = logs.filter(log => {
        if (!search) return true;
        const q = search.toLowerCase();
        return log.message.toLowerCase().includes(q) || log.source.toLowerCase().includes(q);
    });

    const levelFilters: { key: LogLevel; label: string; icon: React.ReactNode }[] = [
        { key: 'all', label: 'Все', icon: <FileText size={14} /> },
        { key: 'info', label: 'Инфо', icon: <Info size={14} /> },
        { key: 'warn', label: 'Warn', icon: <AlertTriangle size={14} /> },
        { key: 'error', label: 'Ошибка', icon: <AlertCircle size={14} /> },
    ];

    return (
        <div className={styles.pageContainer}>
            {/* Заголовок */}
            <div className={styles.headerSection}>
                <div className={styles.headerContent}>
                    <h1 className={styles.headerTitle}>System Logs</h1>
                    <p className={styles.headerDescription}>Мониторинг системных событий и ошибок</p>
                </div>
                <button
                    className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-sm bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:bg-slate-800 transition-colors disabled:opacity-50"
                    onClick={fetchLogs}
                    disabled={loading}
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                    Обновить
                </button>
            </div>

            {/* Фильтры + поиск */}
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                {/* Фильтр по уровню */}
                <div className="flex gap-2">
                    {levelFilters.map((f) => (
                        <button
                            key={f.key}
                            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-[10px] text-[13px] cursor-pointer transition-all duration-200 border ${
                                level === f.key
                                    ? 'bg-purple-500/20 border-purple-500/40 text-purple-400'
                                    : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-800'
                            }`}
                            onClick={() => handleLevelChange(f.key)}
                        >
                            {f.icon}
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Поиск */}
                <div className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-[10px] min-w-[280px]">
                    <Search size={16} className="text-slate-500" />
                    <input
                        type="text"
                        placeholder="Поиск по сообщению или источнику..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="flex-1 bg-transparent border-none outline-none text-[var(--admin-text-primary)] text-sm placeholder:text-slate-500"
                    />
                </div>
            </div>

            {/* Ошибка */}
            {error && (
                <div className={styles.errorContainer}>
                    <AlertTriangle size={48} className={styles.errorIcon} />
                    <h3 className={styles.errorTitle}>Ошибка загрузки</h3>
                    <p className={styles.errorMessage}>{error}</p>
                    <button className={styles.retryButton} onClick={fetchLogs}>
                        <RefreshCw size={16} />
                        Повторить
                    </button>
                </div>
            )}

            {/* Скелетон */}
            {loading && !error && <LogsSkeleton />}

            {/* Список логов */}
            {!loading && !error && (
                <>
                    <div className="flex flex-col gap-2">
                        {filteredLogs.map((log) => (
                            <LogRow key={log.id} log={log} />
                        ))}

                        {filteredLogs.length === 0 && (
                            <div className="text-center py-16 text-slate-500">
                                <FileText size={48} className="mx-auto mb-4 opacity-50" />
                                <h3 className="text-xl font-semibold text-[var(--admin-text-primary)] mb-2">Логов не найдено</h3>
                                <p>Нет записей, соответствующих выбранным фильтрам</p>
                            </div>
                        )}
                    </div>

                    <Pagination
                        page={page}
                        total={total}
                        perPage={perPage}
                        onPageChange={setPage}
                    />
                </>
            )}
        </div>
    );
}
