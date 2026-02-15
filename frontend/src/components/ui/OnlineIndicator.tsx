'use client';

interface OnlineIndicatorProps {
    isOnline?: boolean;
    lastSeen?: string;
    size?: 'sm' | 'md' | 'lg';
}

export function OnlineIndicator({ isOnline, lastSeen, size = 'md' }: OnlineIndicatorProps) {
    const sizeMap = { sm: 'w-2.5 h-2.5', md: 'w-3 h-3', lg: 'w-4 h-4' };
    const ringMap = { sm: 'ring-1', md: 'ring-2', lg: 'ring-2' };

    if (isOnline) {
        return (
            <span className={`${sizeMap[size]} rounded-full bg-green-400 ${ringMap[size]} ring-black inline-block shadow-[0_0_6px_rgba(74,222,128,0.6)]`} />
        );
    }

    if (lastSeen) {
        return (
            <span className="text-[10px] text-slate-500">{formatLastSeen(lastSeen)}</span>
        );
    }

    return (
        <span className={`${sizeMap[size]} rounded-full bg-slate-600 ${ringMap[size]} ring-black inline-block`} />
    );
}

function formatLastSeen(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'только что';
    if (mins < 60) return `${mins} мин назад`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ч назад`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} д назад`;
    return 'давно';
}
