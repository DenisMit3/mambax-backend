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
  Mail,
  Shield,
  Crown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  Upload,
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
  const fraudColors = {
    low: '#10b981',
    medium: '#f97316',
    high: '#ef4444',
  };

  return (
    <motion.div
      className="user-card"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4 }}
    >
      <div className="user-header">
        <div className="user-avatar">
          {user.name?.charAt(0) || 'U'}
          {user.verified && (
            <div className="verified-badge">
              <CheckCircle size={12} />
            </div>
          )}
        </div>
        <div className="user-info">
          <div className="user-name-row">
            <h4>{user.name}, {user.age || '?'}</h4>
            <span
              className="user-status"
              style={statusColors[user.status] || statusColors.pending}
            >
              {user.status}
            </span>
          </div>
          <div className="user-meta">
            <span><MapPin size={12} /> {user.location || 'Unknown'}</span>
            <span><Calendar size={12} /> {new Date(user.registered_at).toLocaleDateString()}</span>
          </div>
        </div>
        <div
          className="subscription-badge"
          style={subscriptionColors[user.subscription] || subscriptionColors.free}
        >
          {user.subscription === 'platinum' && <Crown size={12} />}
          {subscriptionColors[user.subscription]?.label || 'Free'}
        </div>
      </div>

      <div className="user-stats">
        <div className="stat">
          <Heart size={14} style={{ color: '#ec4899' }} />
          <span>{user.matches}</span>
        </div>
        <div className="stat">
          <MessageCircle size={14} style={{ color: '#3b82f6' }} />
          <span>{user.messages}</span>
        </div>
        <div className="stat fraud-score" style={{ color: fraudColors[fraudLevel] }}>
          <Shield size={14} />
          <span>{user.fraud_score}%</span>
        </div>
      </div>

      <div className="user-actions">
        <button className="action-btn" onClick={() => router.push(`/admin/users/${user.id}`)}>
          <Eye size={16} />
        </button>
        <button className="action-btn" onClick={() => onAction('edit', user)}>
          <Edit size={16} />
        </button>
        <button className="action-btn" onClick={() => onAction('mail', user)}>
          <Mail size={16} />
        </button>
        {user.status === 'active' ? (
          <button className="action-btn warning" onClick={() => onAction('suspend', user)}>
            <UserX size={16} />
          </button>
        ) : (
          <button className="action-btn success" onClick={() => onAction('activate', user)}>
            <UserCheck size={16} />
          </button>
        )}
        <button className="action-btn danger" onClick={() => onAction('ban', user)}>
          <Ban size={16} />
        </button>
      </div>

      <style jsx>{`
        .user-card {
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 16px;
          padding: 20px;
          transition: all 0.3s ease;
        }
        
        .user-card:hover {
          border-color: rgba(59, 130, 246, 0.3);
          box-shadow: 0 0 30px rgba(59, 130, 246, 0.15);
        }
        
        .user-header {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          margin-bottom: 16px;
        }
        
        .user-avatar {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: 600;
          color: white;
          position: relative;
          flex-shrink: 0;
        }
        
        .verified-badge {
          position: absolute;
          bottom: -4px;
          right: -4px;
          width: 20px;
          height: 20px;
          background: #10b981;
          border: 2px solid rgba(15, 23, 42, 1);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        
        .user-info {
          flex: 1;
          min-width: 0;
        }
        
        .user-name-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }
        
        .user-name-row h4 {
          font-size: 15px;
          font-weight: 600;
          color: #f1f5f9;
          margin: 0;
        }
        
        .user-status {
          font-size: 11px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 12px;
          text-transform: uppercase;
        }
        
        .user-meta {
          display: flex;
          gap: 12px;
        }
        
        .user-meta span {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: #64748b;
        }
        
        .subscription-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 20px;
          text-transform: uppercase;
        }
        
        .user-stats {
          display: flex;
          gap: 16px;
          padding: 12px 0;
          border-top: 1px solid rgba(148, 163, 184, 0.1);
          border-bottom: 1px solid rgba(148, 163, 184, 0.1);
          margin-bottom: 12px;
        }
        
        .stat {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: #94a3b8;
        }
        
        .fraud-score {
          margin-left: auto;
          font-weight: 600;
        }
        
        .user-actions {
          display: flex;
          gap: 8px;
        }
        
        .action-btn {
          flex: 1;
          padding: 10px;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 10px;
          color: #94a3b8;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .action-btn:hover {
          background: rgba(59, 130, 246, 0.2);
          color: #3b82f6;
          border-color: rgba(59, 130, 246, 0.3);
        }
        
        .action-btn.warning:hover {
          background: rgba(249, 115, 22, 0.2);
          color: #f97316;
          border-color: rgba(249, 115, 22, 0.3);
        }
        
        .action-btn.success:hover {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
          border-color: rgba(16, 185, 129, 0.3);
        }
        
        .action-btn.danger:hover {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
          border-color: rgba(239, 68, 68, 0.3);
        }
      `}</style>
    </motion.div>
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
    <div className="user-table-container">
      <table className="user-table">
        <thead>
          <tr>
            <th className="checkbox-col">
              <input
                type="checkbox"
                onChange={onSelectAll}
                checked={selectedUsers.size === users.length && users.length > 0}
              />
            </th>
            <th>User</th>
            <th>Status</th>
            <th>Subscription</th>
            <th>Location</th>
            <th>Fraud Score</th>
            <th>Last Active</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <motion.tr
              key={user.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={selectedUsers.has(user.id) ? 'selected' : ''}
            >
              <td className="checkbox-col">
                <input
                  type="checkbox"
                  checked={selectedUsers.has(user.id)}
                  onChange={() => onSelectUser(user.id)}
                />
              </td>
              <td>
                <div className="user-cell">
                  <div className="user-avatar-sm">
                    {user.name?.charAt(0) || 'U'}
                    {user.verified && (
                      <span className="verified-dot" />
                    )}
                  </div>
                  <div className="user-details">
                    <span className="user-name">{user.name}, {user.age || '?'}</span>
                    <span className="user-email">{user.email || 'No email'}</span>
                  </div>
                </div>
              </td>
              <td>
                <span
                  className="status-badge"
                  style={statusColors[user.status] || statusColors.pending}
                >
                  {user.status}
                </span>
              </td>
              <td>
                <span className={`sub-badge ${user.subscription}`}>
                  {user.subscription}
                </span>
              </td>
              <td>{user.location || 'Unknown'}</td>
              <td>
                <div className={`fraud-bar ${user.fraud_score < 30 ? 'low' : user.fraud_score < 70 ? 'medium' : 'high'}`}>
                  <div className="fraud-fill" style={{ width: `${user.fraud_score}%` }} />
                  <span>{user.fraud_score}%</span>
                </div>
              </td>
              <td>{user.last_active ? new Date(user.last_active).toLocaleDateString() : 'Never'}</td>
              <td>
                <div className="table-actions">
                  <button onClick={() => router.push(`/admin/users/${user.id}`)}><Eye size={14} /></button>
                  <button onClick={() => onAction('edit', user)}><Edit size={14} /></button>
                  <button className="danger" onClick={() => onAction('ban', user)}><Ban size={14} /></button>
                </div>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>

      <style jsx>{`
        .user-table-container {
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 16px;
          overflow: hidden;
        }
        
        .user-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .user-table th,
        .user-table td {
          padding: 14px 16px;
          text-align: left;
          border-bottom: 1px solid rgba(148, 163, 184, 0.1);
        }
        
        .user-table th {
          background: rgba(30, 41, 59, 0.5);
          font-size: 12px;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .user-table tr:hover {
          background: rgba(30, 41, 59, 0.3);
        }
        
        .user-table tr.selected {
          background: rgba(59, 130, 246, 0.1);
        }
        
        .checkbox-col {
          width: 40px;
        }
        
        .checkbox-col input {
          width: 16px;
          height: 16px;
          cursor: pointer;
        }
        
        .user-cell {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .user-avatar-sm {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 600;
          color: white;
          position: relative;
        }
        
        .verified-dot {
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 10px;
          height: 10px;
          background: #10b981;
          border: 2px solid rgba(15, 23, 42, 1);
          border-radius: 50%;
        }
        
        .user-details {
          display: flex;
          flex-direction: column;
        }
        
        .user-name {
          font-size: 14px;
          font-weight: 500;
          color: #f1f5f9;
        }
        
        .user-email {
          font-size: 12px;
          color: #64748b;
        }
        
        .status-badge {
          display: inline-block;
          font-size: 11px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 20px;
          text-transform: capitalize;
        }
        
        .sub-badge {
          display: inline-block;
          font-size: 11px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 20px;
          text-transform: capitalize;
        }
        
        .sub-badge.free {
          background: rgba(148, 163, 184, 0.15);
          color: #94a3b8;
        }
        
        .sub-badge.gold {
          background: rgba(249, 115, 22, 0.15);
          color: #f97316;
        }
        
        .sub-badge.platinum {
          background: rgba(168, 85, 247, 0.15);
          color: #a855f7;
        }
        
        .fraud-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100px;
        }
        
        .fraud-fill {
          height: 6px;
          border-radius: 3px;
          flex: 1;
        }
        
        .fraud-bar.low .fraud-fill {
          background: #10b981;
        }
        
        .fraud-bar.medium .fraud-fill {
          background: #f97316;
        }
        
        .fraud-bar.high .fraud-fill {
          background: #ef4444;
        }
        
        .fraud-bar span {
          font-size: 12px;
          color: #94a3b8;
          min-width: 35px;
        }
        
        .table-actions {
          display: flex;
          gap: 6px;
        }
        
        .table-actions button {
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 8px;
          color: #94a3b8;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .table-actions button:hover {
          background: rgba(59, 130, 246, 0.2);
          color: #3b82f6;
        }
        
        .table-actions button.danger:hover {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }
      `}</style>
    </div>
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
    <div className="users-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>User Management</h1>
          <p>{totalUsers.toLocaleString()} users total</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={fetchUsers}>
            <RefreshCw size={16} />
            Refresh
          </button>
          <button className="btn-secondary">
            <Download size={16} />
            Export
          </button>
          <button className="btn-secondary">
            <Upload size={16} />
            Import
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="filters-bar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          {filters.search && (
            <button className="clear-search" onClick={() => setFilters({ ...filters, search: '' })}>
              <X size={16} />
            </button>
          )}
        </div>

        <div className="filter-group">
          <select
            value={filters.status}
            onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setCurrentPage(1); }}
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
          >
            <option value="all">All Plans</option>
            <option value="free">Free</option>
            <option value="gold">Gold</option>
            <option value="platinum">Platinum</option>
          </select>

          <select
            value={filters.verified}
            onChange={(e) => { setFilters({ ...filters, verified: e.target.value }); setCurrentPage(1); }}
          >
            <option value="all">All Users</option>
            <option value="verified">Verified</option>
            <option value="unverified">Unverified</option>
          </select>

          <select
            value={filters.fraudRisk}
            onChange={(e) => { setFilters({ ...filters, fraudRisk: e.target.value }); setCurrentPage(1); }}
          >
            <option value="all">All Risk</option>
            <option value="low">Low Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="high">High Risk</option>
          </select>
        </div>

        <div className="view-toggle">
          <button
            className={viewMode === 'grid' ? 'active' : ''}
            onClick={() => setViewMode('grid')}
          >
            Grid
          </button>
          <button
            className={viewMode === 'table' ? 'active' : ''}
            onClick={() => setViewMode('table')}
          >
            Table
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      <AnimatePresence>
        {selectedUsers.size > 0 && (
          <motion.div
            className="bulk-actions"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <span>{selectedUsers.size} users selected</span>
            <div className="bulk-buttons">
              <button onClick={() => handleBulkAction('verify')}>
                <UserCheck size={16} /> Verify
              </button>
              <button onClick={() => handleBulkAction('suspend')}>
                <UserX size={16} /> Suspend
              </button>
              <button className="danger" onClick={() => handleBulkAction('ban')}>
                <Ban size={16} /> Ban
              </button>
              <button onClick={() => setSelectedUsers(new Set())}>
                <X size={16} /> Clear
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading / Error State */}
      {loading && (
        <div className="loading-state">
          <Loader2 className="spinner" size={32} />
          <span>Loading users...</span>
        </div>
      )}

      {error && (
        <div className="error-state">
          <AlertTriangle size={24} />
          <span>{error}</span>
          <button onClick={fetchUsers}>Retry</button>
        </div>
      )}

      {/* Users List */}
      {!loading && !error && (
        <>
          {viewMode === 'grid' ? (
            <div className="users-grid">
              {users.map((user) => (
                <UserCard key={user.id} user={user} onAction={handleAction} />
              ))}
            </div>
          ) : (
            <UserTable
              users={users}
              onAction={handleAction}
              selectedUsers={selectedUsers}
              onSelectUser={handleSelectUser}
              onSelectAll={handleSelectAll}
            />
          )}

          {users.length === 0 && (
            <div className="empty-state">
              <Users size={48} />
              <p>No users found matching your criteria</p>
            </div>
          )}
        </>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="pagination">
          <button
            className="page-btn"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft size={18} />
          </button>

          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum = i + 1;
            if (totalPages > 5) {
              if (currentPage > 3) {
                pageNum = currentPage - 2 + i;
              }
              if (currentPage > totalPages - 3) {
                pageNum = totalPages - 4 + i;
              }
            }
            return pageNum;
          }).filter(p => p >= 1 && p <= totalPages).map((pageNum) => (
            <button
              key={pageNum}
              className={`page-btn ${currentPage === pageNum ? 'active' : ''}`}
              onClick={() => setCurrentPage(pageNum)}
            >
              {pageNum}
            </button>
          ))}

          <button
            className="page-btn"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight size={18} />
          </button>

          <span className="page-info">
            Page {currentPage} of {totalPages}
          </span>
        </div>
      )}

      <style jsx>{`
        .users-page {
          max-width: 1600px;
          margin: 0 auto;
        }
        
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
        }
        
        .page-header h1 {
          font-size: 28px;
          font-weight: 700;
          color: #f1f5f9;
          margin-bottom: 4px;
        }
        
        .page-header p {
          font-size: 15px;
          color: #94a3b8;
        }
        
        .header-actions {
          display: flex;
          gap: 12px;
        }
        
        .btn-secondary {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 10px;
          color: #f1f5f9;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn-secondary:hover {
          background: rgba(30, 41, 59, 0.8);
          border-color: rgba(148, 163, 184, 0.4);
        }
        
        .filters-bar {
          display: flex;
          gap: 16px;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        
        .search-box {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 12px;
          min-width: 300px;
          flex: 1;
        }
        
        .search-box input {
          background: transparent;
          border: none;
          outline: none;
          color: #f1f5f9;
          font-size: 14px;
          width: 100%;
        }
        
        .search-box input::placeholder {
          color: #64748b;
        }
        
        .search-box svg {
          color: #64748b;
        }
        
        .clear-search {
          background: transparent;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 4px;
          display: flex;
        }
        
        .filter-group {
          display: flex;
          gap: 12px;
        }
        
        .filter-group select {
          padding: 10px 16px;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 10px;
          color: #f1f5f9;
          font-size: 14px;
          cursor: pointer;
          outline: none;
        }
        
        .view-toggle {
          display: flex;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 10px;
          overflow: hidden;
        }
        
        .view-toggle button {
          padding: 10px 16px;
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .view-toggle button.active {
          background: rgba(59, 130, 246, 0.2);
          color: #3b82f6;
        }
        
        .bulk-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 12px;
          margin-bottom: 24px;
        }
        
        .bulk-actions span {
          font-size: 14px;
          font-weight: 500;
          color: #3b82f6;
        }
        
        .bulk-buttons {
          display: flex;
          gap: 10px;
        }
        
        .bulk-buttons button {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 8px;
          color: #f1f5f9;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .bulk-buttons button:hover {
          background: rgba(59, 130, 246, 0.2);
        }
        
        .bulk-buttons button.danger:hover {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }
        
        .loading-state,
        .error-state,
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: #94a3b8;
          gap: 16px;
        }
        
        .spinner {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .error-state {
          color: #ef4444;
        }
        
        .error-state button {
          padding: 8px 16px;
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          color: #ef4444;
          cursor: pointer;
        }
        
        .users-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 20px;
          margin-bottom: 24px;
        }
        
        .pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 24px;
        }
        
        .page-btn {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 10px;
          color: #94a3b8;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .page-btn:hover:not(:disabled) {
          background: rgba(59, 130, 246, 0.2);
          color: #3b82f6;
        }
        
        .page-btn.active {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border-color: transparent;
        }
        
        .page-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .page-info {
          margin-left: 16px;
          font-size: 14px;
          color: #64748b;
        }
      `}</style>
    </div>
  );
}
