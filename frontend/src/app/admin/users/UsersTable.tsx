'use client';

import { useRouter } from 'next/navigation';
import {
  Eye,
  Ban,
  Trash2,
  UserCheck,
  UserX,
  Shield,
  CheckCircle2,
  Crown,
  Mail,
} from 'lucide-react';
import { UserListItem } from '@/services/admin';

// === Пропсы компонента ===
interface UsersTableProps {
  users: UserListItem[];
  onAction: (action: string, user: UserListItem) => void;
  selectedUsers: Set<string>;
  onSelectUser: (userId: string) => void;
  onSelectAll: () => void;
}

// === Маппинг статусов на русские названия ===
const STATUS_LABELS: Record<string, string> = {
  active: 'Активен',
  suspended: 'Приостановлен',
  banned: 'Заблокирован',
  pending: 'Ожидание',
};

// === Стили бейджей статусов (Tailwind-классы) ===
const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  active: { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  suspended: { bg: 'bg-orange-500/15', text: 'text-orange-400' },
  banned: { bg: 'bg-red-500/15', text: 'text-red-400' },
  pending: { bg: 'bg-purple-500/15', text: 'text-purple-400' },
};

// === Стили бейджей подписок ===
const SUBSCRIPTION_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  free: { bg: 'bg-slate-500/15', text: 'text-slate-400', label: 'Бесплатный' },
  gold: { bg: 'bg-orange-500/15', text: 'text-orange-400', label: 'Gold' },
  platinum: { bg: 'bg-purple-500/15', text: 'text-purple-400', label: 'Platinum' },
};

// === Форматирование даты ===
function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Никогда';
  try {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return 'Никогда';
  }
}

// === Цвет фрод-скора ===
function getFraudColor(score: number): string {
  if (score < 30) return 'bg-emerald-500';
  if (score < 70) return 'bg-orange-500';
  return 'bg-red-500';
}

function getFraudTextColor(score: number): string {
  if (score < 30) return 'text-emerald-400';
  if (score < 70) return 'text-orange-400';
  return 'text-red-400';
}

// === Основной компонент таблицы пользователей ===
export function UsersTable({
  users,
  onAction,
  selectedUsers,
  onSelectUser,
  onSelectAll,
}: UsersTableProps) {
  const router = useRouter();

  const allSelected = users.length > 0 && selectedUsers.size === users.length;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0f1225]/80 backdrop-blur-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          {/* Заголовок таблицы */}
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="p-4 w-12 bg-slate-800/60">
                <input
                  type="checkbox"
                  onChange={onSelectAll}
                  checked={allSelected}
                  className="w-4 h-4 cursor-pointer accent-blue-500 rounded bg-slate-700 border-slate-600"
                />
              </th>
              <th className="p-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-800/60">
                Пользователь
              </th>
              <th className="p-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-800/60">
                Статус
              </th>
              <th className="p-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-800/60">
                Подписка
              </th>
              <th className="p-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-800/60">
                Локация
              </th>
              <th className="p-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-800/60">
                Фрод-скор
              </th>
              <th className="p-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-800/60">
                Последняя активность
              </th>
              <th className="p-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-800/60">
                Онлайн
              </th>
              <th className="p-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-800/60">
                Действия
              </th>
            </tr>
          </thead>

          {/* Тело таблицы */}
          <tbody>
            {users.map((user) => {
              const statusStyle = STATUS_STYLES[user.status] || STATUS_STYLES.pending;
              const statusLabel = STATUS_LABELS[user.status] || user.status;
              const subStyle = SUBSCRIPTION_STYLES[user.subscription] || SUBSCRIPTION_STYLES.free;
              const isSelected = selectedUsers.has(user.id);
              const isSuspended = user.status === 'suspended';

              return (
                <tr
                  key={user.id}
                  onClick={() => router.push(`/admin/users/${user.id}`)}
                  className={`
                    border-b border-white/[0.04] last:border-0 cursor-pointer
                    transition-colors duration-150
                    hover:bg-white/5
                    ${isSelected ? 'bg-blue-500/10' : ''}
                  `}
                >
                  {/* Чекбокс */}
                  <td
                    className="p-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onSelectUser(user.id)}
                      className="w-4 h-4 cursor-pointer accent-blue-500 rounded bg-slate-700 border-slate-600"
                    />
                  </td>

                  {/* Пользователь: аватар + имя + email */}
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {/* Аватар с реальным фото или первой буквой */}
                      <div className="relative shrink-0 w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold text-white bg-gradient-to-br from-blue-500 to-purple-600">
                        {user.photo_url ? (
                          <img
                            src={user.photo_url.startsWith('http') ? user.photo_url : `/api_proxy${user.photo_url}`}
                            alt={user.name || ''}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).parentElement!.textContent = user.name?.charAt(0)?.toUpperCase() || 'U';
                            }}
                          />
                        ) : (
                          user.name?.charAt(0)?.toUpperCase() || 'U'
                        )}
                        {/* Зелёная точка верификации */}
                        {user.verified && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[#0f1225] rounded-full" />
                        )}
                        {/* Онлайн-индикатор */}
                        {user.is_online && (
                          <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-[#0f1225] rounded-full" />
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-white truncate">
                          {user.name || 'Без имени'}{user.age ? `, ${user.age}` : ''}
                        </span>
                        <span className="text-xs text-slate-400 truncate flex items-center gap-1">
                          <Mail size={10} className="shrink-0 text-slate-500" />
                          {user.email || 'Нет email'}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Статус */}
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${statusStyle.bg} ${statusStyle.text}`}
                    >
                      <Shield size={10} />
                      {statusLabel}
                    </span>
                  </td>

                  {/* Подписка */}
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${subStyle.bg} ${subStyle.text}`}
                    >
                      {user.subscription === 'platinum' && <Crown size={10} />}
                      {subStyle.label}
                    </span>
                  </td>

                  {/* Локация */}
                  <td className="p-4">
                    <span className="text-sm text-slate-300">
                      {user.location || 'Неизвестно'}
                    </span>
                  </td>

                  {/* Фрод-скор: прогресс-бар + процент */}
                  <td className="p-4">
                    <div className="flex items-center gap-2 w-[110px]">
                      <div className="h-1.5 flex-1 rounded-full bg-slate-700/60 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${getFraudColor(user.fraud_score)}`}
                          style={{ width: `${Math.min(user.fraud_score, 100)}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium w-9 text-right ${getFraudTextColor(user.fraud_score)}`}>
                        {user.fraud_score}%
                      </span>
                    </div>
                  </td>

                  {/* Последняя активность */}
                  <td className="p-4">
                    <span className="text-sm text-slate-400">
                      {formatDate(user.last_active)}
                    </span>
                  </td>

                  {/* Онлайн-статус */}
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${user.is_online ? 'text-green-400' : 'text-slate-500'}`}>
                      <span className={`w-2 h-2 rounded-full ${user.is_online ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.5)]' : 'bg-slate-600'}`} />
                      {user.is_online ? 'Онлайн' : 'Офлайн'}
                    </span>
                  </td>

                  {/* Кнопки действий */}
                  <td
                    className="p-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-1.5">
                      {/* Просмотр */}
                      <button
                        onClick={() => router.push(`/admin/users/${user.id}`)}
                        title="Просмотр профиля"
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-700/50 bg-slate-800/50 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 hover:border-blue-500/30 transition-all duration-150"
                      >
                        <Eye size={15} />
                      </button>

                      {/* Активировать / Приостановить */}
                      {isSuspended ? (
                        <button
                          onClick={() => onAction('activate', user)}
                          title="Активировать"
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-700/50 bg-slate-800/50 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/30 transition-all duration-150"
                        >
                          <UserCheck size={15} />
                        </button>
                      ) : (
                        <button
                          onClick={() => onAction('suspend', user)}
                          title="Приостановить"
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-700/50 bg-slate-800/50 text-orange-400 hover:bg-orange-500/20 hover:text-orange-300 hover:border-orange-500/30 transition-all duration-150"
                        >
                          <UserX size={15} />
                        </button>
                      )}

                      {/* Заблокировать */}
                      <button
                        onClick={() => onAction('ban', user)}
                        title="Заблокировать"
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-700/50 bg-slate-800/50 text-red-400 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/30 transition-all duration-150"
                      >
                        <Ban size={15} />
                      </button>

                      {/* Удалить */}
                      <button
                        onClick={() => onAction('delete', user)}
                        title="Удалить из базы"
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-700/50 bg-slate-800/50 text-red-400 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/30 transition-all duration-150"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Пустое состояние */}
      {users.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <CheckCircle2 size={40} className="mb-3 text-slate-600" />
          <p className="text-sm">Пользователи не найдены</p>
        </div>
      )}
    </div>
  );
}
