'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Server,
    Database,
    Wifi,
    HardDrive,
    Cpu,
    MemoryStick,
    Activity,
    CheckCircle,
    AlertTriangle,
    XCircle,
    Zap,
    Clock,
    TrendingUp,
    BarChart3,
    RefreshCw,
} from 'lucide-react';

interface Service {
    name: string;
    status: 'healthy' | 'degraded' | 'down';
    responseTime: number;
    uptime: string;
    metrics?: Record<string, number | string>;
}

const mockServices: Service[] = [
    {
        name: 'API Server',
        status: 'healthy',
        responseTime: 45,
        uptime: '99.99%',
        metrics: { cpu: 23.5, memory: 45.2, rps: 1250 }
    },
    {
        name: 'PostgreSQL',
        status: 'healthy',
        responseTime: 12,
        uptime: '99.99%',
        metrics: { connections: 45, queryAvg: 8.5 }
    },
    {
        name: 'Redis Cache',
        status: 'healthy',
        responseTime: 2,
        uptime: '99.99%',
        metrics: { hitRate: 94.5, memoryMb: 256 }
    },
    {
        name: 'WebSocket Server',
        status: 'healthy',
        responseTime: 8,
        uptime: '99.95%',
        metrics: { connections: 8456, msgPerSec: 234 }
    },
    {
        name: 'File Storage (S3)',
        status: 'healthy',
        responseTime: 85,
        uptime: '99.99%',
        metrics: { usedGb: 234.5, limitGb: 500 }
    },
    {
        name: 'Push Service',
        status: 'degraded',
        responseTime: 320,
        uptime: '98.5%',
        metrics: { queueSize: 1250, deliveryRate: 96.2 }
    }
];

function OverallStatus() {
    const healthyCount = mockServices.filter(s => s.status === 'healthy').length;
    const isAllHealthy = healthyCount === mockServices.length;

    return (
        <div className="overall-status">
            <div className={`status-indicator ${isAllHealthy ? 'healthy' : 'degraded'}`}>
                {isAllHealthy ? <CheckCircle size={32} /> : <AlertTriangle size={32} />}
            </div>
            <div className="status-text">
                <h2>{isAllHealthy ? 'All Systems Operational' : 'Some Systems Degraded'}</h2>
                <p>{healthyCount} of {mockServices.length} services healthy</p>
            </div>
            <div className="uptime-display">
                <span className="uptime-value">99.97%</span>
                <span className="uptime-label">30-day Uptime</span>
            </div>

            <style jsx>{`
        .overall-status {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 24px 32px;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 20px;
          margin-bottom: 24px;
        }
        
        .status-indicator {
          width: 64px;
          height: 64px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .status-indicator.healthy {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
        }
        
        .status-indicator.degraded {
          background: rgba(249, 115, 22, 0.15);
          color: #f97316;
        }
        
        .status-text {
          flex: 1;
        }
        
        .status-text h2 {
          font-size: 22px;
          font-weight: 700;
          color: #f1f5f9;
          margin-bottom: 4px;
        }
        
        .status-text p {
          font-size: 14px;
          color: #94a3b8;
        }
        
        .uptime-display {
          text-align: right;
        }
        
        .uptime-value {
          display: block;
          font-size: 36px;
          font-weight: 800;
          color: #10b981;
        }
        
        .uptime-label {
          font-size: 13px;
          color: #64748b;
        }
      `}</style>
        </div>
    );
}

function ServiceCard({ service }: { service: Service }) {
    const statusConfig = {
        healthy: { icon: <CheckCircle size={16} />, color: '#10b981', label: 'Healthy' },
        degraded: { icon: <AlertTriangle size={16} />, color: '#f97316', label: 'Degraded' },
        down: { icon: <XCircle size={16} />, color: '#ef4444', label: 'Down' }
    };

    const status = statusConfig[service.status];

    // Simulating live response time updates
    const [responseTime, setResponseTime] = useState(service.responseTime);

    useEffect(() => {
        const interval = setInterval(() => {
            setResponseTime(service.responseTime + Math.floor(Math.random() * 20) - 10);
        }, 2000);
        return () => clearInterval(interval);
    }, [service.responseTime]);

    return (
        <motion.div
            className="service-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
        >
            <div className="card-header">
                <Server size={20} />
                <h3>{service.name}</h3>
                <div className="status-badge" style={{ background: `${status.color}20`, color: status.color }}>
                    {status.icon}
                    {status.label}
                </div>
            </div>

            <div className="response-time">
                <Activity size={16} className="pulse" />
                <span className="rt-value">{Math.max(1, responseTime)}ms</span>
                <span className="rt-status" style={{ color: responseTime < 100 ? '#10b981' : responseTime < 300 ? '#f59e0b' : '#ef4444' }}>
                    {responseTime < 100 ? 'Fast' : responseTime < 300 ? 'Normal' : 'Slow'}
                </span>
            </div>

            <div className="metrics-grid">
                <div className="metric">
                    <Clock size={14} />
                    <span className="metric-value">{service.uptime}</span>
                    <span className="metric-label">Uptime</span>
                </div>
                {service.metrics && Object.entries(service.metrics).slice(0, 2).map(([key, value]) => (
                    <div key={key} className="metric">
                        <Zap size={14} />
                        <span className="metric-value">
                            {typeof value === 'number' ? value.toLocaleString() : value}
                            {key.includes('Rate') || key.includes('cpu') || key.includes('memory') ? '%' : ''}
                        </span>
                        <span className="metric-label">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    </div>
                ))}
            </div>

            <style jsx>{`
        .service-card {
          padding: 20px;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 16px;
          transition: all 0.3s ease;
        }
        
        .service-card:hover {
          border-color: rgba(59, 130, 246, 0.3);
        }
        
        .card-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
          color: #94a3b8;
        }
        
        .card-header h3 {
          flex: 1;
          font-size: 15px;
          font-weight: 600;
          color: #f1f5f9;
        }
        
        .status-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 20px;
        }
        
        .response-time {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: rgba(30, 41, 59, 0.5);
          border-radius: 12px;
          margin-bottom: 16px;
        }
        
        :global(.response-time .pulse) {
          color: #10b981;
          animation: pulse 1.5s ease-in-out infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        
        .rt-value {
          font-size: 18px;
          font-weight: 700;
          color: #f1f5f9;
        }
        
        .rt-status {
          margin-left: auto;
          font-size: 12px;
          font-weight: 600;
        }
        
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }
        
        .metric {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 10px;
          background: rgba(30, 41, 59, 0.4);
          border-radius: 10px;
          color: #64748b;
        }
        
        .metric-value {
          font-size: 14px;
          font-weight: 700;
          color: #f1f5f9;
        }
        
        .metric-label {
          font-size: 9px;
          text-transform: capitalize;
          text-align: center;
        }
      `}</style>
        </motion.div>
    );
}

function QuickStats() {
    const stats = [
        { label: 'Requests/24h', value: '1.85M', icon: <TrendingUp size={18} />, color: '#3b82f6' },
        { label: 'Error Rate', value: '0.12%', icon: <AlertTriangle size={18} />, color: '#10b981' },
        { label: 'Avg Response', value: '52ms', icon: <Zap size={18} />, color: '#a855f7' },
        { label: 'Active Users', value: '12.5K', icon: <Activity size={18} />, color: '#f59e0b' },
        { label: 'CPU Usage', value: '23.5%', icon: <Cpu size={18} />, color: '#ec4899' },
        { label: 'Memory', value: '45.2%', icon: <MemoryStick size={18} />, color: '#14b8a6' },
    ];

    return (
        <div className="quick-stats">
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
        .quick-stats {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        
        @media (max-width: 1400px) {
          .quick-stats {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        
        @media (max-width: 800px) {
          .quick-stats {
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
          font-size: 18px;
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

export default function SystemHealthPage() {
    const [services] = useState(mockServices);
    const [lastRefresh, setLastRefresh] = useState(new Date());

    const handleRefresh = () => {
        setLastRefresh(new Date());
    };

    return (
        <div className="health-page">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1>System Health</h1>
                    <p>Real-time infrastructure monitoring</p>
                </div>
                <div className="header-actions">
                    <span className="last-update">
                        Last updated: {lastRefresh.toLocaleTimeString()}
                    </span>
                    <button className="btn-refresh" onClick={handleRefresh}>
                        <RefreshCw size={16} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Overall Status */}
            <OverallStatus />

            {/* Quick Stats */}
            <QuickStats />

            {/* Services Grid */}
            <h2 className="section-title">
                <Server size={20} />
                Services Status
            </h2>
            <div className="services-grid">
                {services.map((service) => (
                    <ServiceCard key={service.name} service={service} />
                ))}
            </div>

            <style jsx>{`
        .health-page {
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
          align-items: center;
          gap: 16px;
        }
        
        .last-update {
          font-size: 13px;
          color: #64748b;
        }
        
        .btn-refresh {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 10px;
          color: #f1f5f9;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn-refresh:hover {
          background: rgba(59, 130, 246, 0.2);
          border-color: rgba(59, 130, 246, 0.3);
        }
        
        .section-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 18px;
          font-weight: 600;
          color: #f1f5f9;
          margin-bottom: 16px;
        }
        
        .services-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        
        @media (max-width: 1200px) {
          .services-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        @media (max-width: 800px) {
          .services-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
        </div>
    );
}
