'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
    Flag,
    ToggleLeft,
    ToggleRight,
    Search,
    Users,
    Percent,
    AlertCircle,
    CheckCircle,
    AlertTriangle,
    Info,
    RefreshCw,
    Loader2,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { adminApi, FeatureFlag } from '@/services/admin';
import styles from '../../admin.module.css';

// === Скелетон статистики ===
function FlagStatsSkeleton() {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
                <GlassCard key={i} className="p-4 flex items-center gap-3" hover={false}>
                    <div className="w-[42px] h-[42px] rounded-xl bg-slate-700/30 animate-pulse" />
                    <div className="flex flex-col gap-2">
                        <div className="w-10 h-5 bg-slate-700/30 rounded animate-pulse" />
                        <div className="w-16 h-3 bg-slate-700/30 rounded animate-pulse" />
                    </div>
                </GlassCard>
            ))}
        </div>
    );
}

// === Статистика флагов ===
function FlagStats({ flags }: { flags: FeatureFlag[] }) {
    const enabledCount = flags.filter(f => f.enabled).length;
    const partialRollout = flags.filter(f => f.enabled && f.rollout < 100).length;

    const items = [
        { label: 'Total Flags', value: flags.length, icon: <Flag size={18} />, color: '#3b82f6' },
        { label: 'Enabled', value: enabledCount, icon: <CheckCircle size={18} />, color: '#10b981' },
        { label: 'Disabled', value: flags.length - enabledCount, icon: <AlertCircle size={18} />, color: '#64748b' },
        { label: 'Partial Rollout', value: partialRollout, icon: <Percent size={18} />, color: '#f59e0b' },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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

// === Скелетон списка флагов ===
function FlagsListSkeleton() {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
                <div
                    key={i}
                    className="bg-[rgba(15,23,42,0.65)] border border-slate-400/20 rounded-2xl p-6"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex flex-col gap-2 flex-1">
                            <div className="w-40 h-5 bg-slate-700/30 rounded animate-pulse" />
                            <div className="w-56 h-3 bg-slate-700/30 rounded animate-pulse" />
                        </div>
                        <div className="w-8 h-8 bg-slate-700/30 rounded-full animate-pulse" />
                    </div>
                    <div className="w-full h-10 bg-slate-700/30 rounded-xl animate-pulse" />
                </div>
            ))}
        </div>
    );
}

// === Карточка флага ===
function FlagCard({ flag, onToggle, onRolloutChange, saving }: {
    flag: FeatureFlag;
    onToggle: (id: string) => void;
    onRolloutChange: (id: string, value: number) => void;
    saving: boolean;
}) {
    const [showRollout, setShowRollout] = useState(false);

    return (
        <motion.div
            className={`p-6 bg-[rgba(15,23,42,0.65)] backdrop-blur-[20px] border-2 rounded-2xl transition-all hover:border-purple-500/40 ${
                flag.enabled ? 'border-emerald-500/30' : 'border-slate-400/20 opacity-70'
            }`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
        >
            {/* Заголовок + переключатель */}
            <div className="flex justify-between items-start gap-4 mb-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-[var(--admin-text-primary)]">{flag.name}</h3>
                        {saving && <Loader2 size={14} className="animate-spin text-purple-400" />}
                    </div>
                    <p className="text-[13px] text-slate-400 mt-1">ID: {flag.id}</p>
                </div>
                <button
                    className={`bg-transparent border-none cursor-pointer p-0 transition-transform hover:scale-110 ${
                        flag.enabled ? 'text-emerald-500' : 'text-slate-500'
                    }`}
                    onClick={() => onToggle(flag.id)}
                    aria-label={flag.enabled ? 'Выключить флаг' : 'Включить флаг'}
                >
                    {flag.enabled ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                </button>
            </div>

            {/* Секция rollout (только для включённых) */}
            {flag.enabled && (
                <div className="mb-0">
                    <button
                        className="w-full flex items-center gap-2.5 p-3 bg-slate-800/50 rounded-xl cursor-pointer border-none text-left text-slate-400"
                        onClick={() => setShowRollout(!showRollout)}
                    >
                        <Users size={16} />
                        <span className="text-[13px] font-medium">Rollout: {flag.rollout}%</span>
                        <div className="flex-1 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full transition-all duration-300"
                                style={{ width: `${flag.rollout}%` }}
                            />
                        </div>
                    </button>

                    {showRollout && (
                        <motion.div
                            className="p-4 bg-slate-800/30 rounded-b-xl"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                        >
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={flag.rollout}
                                onChange={(e) => onRolloutChange(flag.id, parseInt(e.target.value))}
                                className="w-full mb-3 accent-purple-500"
                            />
                            <div className="flex gap-2">
                                {[0, 10, 25, 50, 100].map(val => (
                                    <button
                                        key={val}
                                        className={`flex-1 py-2 rounded-lg text-xs cursor-pointer transition-all border ${
                                            flag.rollout === val
                                                ? 'bg-purple-500/20 border-purple-500/40 text-purple-400'
                                                : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-purple-500/10 hover:border-purple-500/30 hover:text-purple-400'
                                        }`}
                                        onClick={() => onRolloutChange(flag.id, val)}
                                    >
                                        {val}%
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </div>
            )}
        </motion.div>
    );
}

// === Главная страница ===
export default function FeatureFlagsPage() {
    const [flags, setFlags] = useState<FeatureFlag[]>([]);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

    // Ref для debounce таймеров rollout
    const rolloutTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

    // Загрузка флагов с API
    const fetchFlags = useCallback(async () => {
        try {
            setError(null);
            setLoading(true);
            const data = await adminApi.system.getFeatureFlags();
            setFlags(data.flags ?? []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Не удалось загрузить feature flags');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFlags();
    }, [fetchFlags]);

    // Очистка таймеров при размонтировании
    useEffect(() => {
        return () => {
            rolloutTimers.current.forEach(timer => clearTimeout(timer));
        };
    }, []);

    // Переключение флага (optimistic update)
    const handleToggle = async (id: string) => {
        const flag = flags.find(f => f.id === id);
        if (!flag) return;

        const newEnabled = !flag.enabled;

        // Оптимистичное обновление UI
        setFlags(prev => prev.map(f =>
            f.id === id ? { ...f, enabled: newEnabled } : f
        ));

        setSavingIds(prev => new Set(prev).add(id));
        try {
            await adminApi.system.updateFeatureFlag(id, newEnabled, flag.rollout);
        } catch {
            // Откат при ошибке
            setFlags(prev => prev.map(f =>
                f.id === id ? { ...f, enabled: !newEnabled } : f
            ));
        } finally {
            setSavingIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    // Изменение rollout с debounce (optimistic update)
    const handleRolloutChange = (id: string, value: number) => {
        // Оптимистичное обновление UI сразу
        setFlags(prev => prev.map(f =>
            f.id === id ? { ...f, rollout: value } : f
        ));

        // Отменяем предыдущий таймер для этого флага
        const existing = rolloutTimers.current.get(id);
        if (existing) clearTimeout(existing);

        // Debounce: сохраняем через 600ms после последнего изменения
        const timer = setTimeout(async () => {
            const flag = flags.find(f => f.id === id);
            if (!flag) return;

            setSavingIds(prev => new Set(prev).add(id));
            try {
                await adminApi.system.updateFeatureFlag(id, flag.enabled, value);
            } catch {
                // При ошибке перезагружаем данные
                await fetchFlags();
            } finally {
                setSavingIds(prev => {
                    const next = new Set(prev);
                    next.delete(id);
                    return next;
                });
            }
            rolloutTimers.current.delete(id);
        }, 600);

        rolloutTimers.current.set(id, timer);
    };

    // Фильтрация
    const filteredFlags = flags.filter(f => {
        if (search && !f.name.toLowerCase().includes(search.toLowerCase()) && !f.id.toLowerCase().includes(search.toLowerCase())) return false;
        if (filter === 'enabled' && !f.enabled) return false;
        if (filter === 'disabled' && f.enabled) return false;
        return true;
    });

    return (
        <div className={styles.pageContainer}>
            {/* Заголовок */}
            <div className={styles.headerSection}>
                <div className={styles.headerContent}>
                    <h1 className={styles.headerTitle}>Feature Flags</h1>
                    <p className={styles.headerDescription}>Управление функциями и постепенный раскат</p>
                </div>
                <button
                    className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-sm bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:bg-slate-800 transition-colors disabled:opacity-50"
                    onClick={fetchFlags}
                    disabled={loading}
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                    Обновить
                </button>
            </div>

            {/* Статистика */}
            {loading ? <FlagStatsSkeleton /> : <FlagStats flags={flags} />}

            {/* Инфо-баннер */}
            <div className="flex items-center gap-3 px-5 py-3.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 text-[13px] mb-6">
                <Info size={18} className="shrink-0" />
                <span>Изменения feature flags применяются мгновенно. Используйте rollout для постепенного раската.</span>
            </div>

            {/* Фильтры + поиск */}
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <div className="flex gap-2">
                    {(['all', 'enabled', 'disabled'] as const).map((f) => (
                        <button
                            key={f}
                            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-[10px] text-[13px] cursor-pointer transition-all duration-200 border ${
                                filter === f
                                    ? 'bg-purple-500/20 border-purple-500/40 text-purple-400'
                                    : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-800'
                            }`}
                            onClick={() => setFilter(f)}
                        >
                            {f === 'all' && <Flag size={14} />}
                            {f === 'enabled' && <CheckCircle size={14} />}
                            {f === 'disabled' && <AlertCircle size={14} />}
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                            <span className="px-1.5 py-0.5 bg-slate-700/30 rounded-lg text-[11px]">
                                {f === 'all' ? flags.length :
                                    f === 'enabled' ? flags.filter(fl => fl.enabled).length :
                                        flags.filter(fl => !fl.enabled).length}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-[10px] min-w-[280px]">
                    <Search size={16} className="text-slate-500" />
                    <input
                        type="text"
                        placeholder="Поиск по названию или ID..."
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
                    <button className={styles.retryButton} onClick={fetchFlags}>
                        <RefreshCw size={16} />
                        Повторить
                    </button>
                </div>
            )}

            {/* Скелетон */}
            {loading && !error && <FlagsListSkeleton />}

            {/* Список флагов */}
            {!loading && !error && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {filteredFlags.map((flag) => (
                        <FlagCard
                            key={flag.id}
                            flag={flag}
                            onToggle={handleToggle}
                            onRolloutChange={handleRolloutChange}
                            saving={savingIds.has(flag.id)}
                        />
                    ))}

                    {filteredFlags.length === 0 && (
                        <div className="col-span-full text-center py-16 text-slate-500">
                            <Flag size={48} className="mx-auto mb-4 opacity-50" />
                            <h3 className="text-xl font-semibold text-[var(--admin-text-primary)] mb-2">Флагов не найдено</h3>
                            <p>Нет feature flags, соответствующих фильтрам</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
