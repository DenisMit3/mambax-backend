/** Format last seen timestamp to human-readable string */
export const formatLastSeen = (lastSeen?: string | Date): string => {
    if (!lastSeen) return 'был(а) недавно';

    const now = new Date();
    const date = lastSeen instanceof Date ? lastSeen : new Date(lastSeen);

    if (isNaN(date.getTime())) return 'был(а) недавно';

    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'только что';
    if (diffMins < 5) return 'был(а) только что';
    if (diffMins < 60) return `был(а) ${diffMins} мин. назад`;
    if (diffHours < 24) return `был(а) ${diffHours} ч. назад`;
    if (diffDays === 1) return 'был(а) вчера';
    if (diffDays < 7) return `был(а) ${diffDays} дн. назад`;

    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
};
