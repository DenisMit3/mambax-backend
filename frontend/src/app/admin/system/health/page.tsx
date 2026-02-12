'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    Server,
    Activity,
    CheckCircle,
    AlertTriangle,
    XCircle,
    Clock,
    RefreshCw,
    Loader2,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { adminApi, SystemHealthService } from '@/services/adminApi';
import styles from '../../admin.module.css';

// Конфигурация цветов по статусу сервиса
const statusConfig = {
    healthy: {
        icon: <CheckCircle size={16} />,
        color: '#10b981',
        label: 'Healthy',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
        text: 'text-emerald-400',
    },
    warning: {
        icon: <AlertTriangle size={16} />,
        color: '#f97316',
        label: 'Warning',
        bg: 'bg-orange-500/10',
        border: 'border-orange-500/20',
        text: 'text-orange-400',
    },
    error: {
        icon: <XCircle size={16} />,
        color: '#ef4444',
        label: 'Error',
        bg: 'bg-red-500/10',
        border: 'border-red-500/20',
        text: 'text-red-400',
    },
};

// Конфигурация для overall_status
const overallConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    healthy: { icon: <CheckCircle size={32} />, color: '#10b981', label: 'Все системы работают' },
    warning: { icon: <AlertTriangle size={32} />, color: '#f97316', label: 'Некоторые системы с предупреждениями' },
    degraded: { icon: <AlertTriangle size={32} />, color: '#f97316', label: 'Некоторые системы деградированы' },
    error: { icon: <XCircle size={32} />, color: '#ef4444', label: 'Есть проблемы с системами' },
};

// === Общий статус ===
function OverallStatus({
    overallStatus,
    lastChecked,
    services,
    loading,
}: {
    overallStatus: string;
    lastChecked: string;
    services: SystemHealthService[];
    loading: boolean;
}) {
    // Скелетон
    if (loading) {
        return (
            <GlassCard className="flex items-center gap-5 p-6 mb-6" hover={false}>
                <div className="w-16 h-16 rounded-2xl bg-slate-700/30 animate-pulse" />
                <div className="flex-1 flex flex-col gap-2">
                    <div className="w-64 h-6 bg-slate-700/30 rounded animate-pulse" />
                    <div className="w-40 h-4 bg-slate-700/30 rounded animate-pulse" />
                </div>
                <div className="flex flex-col items-end gap-1">
                    <div className="w-20 h-8 bg-slate-700/30 rounded animate-pulse" />
                    <div className="w-24 h-3 bg-slate-700/30 rounded animate-pulse" />
                </div>
            </GlassCard>
        );
    }

    const config = overallConfig[overallStatus] || overallConfig.error;
    const healthyCount = services.filter(s => s.status === 'healthy').length;

    return (
        <GlassCard className="flex items-center gap-5 p-6 mb-6" hover={false}>
            <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: `${config.color}15`, color: config.color }}
            >
                {config.icon}
            </div>
            <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-100 mb-1">{config.label}</h2>
                <p className="text-sm text-slate-400">
                    {healthyCount} из {services.length} сервисов работают нормально
                </p>
            </div>
            <div className="text-right">
                <span className="block text-3xl font-extrabold" style={{ color: config.color }}>
                    {services.length > 0
                        ? Math.round((healthyCount / services.length) * 100)
                        : 0}%
                </span>
                <span className="text-xs text-slate-500">
                    Проверено: {lastChecked ? new Date(lastChecked).toLocaleTimeString() : '—'}
                </span>
            </div>
        </GlassCard>
    );
}

// === Карточка сервиса ===
function ServiceCard({ service }: { service: SystemHealthService }) {
    const status = statusConfig[service.status] || statusConfig.error;

    return (
        <GlassCard className="p-5" hover>
            {/* Заголовок */}
            <div className="flex items-center gap-2.5 mb-4 text-slate-400">
                <Server size={20} />
                <h3 className="flex-1 text-[15px] font-semibold text-slate-100">{service.name}</h3>
                <span className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${status.bg} ${status.border} ${status.text}`}>
                    {status.icon}
                    {status.label}
                </span>
            </div>

            {/* Время ответа */}
            <div className="flex items-center gap-2.5 px-4 py-3 bg-slate-800/50 rounded-xl mb-4">
                <Activity size={16} className="text-emerald-400" />
                <span className="text-lg font-bold text-slate-100">{service.response}</span>
                <span className="ml-auto text-xs font-semibold" style={{ color: status.color }}>
                    {status.label}
                </span>
            </div>

            {/* Метрики */}
            <div className="grid grid-cols-2 gap-2.5">
                <div className="flex flex-col items-center gap-1 p-2.5 bg-slate-800/40 rounded-xl">
                    <Clock size={14} className="text-slate-500" />
                    <span className="text-sm font-bold text-slate-100">{service.uptime}</span>
                    <span className="text-[9px] text-slate-500 uppercase">Uptime</span>
                </div>
                <div className="flex flex-col items-center gap-1 p-2.5 bg-slate-800/40 rounded-xl">
                    <Activity size={14} className="text-slate-500" />
                    <span className="text-sm font-bold text-slate-100">{service.response}</span>
                    <span className="text-[9px] text-slate-500 uppercase">Response</span>
                </div>
            </div>
        </GlassCard>
    );
}

// === Главная страница ===
export default function SystemHealthPage() {
    const [services, setServices] = useState<SystemHealthService[]>([]);
    const [overallStatus, setOverallStatus] = useState('healthy');
    const [lastChecked, setLastChecked] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    // Загрузка данных с API
    const fetchHealth = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        try {
            const data = await adminApi.system.getHealth();
            setServices(data.services || []);
            setOverallStatus(data.overall_status || 'healthy');
            setLastChecked(data.last_checked || new Date().toISOString());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Не удалось загрузить состояние системы');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchHealth();
    }, [fetchHealth]);

    // Обработчик обновления
    const handleRefresh = () => {
        fetchHealth(true);
    };

    // Состояние ошибки
    if (error && !loading && services.length === 0) {
        return (
            <div className={styles.pageContainer}>
                <div className={styles.headerSection}>
                    <div>
                        <h1 className={styles.headerTitle}>Состояние системы</h1>
                        <p className={styles.headerDescription}>Мониторинг инфраструктуры в реальном времени</p>
                    </div>
                </div>
                <div className={styles.errorContainer}>
                    <AlertTriangle size={48} className={styles.errorIcon} />
                    <h3 className={styles.errorTitle}>Ошибка загрузки</h3>
                    <p className={styles.errorMessage}>{error}</p>
                    <button className={styles.retryButton} onClick={() => fetchHealth()}>
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
                    <h1 className={styles.headerTitle}>Состояние системы</h1>
                    <p className={styles.headerDescription}>Мониторинг инфраструктуры в реальном времени</p>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-xs text-slate-500">
                        Обновлено: {lastChecked ? new Date(lastChecked).toLocaleTimeString() : '—'}
                    </span>
                    <button
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/50 border border-slate-600/20 rounded-xl text-slate-100 text-sm cursor-pointer transition-all hover:bg-blue-500/20 hover:border-blue-500/30 disabled:opacity-50"
                        onClick={handleRefresh}
                        disabled={refreshing || loading}
                    >
                        {refreshing ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <RefreshCw size={16} />
                        )}
                        Обновить
                    </button>
                </div>
            </div>

            {/* Общий статус */}
            <OverallStatus
                overallStatus={overallStatus}
                lastChecked={lastChecked}
                services={services}
                loading={loading}
            />

            {/* Заголовок секции сервисов */}
            <h2 className="flex items-center gap-2.5 text-lg font-semibold text-slate-100 mb-4">
                <Server size={20} />
                Статус сервисов
            </h2>

            {/* Скелетон загрузки сервисов */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <GlassCard key={i} className="p-5" hover={false}>
                            <div className="flex items-center gap-2.5 mb-4">
                                <div className="w-5 h-5 bg-slate-700/30 rounded animate-pulse" />
                                <div className="flex-1 h-4 bg-slate-700/30 rounded animate-pulse" />
                                <div className="w-16 h-5 bg-slate-700/30 rounded-full animate-pulse" />
                            </div>
                            <div className="h-12 bg-slate-700/30 rounded-xl animate-pulse mb-4" />
                            <div className="grid grid-cols-2 gap-2.5">
                                <div className="h-16 bg-slate-700/30 rounded-xl animate-pulse" />
                                <div className="h-16 bg-slate-700/30 rounded-xl animate-pulse" />
                            </div>
                        </GlassCard>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {services.map((service, index) => (
                        <motion.div
                            key={service.name}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <ServiceCard service={service} />
                        </motion.div>
                    ))}

                    {services.length === 0 && (
                        <div className="col-span-full text-center py-16 text-slate-500">
                            <Server size={48} className="mx-auto mb-4 opacity-50" />
                            <h3 className="text-lg font-semibold text-slate-100 mb-2">Нет данных о сервисах</h3>
                            <p>Попробуйте обновить страницу</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
