'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    CreditCard,
    CheckCircle,
    XCircle,
    AlertTriangle,
    RefreshCw,
    Clock,
    TrendingUp,
    Activity,
    DollarSign,
    Zap,
    Server,
    Wifi,
    ShieldCheck,
} from 'lucide-react';

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
        <div className="overall-stats">
            {stats.map((stat, index) => (
                <motion.div
                    key={stat.label}
                    className="stat-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                >
                    <div className="stat-icon" style={{ background: `${stat.color}20`, color: stat.color }}>
                        {stat.icon}
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{stat.value}</span>
                        <span className="stat-label">{stat.label}</span>
                    </div>
                </motion.div>
            ))}

            <style jsx>{`
        .overall-stats {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        
        @media (max-width: 1400px) {
          .overall-stats {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        
        @media (max-width: 800px) {
          .overall-stats {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        .stat-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 18px;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 14px;
        }
        
        .stat-icon {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .stat-content {
          display: flex;
          flex-direction: column;
        }
        
        .stat-value {
          font-size: 20px;
          font-weight: 700;
          color: #f1f5f9;
        }
        
        .stat-label {
          font-size: 11px;
          color: #94a3b8;
        }
      `}</style>
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

    // Simulating live ping animation
    const [ping, setPing] = useState(gateway.avgResponseMs);

    useEffect(() => {
        const interval = setInterval(() => {
            setPing(gateway.avgResponseMs + Math.floor(Math.random() * 50) - 25);
        }, 2000);
        return () => clearInterval(interval);
    }, [gateway.avgResponseMs]);

    return (
        <motion.div
            className="gateway-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
        >
            <div className="card-header">
                <div className="gateway-name">
                    <span className="gateway-icon">{gateway.icon}</span>
                    <h3>{gateway.displayName}</h3>
                </div>
                <div className="status-indicator" style={{ background: status.bg, color: status.color }}>
                    {gateway.status === 'operational' && <CheckCircle size={12} />}
                    {gateway.status === 'degraded' && <AlertTriangle size={12} />}
                    {gateway.status === 'down' && <XCircle size={12} />}
                    {status.label}
                </div>
            </div>

            <div className="live-ping">
                <Activity size={16} className="pulse" />
                <span>{ping}ms</span>
                <span className="ping-status" style={{ color: ping < 300 ? '#10b981' : ping < 500 ? '#f97316' : '#ef4444' }}>
                    {ping < 300 ? 'Fast' : ping < 500 ? 'Moderate' : 'Slow'}
                </span>
            </div>

            <div className="gateway-metrics">
                <div className="metric">
                    <span className="metric-value">{gateway.transactions24h.toLocaleString()}</span>
                    <span className="metric-label">Transactions (24h)</span>
                </div>
                <div className="metric">
                    <span className="metric-value" style={{ color: gateway.successRate >= 98 ? '#10b981' : gateway.successRate >= 95 ? '#f59e0b' : '#ef4444' }}>
                        {gateway.successRate}%
                    </span>
                    <span className="metric-label">Success Rate</span>
                </div>
                <div className="metric">
                    <span className="metric-value">${(gateway.volume24h / 1000).toFixed(1)}K</span>
                    <span className="metric-label">Volume (24h)</span>
                </div>
                <div className="metric">
                    <span className="metric-value" style={{ color: '#ef4444' }}>{gateway.failedTransactions}</span>
                    <span className="metric-label">Failed</span>
                </div>
            </div>

            <div className="success-bar">
                <div
                    className="success-fill"
                    style={{
                        width: `${gateway.successRate}%`,
                        background: gateway.successRate >= 98 ? '#10b981' : gateway.successRate >= 95 ? '#f59e0b' : '#ef4444'
                    }}
                />
            </div>

            <style jsx>{`
        .gateway-card {
          padding: 24px;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 20px;
          transition: all 0.3s ease;
        }
        
        .gateway-card:hover {
          border-color: rgba(59, 130, 246, 0.3);
        }
        
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        
        .gateway-name {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .gateway-icon {
          font-size: 24px;
        }
        
        .gateway-name h3 {
          font-size: 18px;
          font-weight: 600;
          color: #f1f5f9;
        }
        
        .status-indicator {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 20px;
        }
        
        .live-ping {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: rgba(30, 41, 59, 0.5);
          border-radius: 12px;
          margin-bottom: 16px;
        }
        
        :global(.live-ping .pulse) {
          color: #10b981;
          animation: pulse 1.5s ease-in-out infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        
        .live-ping span {
          font-size: 14px;
          font-weight: 600;
          color: #f1f5f9;
        }
        
        .ping-status {
          margin-left: auto;
          font-size: 12px;
        }
        
        .gateway-metrics {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 16px;
        }
        
        .metric {
          text-align: center;
        }
        
        .metric-value {
          display: block;
          font-size: 18px;
          font-weight: 700;
          color: #f1f5f9;
        }
        
        .metric-label {
          font-size: 10px;
          color: #64748b;
        }
        
        .success-bar {
          height: 6px;
          background: rgba(148, 163, 184, 0.2);
          border-radius: 3px;
          overflow: hidden;
        }
        
        .success-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.5s;
        }
      `}</style>
        </motion.div>
    );
}

function FailedPaymentsTable({ payments, onRetry }: { payments: FailedPayment[]; onRetry: (id: string) => void }) {
    const getErrorColor = (code: string) => {
        switch (code) {
            case 'card_declined':
                return '#ef4444';
            case 'insufficient_funds':
                return '#f97316';
            case 'expired_card':
                return '#f59e0b';
            default:
                return '#94a3b8';
        }
    };

    return (
        <div className="failed-payments">
            <div className="section-header">
                <div>
                    <h2>Failed Payments</h2>
                    <p>Recent failed transactions requiring attention</p>
                </div>
                <button className="btn-refresh">
                    <RefreshCw size={14} />
                    Refresh
                </button>
            </div>

            <div className="payments-table">
                <div className="table-header">
                    <div className="col-user">User</div>
                    <div className="col-amount">Amount</div>
                    <div className="col-gateway">Gateway</div>
                    <div className="col-error">Error</div>
                    <div className="col-retries">Retries</div>
                    <div className="col-action">Action</div>
                </div>

                {payments.map((payment, index) => (
                    <motion.div
                        key={payment.id}
                        className="table-row"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                    >
                        <div className="col-user">
                            <div className="user-avatar">{payment.userName.charAt(0)}</div>
                            <span>{payment.userName}</span>
                        </div>
                        <div className="col-amount">${payment.amount.toFixed(2)}</div>
                        <div className="col-gateway">
                            <span className="gateway-badge">{payment.gateway}</span>
                        </div>
                        <div className="col-error">
                            <span className="error-code" style={{ color: getErrorColor(payment.errorCode) }}>
                                {payment.errorCode}
                            </span>
                            <span className="error-message">{payment.errorMessage}</span>
                        </div>
                        <div className="col-retries">
                            <span className={payment.retryCount >= 3 ? 'max-retries' : ''}>
                                {payment.retryCount}/3
                            </span>
                        </div>
                        <div className="col-action">
                            <button
                                className="btn-retry"
                                onClick={() => onRetry(payment.id)}
                                disabled={payment.retryCount >= 3}
                            >
                                <RefreshCw size={14} />
                                Retry
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>

            <style jsx>{`
        .failed-payments {
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 20px;
          padding: 24px;
        }
        
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }
        
        .section-header h2 {
          font-size: 18px;
          font-weight: 600;
          color: #f1f5f9;
          margin-bottom: 4px;
        }
        
        .section-header p {
          font-size: 13px;
          color: #64748b;
        }
        
        .btn-refresh {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 8px;
          color: #94a3b8;
          font-size: 13px;
          cursor: pointer;
        }
        
        .table-header {
          display: grid;
          grid-template-columns: 180px 100px 100px 1fr 80px 100px;
          gap: 16px;
          padding: 12px 16px;
          background: rgba(30, 41, 59, 0.4);
          border-radius: 10px;
          margin-bottom: 8px;
        }
        
        .table-header > div {
          font-size: 11px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
        }
        
        .table-row {
          display: grid;
          grid-template-columns: 180px 100px 100px 1fr 80px 100px;
          gap: 16px;
          padding: 14px 16px;
          align-items: center;
          border-bottom: 1px solid rgba(148, 163, 184, 0.1);
        }
        
        .col-user {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .user-avatar {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 600;
          color: white;
        }
        
        .col-user span {
          font-size: 14px;
          font-weight: 500;
          color: #f1f5f9;
        }
        
        .col-amount {
          font-size: 14px;
          font-weight: 600;
          color: #f1f5f9;
        }
        
        .gateway-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 4px 10px;
          background: rgba(59, 130, 246, 0.15);
          color: #3b82f6;
          border-radius: 20px;
          text-transform: capitalize;
        }
        
        .col-error {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        
        .error-code {
          font-size: 12px;
          font-weight: 600;
        }
        
        .error-message {
          font-size: 11px;
          color: #64748b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .col-retries span {
          font-size: 14px;
          font-weight: 500;
          color: #94a3b8;
        }
        
        .max-retries {
          color: #ef4444 !important;
        }
        
        .btn-retry {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background: rgba(59, 130, 246, 0.15);
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 8px;
          color: #3b82f6;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn-retry:hover:not(:disabled) {
          background: #3b82f6;
          color: white;
        }
        
        .btn-retry:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
        </div>
    );
}

export default function PaymentGatewayPage() {
    const [gateways] = useState(mockGateways);
    const [failedPayments, setFailedPayments] = useState(mockFailedPayments);

    const handleRetry = (id: string) => {
        setFailedPayments(prev =>
            prev.map(p => p.id === id ? { ...p, retryCount: p.retryCount + 1, lastRetry: new Date().toISOString() } : p)
        );
        // In real app, would call API to retry payment
    };

    return (
        <div className="payment-gateway-page">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1>Payment Gateway Monitor</h1>
                    <p>Real-time monitoring of payment processing systems</p>
                </div>
                <div className="header-status">
                    <ShieldCheck size={18} />
                    <span>All Systems Operational</span>
                </div>
            </div>

            {/* Overall Stats */}
            <OverallStats />

            {/* Gateway Cards */}
            <div className="gateways-grid">
                {gateways.map((gateway) => (
                    <GatewayCard key={gateway.name} gateway={gateway} />
                ))}
            </div>

            {/* Failed Payments */}
            <FailedPaymentsTable payments={failedPayments} onRetry={handleRetry} />

            <style jsx>{`
        .payment-gateway-page {
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
        
        .header-status {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 12px;
          color: #10b981;
          font-size: 14px;
          font-weight: 600;
        }
        
        .gateways-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-bottom: 24px;
        }
        
        @media (max-width: 1000px) {
          .gateways-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
        </div>
    );
}
