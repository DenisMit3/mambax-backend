'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Users, RefreshCw, Loader2, AlertTriangle, UserPlus, Trash2, Search } from 'lucide-react';
import { adminApi, UserListItem, UserFilters } from '@/services/admin';

import { FilterState, ViewMode } from './types';
import UserCard from './UserCard';
import { UsersTable } from './UsersTable';
import UsersFilters from './UsersFilters';
import { UsersBulkActions } from './UsersBulkActions';
import { UsersPagination } from './UsersPagination';
import { CreateUserModal } from './CreateUserModal';

const ITEMS_PER_PAGE = 20;

export default function UsersPage() {
  const router = useRouter();

  // Состояние страницы
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    subscription: 'all',
    verified: 'all',
    fraudRisk: 'all',
    search: '',
  });
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  // Данные
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // UI-состояния
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null); // userId

  // Загрузка списка пользователей
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiFilters: UserFilters = {
        page: currentPage,
        page_size: ITEMS_PER_PAGE,
        status: filters.status !== 'all' ? filters.status : undefined,
        subscription: filters.subscription !== 'all' ? filters.subscription : undefined,
        verified:
          filters.verified === 'verified'
            ? true
            : filters.verified === 'unverified'
              ? false
              : undefined,
        search: filters.search || undefined,
        fraud_risk: filters.fraudRisk !== 'all' ? filters.fraudRisk : undefined,
      };

      const response = await adminApi.users.list(apiFilters);
      setUsers(response.users);
      setTotalUsers(response.total);
      setTotalPages(response.total_pages);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err instanceof Error ? err.message : 'Не удалось загрузить пользователей');
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters]);

  // Перезагрузка при смене страницы / фильтров
  useEffect(() => {
    let cancelled = false;
    fetchUsers().then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [fetchUsers]);

  // Debounce для поиска — сброс на первую страницу
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage === 1) {
        fetchUsers();
      } else {
        setCurrentPage(1);
      }
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search]);

  // Действие над одним пользователем
  const handleAction = async (action: string, user: UserListItem) => {
    if (action === 'view') {
      router.push(`/admin/users/${user.id}`);
      return;
    }

    if (action === 'delete') {
      if (
        !confirm(
          `Вы уверены, что хотите ПОЛНОСТЬЮ удалить пользователя "${user.name}" из базы данных? Это действие необратимо.`
        )
      ) {
        return;
      }
      setDeletingUserId(user.id);
      try {
        await adminApi.users.delete(user.id);
        fetchUsers();
      } catch (err) {
        console.error('Failed to delete user:', err);
        alert(err instanceof Error ? err.message : 'Ошибка удаления пользователя');
      } finally {
        setDeletingUserId(null);
      }
      return;
    }

    // Остальные действия: suspend, ban, activate, verify
    const actionMap: Record<string, 'verify' | 'suspend' | 'ban' | 'activate' | 'unverify'> = {
      suspend: 'suspend',
      ban: 'ban',
      activate: 'activate',
      verify: 'verify',
    };
    const mapped = actionMap[action];
    if (mapped) {
      setActionInProgress(user.id);
      // Оптимистичное обновление статуса в UI
      const statusMap: Record<string, string> = {
        ban: 'banned',
        suspend: 'suspended',
        activate: 'active',
      };
      if (statusMap[action]) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === user.id ? { ...u, status: statusMap[action] } : u
          )
        );
      }
      try {
        await adminApi.users.action(user.id, mapped);
        await fetchUsers();
      } catch (err) {
        console.error(`Failed to ${action} user:`, err);
        // Откат — перезагрузить реальные данные
        await fetchUsers();
      } finally {
        setActionInProgress(null);
      }
    }
  };

  // Выбор пользователей (чекбоксы)
  const handleSelectUser = (userId: string) => {
    const next = new Set(selectedUsers);
    next.has(userId) ? next.delete(userId) : next.add(userId);
    setSelectedUsers(next);
  };

  const handleSelectAll = () => {
    setSelectedUsers(
      selectedUsers.size === users.length ? new Set() : new Set(users.map((u) => u.id))
    );
  };

  // Массовое действие
  const handleBulkAction = async (action: string) => {
    const actionMap: Record<string, 'verify' | 'suspend' | 'ban' | 'activate'> = {
      verify: 'verify',
      suspend: 'suspend',
      ban: 'ban',
      activate: 'activate',
    };
    const mapped = actionMap[action];
    if (mapped && selectedUsers.size > 0) {
      try {
        await adminApi.users.bulkAction(Array.from(selectedUsers), mapped);
        setSelectedUsers(new Set());
        fetchUsers();
      } catch (err) {
        console.error(`Failed to bulk ${action} users:`, err);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Управление пользователями</h1>
          <p className="text-sm text-white/50 mt-1">
            {totalUsers.toLocaleString()} пользователей
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchUsers}
            className="flex items-center gap-2 border border-white/10 bg-white/5 text-white rounded-xl px-4 py-2.5 text-sm hover:bg-white/10 transition-colors"
          >
            <RefreshCw size={16} />
            Обновить
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-2.5 text-sm hover:bg-blue-700 transition-colors"
          >
            <UserPlus size={16} />
            Добавить
          </button>
        </div>
      </div>

      {/* Фильтры и поиск */}
      <UsersFilters
        filters={filters}
        onFiltersChange={setFilters}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onResetPage={() => setCurrentPage(1)}
      />

      {/* Панель массовых действий */}
      <UsersBulkActions selectedCount={selectedUsers.size} onBulkAction={handleBulkAction} />

      {/* Контент */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-white/40">
          <Loader2 size={40} className="animate-spin mb-4 text-blue-500" />
          <p>Загрузка пользователей...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-red-500/5 border border-red-500/30 rounded-2xl">
          <AlertTriangle size={32} className="mx-auto text-red-500 mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Не удалось загрузить пользователей</h3>
          <p className="text-white/50 mb-6">{error}</p>
          <button
            onClick={fetchUsers}
            className="flex items-center gap-2 mx-auto bg-blue-600 text-white rounded-xl px-4 py-2.5 text-sm hover:bg-blue-700 transition-colors"
          >
            <RefreshCw size={16} />
            Повторить
          </button>
        </div>
      ) : users.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-white/10 rounded-2xl">
          <Users size={48} className="mx-auto text-white/20 mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Пользователи не найдены</h3>
          <p className="text-white/50">Попробуйте изменить фильтры или поисковый запрос</p>
        </div>
      ) : (
        <>
          {viewMode === 'table' ? (
            <UsersTable
              users={users}
              onAction={handleAction}
              selectedUsers={selectedUsers}
              onSelectUser={handleSelectUser}
              onSelectAll={handleSelectAll}
              actionInProgress={actionInProgress}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {users.map((user) => (
                <UserCard key={user.id} user={user} onAction={handleAction} actionInProgress={actionInProgress} />
              ))}
            </div>
          )}

          <UsersPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalUsers={totalUsers}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </>
      )}

      {/* Модалка создания пользователя */}
      <CreateUserModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={fetchUsers}
      />
    </div>
  );
}
