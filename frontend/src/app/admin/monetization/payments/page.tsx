'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Activity,
  DollarSign,
  Zap,
  Server,
  ShieldCheck,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import styles from '../../admin.module.css';

interface Gateway {
  name: string;
  displayName: string;
  status: 'operational' | 'degraded' | 'down';
  transactions24h: number;
  successRate: number;
  avgResponseMs: number;
  failedTransactions: number;
  volume24h: number;
  icon: string;
}

interface FailedPayment {
  id: string;
  transactionId: string;
  userId: string;
  userName: string;
  amount: number;
  gateway: string;
  errorCode: string;
  errorMessage: string;
  retryCount: number;
  lastRetry: string;
  createdAt: string;
}

const mockGateways: Gateway[] = [
  {
    name: 'stripe',
    displayName: 'Stripe',
    status: 'operational',
    transactions24h: 1247,
    successRate: 98.7,
    avgResponseMs: 245,
    failedTransactions: 16,
    volume24h: 48923.50,
    icon: '💳'
  },
  {
    name: 'paypal',
    displayName: 'PayPal',
    status: 'operational',
    transactions24h: 423,
    successRate: 97.2,
    avgResponseMs: 312,
    failedTransactions: 12,
    volume24h: 15678.25,
    icon: '🅿️'
  },
  {
    name: 'apple_pay',
    displayName: 'Apple Pay',
    status: 'operational',
    transactions24h: 289,
    successRate: 99.3,
    avgResponseMs: 189,
    failedTransactions: 2,
    volume24h: 11234.75,
    icon: '🍎'
  },
  {
    name: 'google_pay',
    displayName: 'Google Pay',
    status: 'degraded',
    transactions24h: 198,
    successRate: 95.5,
    avgResponseMs: 403,
    failedTransactions: 9,
    volume24h: 7823.50,
    icon: '🔵'
  }
];

const mockFailedPayments: FailedPayment[] = [
  {
    id: 'failed-1',
    transactionId: 'txn-f1234',
    userId: 'user-201',
    userName: 'Alex Brown',
    amount: 29.99,
    gateway: 'stripe',
    errorCode: 'card_declined',
    errorMessage: 'Your card was declined. Try a different payment method.',
    retryCount: 2,
    lastRetry: '2024-02-06T10:30:00Z',
    createdAt: '2024-02-06T08:15:00Z'
  },
  {
    id: 'failed-2',
    transactionId: 'txn-f1235',
    userId: 'user-202',
    userName: 'Emma Davis',
    amount: 49.99,
    gateway: 'paypal',
    errorCode: 'insufficient_funds',
    errorMessage: 'Insufficient funds in PayPal account',
    retryCount: 1,
    lastRetry: '2024-02-06T09:00:00Z',
    createdAt: '2024-02-06T07:45:00Z'
  },
  {
    id: 'failed-3',
    transactionId: 'txn-f1236',
    userId: 'user-203',
    userName: 'Chris Wilson',
    amount: 29.99,
    gateway: 'google_pay',
    errorCode: 'expired_card',
    errorMessage: 'The card on file has expired',
    retryCount: 0,
    lastRetry: '',
    createdAt: '2024-02-06T11:20:00Z'
  }
];

function OverallStats() {
  const stats = [
    { label: 'Total Transactions', value: '2.16K', icon: <CreditCard size={18} />, color: '#3b82f6' },
    { label: 'Success Rate', value: '98.5%', icon: <CheckCircle size={18} />, color: '#10b981' },
    { label: 'Total Volume', value: '$83.7K', icon: <DollarSign size={18} />, color: '#a855f7' },
    { label: 'Failed Payments', value: '33', icon: <XCircle size={18} />, color: '#ef4444' },
    { label: 'Avg Response', value: '287ms', icon: <Zap size={18} />, color: '#f59e0b' },
    { label: 'All Systems', value: 'Online', icon: <Server size={18} />, color: '#10b981' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
      {stats.map((stat, index) => (
        <GlassCard
          key={stat.label}
          className="p-4 flex flex-col gap-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${stat.color}15`, color: stat.color }}>
              {stat.icon}
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-[var(--admin-text-primary)]">{stat.value}</div>
            <div className="text-xs text-[var(--admin-text-muted)] mt-1">{stat.label}</div>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

function GatewayCard({ gateway }: { gateway: Gateway }) {
  const statusColors = {
    operational: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', label: 'Operational' },
    degraded: { bg: 'rgba(249, 115, 22, 0.15)', color: '#f97316', label: 'Degraded' },
    down: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', label: 'Down' }
  };

  const status = statusColors[gateway.status];
  const [ping, setPing] = useState(gateway.avgResponseMs);

  useEffect(() => {
    const interval = setInterval(() => {
      setPing(gateway.avgResponseMs + Math.floor(Math.random() * 50) - 25);
    }, 2000);
    return () => clearInterval(interval);
  }, [gateway.avgResponseMs]);

  return (
    <GlassCard className="p-6">
      <div className="flex justify-between items-center mb-5">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{gateway.icon}</span>
          <h3 className="text-lg font-semibold text-[var(--admin-text-primary)]">{gateway.displayName}</h3>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: status.bg, color: status.color }}>
          {gateway.status === 'operational' && <CheckCircle size={12} />}
          {gateway.status === 'degraded' && <AlertTriangle size={12} />}
          {gateway.status === 'down' && <XCircle size={12} />}
          {status.label}
        </div>
      </div>

      <div className="flex items-center gap-2 p-3 bg-slate-900/40 rounded-xl mb-5 border border-slate-700/30">
        <Activity size={16} className="text-emerald-500 animate-pulse" />
        <span className="text-sm font-semibold text-[var(--admin-text-primary)]">{ping}ms</span>
        <span className={`text-xs ml-auto ${ping < 300 ? 'text-emerald-500' : ping < 500 ? 'text-orange-500' : 'text-red-500'}`}>
          {ping < 300 ? 'Fast' : ping < 500 ? 'Moderate' : 'Slow'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="text-center p-2 rounded-lg bg-slate-800/20">
          <span className="block text-lg font-bold text-[var(--admin-text-primary)]">{gateway.transactions24h.toLocaleString()}</span>
          <span className="text-[10px] text-[var(--admin-text-muted)] uppercase tracking-wider">Txns (24h)</span>
        </div>
        <div className="text-center p-2 rounded-lg bg-slate-800/20">
          <span className="block text-lg font-bold" style={{ color: gateway.successRate >= 98 ? '#10b981' : gateway.successRate >= 95 ? '#f59e0b' : '#ef4444' }}>
            {gateway.successRate}%
          </span>
          <span className="text-[10px] text-[var(--admin-text-muted)] uppercase tracking-wider">Success</span>
        </div>
        <div className="text-center p-2 rounded-lg bg-slate-800/20">
          <span className="block text-lg font-bold text-[var(--admin-text-primary)]">${(gateway.volume24h / 1000).toFixed(1)}K</span>
          <span className="text-[10px] text-[var(--admin-text-muted)] uppercase tracking-wider">Vol (24h)</span>
        </div>
        <div className="text-center p-2 rounded-lg bg-slate-800/20">
          <span className="block text-lg font-bold text-red-500">{gateway.failedTransactions}</span>
          <span className="text-[10px] text-[var(--admin-text-muted)] uppercase tracking-wider">Failed</span>
        </div>
      </div>

      <div className="h-1.5 bg-slate-700/30 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${gateway.successRate}%`,
            background: gateway.successRate >= 98 ? '#10b981' : gateway.successRate >= 95 ? '#f59e0b' : '#ef4444'
          }}
        />
      </div>
    </GlassCard>
  );
}

function FailedPaymentsTable({ payments, onRetry }: { payments: FailedPayment[]; onRetry: (id: string) => void }) {
  const getErrorColor = (code: string) => {
    switch (code) {
      case 'card_declined': return '#ef4444';
      case 'insufficient_funds': return '#f97316';
      case 'expired_card': return '#f59e0b';
      default: return '#94a3b8';
    }
  };

  return (
    <GlassCard className="p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-lg font-semibold text-[var(--admin-text-primary)] mb-1">Failed Payments</h2>
          <p className="text-sm text-[var(--admin-text-muted)]">Recent failed transactions requiring attention</p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] transition-colors">
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[var(--admin-glass-border)]">
              <th className="pb-3 text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wider">User</th>
              <th className="pb-3 text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wider">Amount</th>
              <th className="pb-3 text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wider">Gateway</th>
              <th className="pb-3 text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wider">Error</th>
              <th className="pb-3 text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wider">Retries</th>
              <th className="pb-3 text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wider text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--admin-glass-border)]">
            {payments.map((payment) => (
              <tr key={payment.id} className="group">
                <td className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white">
                      {payment.userName.charAt(0)}
                    </div>
                    <span className="text-sm font-medium text-[var(--admin-text-primary)]">{payment.userName}</span>
                  </div>
                </td>
                <td className="py-4 text-sm font-semibold text-[var(--admin-text-primary)]">
                  ${payment.amount.toFixed(2)}
                </td>
                <td className="py-4">
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-500 capitalize">
                    {payment.gateway.replace('_', ' ')}
                  </span>
                </td>
                <td className="py-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold" style={{ color: getErrorColor(payment.errorCode) }}>
                      {payment.errorCode}
                    </span>
                    <span className="text-[10px] text-[var(--admin-text-muted)] max-w-[200px] truncate">
                      {payment.errorMessage}
                    </span>
                  </div>
                </td>
                <td className="py-4 text-sm text-[var(--admin-text-muted)]">
                  <span className={payment.retryCount >= 3 ? 'text-red-500 font-medium' : ''}>
                    {payment.retryCount}/3
                  </span>
                </td>
                <td className="py-4 text-right">
                  <button
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-500 text-xs font-medium hover:bg-blue-500 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed mx-0"
                    onClick={() => onRetry(payment.id)}
                    disabled={payment.retryCount >= 3}
                  >
                    <RefreshCw size={12} />
                    Retry
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}

export default function PaymentGatewayPage() {
  const [gateways] = useState(mockGateways);
  const [failedPayments, setFailedPayments] = useState(mockFailedPayments);

  const handleRetry = (id: string) => {
    setFailedPayments(prev =>
      prev.map(p => p.id === id ? { ...p, retryCount: p.retryCount + 1, lastRetry: new Date().toISOString() } : p)
    );
  };

  return (
    <div className={styles.pageContainer}>
      {/* Header */}
      <div className={styles.headerSection}>
        <div className={styles.headerContent}>
          <h1 className={styles.headerTitle}>Payment Gateway Monitor</h1>
          <p className={styles.headerDescription}>Real-time monitoring of payment processing systems</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500 text-sm font-semibold">
          <ShieldCheck size={18} />
          <span>All Systems Operational</span>
        </div>
      </div>

      <OverallStats />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {gateways.map((gateway) => (
          <GatewayCard key={gateway.name} gateway={gateway} />
        ))}
      </div>

      <FailedPaymentsTable payments={failedPayments} onRetry={handleRetry} />
    </div>
  );
}
