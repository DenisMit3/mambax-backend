'use client';

import { useRouter } from 'next/navigation';
import {
  Eye,
  Ban,
  Trash2,
  UserCheck,
  UserX,
  Shield,
  Heart,
  MessageCircle,
  MapPin,
  Calendar,
  Crown,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { UserListItem } from '@/services/admin';

interface Props {
  user: UserListItem;
  onAction: (action: string, user: UserListItem) => void;
  actionInProgress?: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Активен',
  suspended: 'Приостановлен',
  banned: 'Заблокирован',
  pending: 'Ожидание',
};

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  suspended: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  banned: 'bg-red-500/20 text-red-400 border-red-500/30',
  pending: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

const SUBSCRIPTION_STYLES: Record<string, { bg: string; text: string; glow?: string }> = {
  free: { bg: 'bg-white/10', text: 'text-gray-400' },
  gold: { bg: 'bg-orange-500/20', text: 'text-orange-400', glow: 'shadow-[0_0_8px_rgba(251,146,60,0.3)]' },
  platinum: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
};

function getFraudColor(score: number) {
  if (score >= 70) return 'text-red-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-emerald-400';
}

export default function UserCard({ user, onAction, actionInProgress }: Props) {
  const router = useRouter();
  const isActioning = actionInProgress === user.id;

  const statusStyle = STATUS_STYLES[user.status] || STATUS_STYLES.pending;
  const subStyle = SUBSCRIPTION_STYLES[user.subscription] || SUBSCRIPTION_STYLES.free;
  const initial = user.name?.charAt(0)?.toUpperCase() || '?';

  const handleCardClick = () => {
    router.push(`/admin/users/${user.id}`);
  };

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div
      onClick={handleCardClick}
      className="relative bg-[#0f1225]/80 backdrop-blur border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all cursor-pointer group"
    >
      {/* Бейдж подписки — верхний правый угол */}
      <div className={`absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border border-white/10 ${subStyle.bg} ${subStyle.text} ${subStyle.glow || ''}`}>
        {user.subscription === 'platinum' && <Crown className="w-3 h-3" />}
        {user.subscription === 'gold' && <Crown className="w-3 h-3" />}
        {user.subscription === 'free' ? 'Free' : user.subscription === 'gold' ? 'Gold' : 'Platinum'}
      </div>

      {/* Верхняя секция: аватар + инфо */}
      <div className="flex items-start gap-3.5">
        {/* Аватар */}
        <div className="relative flex-shrink-0">
          <div className="w-14 h-14 rounded-xl overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
            {user.photo_url ? (
              <img
                src={user.photo_url.startsWith('http') ? user.photo_url : `/api_proxy${user.photo_url}`}
                alt={user.name || ''}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).parentElement!.textContent = initial;
                }}
              />
            ) : (
              initial
            )}
          </div>
          {user.verified && (
            <div className="absolute -bottom-1 -right-1 bg-[#0f1225] rounded-full p-0.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 fill-emerald-400/20" />
            </div>
          )}
          {user.is_online && (
            <div className="absolute top-0 right-0 w-3 h-3 bg-green-400 border-2 border-[#0f1225] rounded-full" />
          )}
        </div>

        {/* Имя, email, локация, дата */}
        <div className="min-w-0 flex-1 pr-16">
          <div className="font-bold text-white truncate">
            {user.name}{user.age ? `, ${user.age}` : ''}
          </div>
          {user.email && (
            <div className="text-xs text-gray-500 truncate mt-0.5">{user.email}</div>
          )}
          {user.location && (
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{user.location}</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-xs text-gray-600 mt-0.5">
            <Calendar className="w-3 h-3 flex-shrink-0" />
            <span>{new Date(user.registered_at).toLocaleDateString('ru-RU')}</span>
          </div>
        </div>
      </div>

      {/* Статус */}
      <div className="mt-3">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusStyle}`}>
          {STATUS_LABELS[user.status] || user.status}
        </span>
      </div>

      {/* Статистика */}
      <div className="flex items-center justify-between mt-4 py-3 border-y border-white/10 text-xs">
        <div className="flex items-center gap-1.5 text-pink-400">
          <Heart className="w-3.5 h-3.5" />
          <span>{user.matches}</span>
        </div>
        <div className="flex items-center gap-1.5 text-blue-400">
          <MessageCircle className="w-3.5 h-3.5" />
          <span>{user.messages}</span>
        </div>
        <div className={`flex items-center gap-1.5 ${getFraudColor(user.fraud_score)}`}>
          <Shield className="w-3.5 h-3.5" />
          <span>{user.fraud_score}%</span>
        </div>
      </div>

      {/* Кнопки действий */}
      <div className="flex items-center justify-between mt-3 gap-1.5">
        {isActioning ? (
          <div className="w-full flex items-center justify-center py-1">
            <Loader2 size={18} className="animate-spin text-blue-400" />
          </div>
        ) : (
        <>
        {/* Просмотр */}
        <button
          onClick={(e) => { stop(e); onAction('view', user); }}
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors"
          title="Просмотр"
        >
          <Eye className="w-4 h-4" />
        </button>

        {/* Активировать / Приостановить */}
        {user.status === 'suspended' || user.status === 'banned' || user.status === 'pending' ? (
          <button
            onClick={(e) => { stop(e); onAction('activate', user); }}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors"
            title="Активировать"
          >
            <UserCheck className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={(e) => { stop(e); onAction('suspend', user); }}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 transition-colors"
            title="Приостановить"
          >
            <UserX className="w-4 h-4" />
          </button>
        )}

        {/* Заблокировать */}
        <button
          onClick={(e) => { stop(e); onAction('ban', user); }}
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
          title="Заблокировать"
        >
          <Ban className="w-4 h-4" />
        </button>

        {/* Удалить */}
        <button
          onClick={(e) => { stop(e); onAction('delete', user); }}
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
          title="Удалить"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        </>
        )}
      </div>
    </div>
  );
}
