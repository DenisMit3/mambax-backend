'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Search,
  Filter,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  Ban,
  Eye,
  Edit,
  Shield,
  Crown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Trash2,
  Star,
  MapPin,
  Calendar,
  Heart,
  MessageCircle,
  X,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { adminApi, UserListItem, UserFilters } from '@/services/adminApi';

type UserStatus = 'active' | 'suspended' | 'banned' | 'pending';
type SubscriptionTier = 'free' | 'gold' | 'platinum';

interface FilterState {
  status: string;
  subscription: string;
  verified: string;
  fraudRisk: string;
  search: string;
}

import { GlassCard } from '@/components/ui/GlassCard';
import styles from '../admin.module.css';

function UserCard({ user, onAction }: { user: UserListItem; onAction: (action: string, user: UserListItem) => void }) {
  const router = useRouter();
  const statusColors: Record<string, { bg: string; color: string }> = {
    active: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
    suspended: { bg: 'rgba(249, 115, 22, 0.15)', color: '#f97316' },
    banned: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' },
    pending: { bg: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' },
  };

  const subscriptionColors: Record<string, { bg: string; color: string; label: string }> = {
    free: { bg: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', label: 'Free' },
    gold: { bg: 'rgba(249, 115, 22, 0.15)', color: '#f97316', label: 'Gold' },
    platinum: { bg: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', label: 'Platinum' },
  };

  const fraudLevel = user.fraud_score < 30 ? 'low' : user.fraud_score < 70 ? 'medium' : 'high';
  const fraudColors: Record<string, string> = {
    low: '#10b981',
    medium: '#f97316',
    high: '#ef4444',
  };

  return (
    <GlassCard className="p-5 flex flex-col h-full bg-[var(--admin-glass-bg)] hover:bg-[var(--admin-glass-bg-hover)] border-[var(--admin-glass-border)]">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-semibold text-white relative shrink-0 bg-gradient-to-br from-neon-blue to-neon-purple">
          {user.name?.charAt(0) || 'U'}
          {user.verified && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-[var(--admin-bg)] rounded-full flex items-center justify-center text-white">
              <CheckCircle size={12} />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-[15px] font-semibold text-[var(--admin-text-primary)] truncate">{user.name}, {user.age || '?'}</h4>
            <span
              className="px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide"
              style={statusColors[user.status] || statusColors.pending}
            >
              {user.status}
            </span>
          </div>
          <div className="flex gap-3">
            <span className="flex items-center gap-1 text-xs text-[var(--admin-text-muted)]">
              <MapPin size={12} /> {user.location || 'Unknown'}
            </span>
            <span className="flex items-center gap-1 text-xs text-[var(--admin-text-muted)]">
              <Calendar size={12} /> {new Date(user.registered_at).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase whitespace-nowrap"
          style={subscriptionColors[user.subscription] || subscriptionColors.free}
        >
          {user.subscription === 'platinum' && <Crown size={12} />}
          {subscriptionColors[user.subscription]?.label || 'Free'}
        </div>
      </div>

      <div className="flex gap-4 py-3 border-y border-[var(--admin-glass-border)] mb-3">
        <div className="flex items-center gap-1.5 text-[13px] text-[var(--admin-text-muted)]">
          <Heart size={14} className="text-pink-500" />
          <span>{user.matches}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[13px] text-[var(--admin-text-muted)]">
          <MessageCircle size={14} className="text-blue-500" />
          <span>{user.messages}</span>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: fraudColors[fraudLevel] }}>
          <Shield size={14} />
          <span>{user.fraud_score}%</span>
        </div>
      </div>

      <div className="flex gap-2 mt-auto">
        <button className="flex-1 h-9 flex items-center justify-center rounded-lg bg-slate-800/50 border border-slate-700/50 text-[var(--admin-text-muted)] hover:bg-blue-500/20 hover:text-blue-500 hover:border-blue-500/30 transition-all" onClick={() => router.push(`/admin/users/${user.id}`)}>
          <Eye size={16} />
        </button>
        <button className="flex-1 h-9 flex items-center justify-center rounded-lg bg-slate-800/50 border border-slate-700/50 text-[var(--admin-text-muted)] hover:bg-blue-500/20 hover:text-blue-500 hover:border-blue-500/30 transition-all" onClick={() => onAction('edit', user)}>
          <Edit size={16} />
        </button>
        {user.status === 'active' ? (
          <button className="flex-1 h-9 flex items-center justify-center rounded-lg bg-slate-800/50 border border-slate-700/50 text-[var(--admin-text-muted)] hover:bg-orange-500/20 hover:text-orange-500 hover:border-orange-500/30 transition-all" onClick={() => onAction('suspend', user)}>
            <UserX size={16} />
          </button>
        ) : (
          <button className="flex-1 h-9 flex items-center justify-center rounded-lg bg-slate-800/50 border border-slate-700/50 text-[var(--admin-text-muted)] hover:bg-emerald-500/20 hover:text-emerald-500 hover:border-emerald-500/30 transition-all" onClick={() => onAction('activate', user)}>
            <UserCheck size={16} />
          </button>
        )}
        <button className="flex-1 h-9 flex items-center justify-center rounded-lg bg-slate-800/50 border border-slate-700/50 text-[var(--admin-text-muted)] hover:bg-red-500/20 hover:text-red-500 hover:border-red-500/30 transition-all" onClick={() => onAction('ban', user)}>
          <Ban size={16} />
        </button>
      </div>
    </GlassCard>
  );
}

function UserTable({ users, onAction, selectedUsers, onSelectUser, onSelectAll }: {
  users: UserListItem[];
  onAction: (action: string, user: UserListItem) => void;
  selectedUsers: Set<string>;
  onSelectUser: (userId: string) => void;
  onSelectAll: () => void;
}) {
  const router = useRouter();
  const statusColors: Record<string, { bg: string; color: string }> = {
    active: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
    suspended: { bg: 'rgba(249, 115, 22, 0.15)', color: '#f97316' },
    banned: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' },
    pending: { bg: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' },
  };

  return (
    <GlassCard className="overflow-hidden border-[var(--admin-glass-border)]">
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left border-b border-[var(--admin-glass-border)]">
            <th className="p-4 w-10 bg-slate-800/50">
              <input
                type="checkbox"
                onChange={onSelectAll}
                checked={selectedUsers.size === users.length && users.length > 0}
                className="w-4 h-4 cursor-pointer accent-blue-500 rounded bg-slate-700 border-slate-600"
              />
            </th>
            <th className="p-4 text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wider bg-slate-800/50">User</th>
            <th className="p-4 text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wider bg-slate-800/50">Status</th>
            <th className="p-4 text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wider bg-slate-800/50">Subscription</th>
            <th className="p-4 text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wider bg-slate-800/50">Location</th>
            <th className="p-4 text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wider bg-slate-800/50">Fraud Score</th>
            <th className="p-4 text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wider bg-slate-800/50">Last Active</th>
            <th className="p-4 text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wider bg-slate-800/50">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <motion.tr
              key={user.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`hover:bg-slate-800/30 border-b border-[var(--admin-glass-border)] last:border-0 ${selectedUsers.has(user.id) ? 'bg-blue-500/10' : ''}`}
            >
              <td className="p-4">
                <input
                  type="checkbox"
                  checked={selectedUsers.has(user.id)}
                  onChange={() => onSelectUser(user.id)}
                  className="w-4 h-4 cursor-pointer accent-blue-500 rounded bg-slate-700 border-slate-600"
                />
              </td>
              <td className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-semibold text-white relative shrink-0 bg-gradient-to-br from-neon-blue to-neon-purple">
                    {user.name?.charAt(0) || 'U'}
                    {user.verified && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-[var(--admin-bg)] rounded-full" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-[var(--admin-text-primary)]">{user.name}, {user.age || '?'}</span>
                    <span className="text-xs text-[var(--admin-text-muted)]">{user.email || 'No email'}</span>
                  </div>
                </div>
              </td>
              <td className="p-4">
                <span
                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize"
                  style={statusColors[user.status] || statusColors.pending}
                >
                  {user.status}
                </span>
              </td>
              <td className="p-4">
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${user.subscription === 'free' ? 'bg-slate-500/15 text-slate-400' :
                  user.subscription === 'gold' ? 'bg-orange-500/15 text-orange-500' :
                    'bg-purple-500/15 text-purple-500'
                  }`}>
                  {user.subscription}
                </span>
              </td>
              <td className="p-4 text-sm text-[var(--admin-text-secondary)]">{user.location || 'Unknown'}</td>
              <td className="p-4">
                <div className="flex items-center gap-2 w-[100px]">
                  <div className="h-1.5 flex-1 rounded-full bg-slate-700 overflow-hidden">
                    <div className="h-full rounded-full" style={{
                      width: `${user.fraud_score}%`,
                      background: user.fraud_score < 30 ? '#10b981' : user.fraud_score < 70 ? '#f97316' : '#ef4444'
                    }} />
                  </div>
                  <span className="text-xs text-[var(--admin-text-muted)] w-8 text-right">{user.fraud_score}%</span>
                </div>
              </td>
              <td className="p-4 text-sm text-[var(--admin-text-secondary)]">{user.last_active ? new Date(user.last_active).toLocaleDateString() : 'Never'}</td>
              <td className="p-4">
                <div className="flex gap-1.5">
                  <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800/50 border border-slate-700/50 text-[var(--admin-text-muted)] hover:bg-blue-500/20 hover:text-blue-500 transition-colors" onClick={() => router.push(`/admin/users/${user.id}`)}><Eye size={14} /></button>
                  <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800/50 border border-slate-700/50 text-[var(--admin-text-muted)] hover:bg-blue-500/20 hover:text-blue-500 transition-colors" onClick={() => onAction('edit', user)}><Edit size={14} /></button>
                  <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800/50 border border-slate-700/50 text-[var(--admin-text-muted)] hover:bg-red-500/20 hover:text-red-500 transition-colors" onClick={() => onAction('ban', user)}><Ban size={14} /></button>
                </div>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </GlassCard>
  );
}

export default function UsersPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    subscription: 'all',
    verified: 'all',
    fraudRisk: 'all',
    search: '',
  });
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const itemsPerPage = 20;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiFilters: UserFilters = {
        page: currentPage,
        page_size: itemsPerPage,
        status: filters.status !== 'all' ? filters.status : undefined,
        subscription: filters.subscription !== 'all' ? filters.subscription : undefined,
        verified: filters.verified === 'verified' ? true : filters.verified === 'unverified' ? false : undefined,
        search: filters.search || undefined,
        fraud_risk: filters.fraudRisk !== 'all' ? filters.fraudRisk : undefined,
      };

      const response = await adminApi.users.list(apiFilters);
      setUsers(response.users);
      setTotalUsers(response.total);
      setTotalPages(response.total_pages);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters, itemsPerPage]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage === 1) {
        fetchUsers();
      } else {
        setCurrentPage(1);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const handleAction = async (action: string, user: UserListItem) => {
    if (action === 'view') {
      window.location.href = `/admin/users/${user.id}`;
      return;
    }

    // Map actions to backend expected format
    const actionMap: Record<string, 'verify' | 'suspend' | 'ban' | 'activate' | 'unverify'> = {
      'suspend': 'suspend',
      'ban': 'ban',
      'activate': 'activate',
      'verify': 'verify',
    };

    const mappedAction = actionMap[action];
    if (mappedAction) {
      try {
        await adminApi.users.action(user.id, mappedAction);
        fetchUsers(); // Refresh the list
      } catch (err) {
        console.error(`Failed to ${action} user:`, err);
      }
    }
  };

  const handleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map(u => u.id)));
    }
  };

  const handleBulkAction = async (action: string) => {
    const actionMap: Record<string, 'verify' | 'suspend' | 'ban' | 'activate'> = {
      'verify': 'verify',
      'suspend': 'suspend',
      'ban': 'ban',
      'activate': 'activate',
    };

    const mappedAction = actionMap[action];
    if (mappedAction && selectedUsers.size > 0) {
      try {
        await adminApi.users.bulkAction(Array.from(selectedUsers), mappedAction);
        setSelectedUsers(new Set());
        fetchUsers();
      } catch (err) {
        console.error(`Failed to bulk ${action} users:`, err);
      }
    }
  };


  return (
    <div className={styles.pageContainer}>
      {/* Header */}
      <div className={styles.headerSection}>
        <div className={styles.headerContent}>
          <h1 className={styles.headerTitle}>User Management</h1>
          <p className={styles.headerDescription}>{totalUsers.toLocaleString()} users total</p>
        </div>
        <div className="flex gap-3">
          <button className={styles.secondaryButton} onClick={fetchUsers}>
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <GlassCard className="p-4 mb-6 sticky top-[80px] z-20 bg-[var(--admin-glass-bg)] backdrop-blur-xl border border-[var(--admin-glass-border)] rounded-2xl">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="relative flex-1 min-w-[300px]">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-secondary)]" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-10 py-2.5 bg-[var(--admin-glass-bg-light)] border border-[var(--admin-glass-border)] rounded-xl text-[var(--admin-text-primary)] placeholder-[var(--admin-text-muted)] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-sans text-sm"
            />
            {filters.search && (
              <button className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]" onClick={() => setFilters({ ...filters, search: '' })}>
                <X size={16} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 overflow-x-auto pb-1 no-scrollbar">
            <select
              value={filters.status}
              onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setCurrentPage(1); }}
              className="px-3 py-2.5 bg-[var(--admin-glass-bg-light)] border border-[var(--admin-glass-border)] rounded-xl text-sm text-[var(--admin-text-primary)] outline-none min-w-[120px]"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="banned">Banned</option>
              <option value="pending">Pending</option>
            </select>

            <select
              value={filters.subscription}
              onChange={(e) => { setFilters({ ...filters, subscription: e.target.value }); setCurrentPage(1); }}
              className="px-3 py-2.5 bg-[var(--admin-glass-bg-light)] border border-[var(--admin-glass-border)] rounded-xl text-sm text-[var(--admin-text-primary)] outline-none min-w-[120px]"
            >
              <option value="all">All Plans</option>
              <option value="free">Free</option>
              <option value="gold">Gold</option>
              <option value="platinum">Platinum</option>
            </select>

            <select
              value={filters.verified}
              onChange={(e) => { setFilters({ ...filters, verified: e.target.value }); setCurrentPage(1); }}
              className="px-3 py-2.5 bg-[var(--admin-glass-bg-light)] border border-[var(--admin-glass-border)] rounded-xl text-sm text-[var(--admin-text-primary)] outline-none min-w-[120px]"
            >
              <option value="all">All Verification</option>
              <option value="verified">Verified</option>
              <option value="unverified">Unverified</option>
            </select>

            <div className="h-8 w-px bg-[var(--admin-glass-border)] mx-1" />

            <div className="flex bg-[var(--admin-glass-bg-light)] rounded-lg p-1 border border-[var(--admin-glass-border)]">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-md transition-all ${viewMode === 'table' ? 'bg-[var(--admin-glass-bg-hover)] text-[var(--admin-text-primary)] shadow-sm' : 'text-[var(--admin-text-muted)] hover:text-[var(--admin-text-primary)]'}`}
              >
                <MoreVertical size={18} className="rotate-90" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-[var(--admin-glass-bg-hover)] text-[var(--admin-text-primary)] shadow-sm' : 'text-[var(--admin-text-muted)] hover:text-[var(--admin-text-primary)]'}`}
              >
                <Users size={18} />
              </button>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {selectedUsers.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center justify-between backdrop-blur-md"
          >
            <div className="flex items-center gap-3 px-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold">
                {selectedUsers.size}
              </span>
              <span className="text-sm font-medium text-blue-200">User{selectedUsers.size > 1 ? 's' : ''} selected</span>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 text-xs font-semibold transition-colors" onClick={() => handleBulkAction('activate')}>
                Activate
              </button>
              <button className="px-3 py-1.5 rounded-lg bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 text-xs font-semibold transition-colors" onClick={() => handleBulkAction('suspend')}>
                Suspend
              </button>
              <button className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-xs font-semibold transition-colors" onClick={() => handleBulkAction('ban')}>
                Ban
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-[var(--admin-text-muted)]">
          <Loader2 size={40} className="animate-spin mb-4 text-[var(--neon-blue)]" />
          <p>Loading users...</p>
        </div>
      ) : error ? (
        <GlassCard className="p-8 text-center border-red-500/30">
          <AlertTriangle size={32} className="mx-auto text-red-500 mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Failed to load users</h3>
          <p className="text-[var(--admin-text-secondary)] mb-6">{error}</p>
          <button className={styles.primaryButton} onClick={fetchUsers}>
            <RefreshCw size={16} />
            Try Again
          </button>
        </GlassCard>
      ) : users.length === 0 ? (
        <GlassCard className="p-12 text-center border-dashed border-[var(--admin-glass-border)]">
          <Users size={48} className="mx-auto text-[var(--admin-text-muted)] mb-4 opacity-50" />
          <h3 className="text-lg font-bold text-white mb-2">No users found</h3>
          <p className="text-[var(--admin-text-secondary)]">Try adjusting your filters or search terms</p>
        </GlassCard>
      ) : (
        <>
          {viewMode === 'table' ? (
            <UserTable
              users={users}
              onAction={handleAction}
              selectedUsers={selectedUsers}
              onSelectUser={handleSelectUser}
              onSelectAll={handleSelectAll}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {users.map((user) => (
                <UserCard key={user.id} user={user} onAction={handleAction} />
              ))}
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between mt-8">
            <span className="text-sm text-[var(--admin-text-secondary)]">
              Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalUsers)} of {totalUsers}
            </span>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="p-2 rounded-lg bg-[var(--admin-glass-bg-light)] border border-[var(--admin-glass-border)] text-[var(--admin-text-secondary)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--admin-glass-bg-hover)] transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5 && currentPage > 3) {
                  pageNum = currentPage - 3 + i;
                  if (pageNum > totalPages) pageNum -= (pageNum - totalPages);
                }
                if (pageNum <= 0) pageNum = i + 1; // Fallback

                return (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-9 h-9 rounded-lg border text-sm font-medium transition-colors ${currentPage === pageNum
                      ? 'bg-[var(--admin-gradient-primary)] text-white border-transparent'
                      : 'bg-[var(--admin-glass-bg-light)] border-[var(--admin-glass-border)] text-[var(--admin-text-secondary)] hover:bg-[var(--admin-glass-bg-hover)]'
                      }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="p-2 rounded-lg bg-[var(--admin-glass-bg-light)] border border-[var(--admin-glass-border)] text-[var(--admin-text-secondary)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--admin-glass-bg-hover)] transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
