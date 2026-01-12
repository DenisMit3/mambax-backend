'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Flag,
    ToggleLeft,
    ToggleRight,
    Search,
    Clock,
    User,
    Zap,
    Users,
    Percent,
    AlertCircle,
    CheckCircle,
    Info,
} from 'lucide-react';

interface FeatureFlag {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    rolloutPercentage: number;
    createdAt: string;
    updatedAt: string;
    updatedBy: string;
}

const mockFlags: FeatureFlag[] = [
    {
        id: 'video-calls',
        name: 'Video Calls',
        description: 'Enable in-app video calling feature',
        enabled: true,
        rolloutPercentage: 100,
        createdAt: '2024-01-15',
        updatedAt: '2024-02-01',
        updatedBy: 'John Admin'
    },
    {
        id: 'ai-icebreakers',
        name: 'AI Icebreakers',
        description: 'AI-generated conversation starters',
        enabled: true,
        rolloutPercentage: 50,
        createdAt: '2024-01-20',
        updatedAt: '2024-02-05',
        updatedBy: 'John Admin'
    },
    {
        id: 'explore-mode',
        name: 'Explore Mode',
        description: 'Location-based discovery feature',
        enabled: false,
        rolloutPercentage: 0,
        createdAt: '2024-02-01',
        updatedAt: '2024-02-01',
        updatedBy: 'John Admin'
    },
    {
        id: 'voice-messages',
        name: 'Voice Messages',
        description: 'Send voice messages in chat',
        enabled: true,
        rolloutPercentage: 100,
        createdAt: '2023-11-01',
        updatedAt: '2023-12-15',
        updatedBy: 'Jane Moderator'
    },
    {
        id: 'photo-verification-v2',
        name: 'Photo Verification V2',
        description: 'New AI photo verification system',
        enabled: true,
        rolloutPercentage: 25,
        createdAt: '2024-02-03',
        updatedAt: '2024-02-06',
        updatedBy: 'John Admin'
    },
    {
        id: 'super-likes-boost',
        name: 'Super Likes Boost',
        description: 'Boost effect for super likes',
        enabled: false,
        rolloutPercentage: 0,
        createdAt: '2024-02-05',
        updatedAt: '2024-02-05',
        updatedBy: 'Sarah Analyst'
    },
    {
        id: 'premium-filters',
        name: 'Premium Filters',
        description: 'Advanced filtering options for premium users',
        enabled: true,
        rolloutPercentage: 100,
        createdAt: '2023-09-15',
        updatedAt: '2023-10-01',
        updatedBy: 'John Admin'
    },
    {
        id: 'incognito-mode',
        name: 'Incognito Mode',
        description: 'Browse profiles without being seen',
        enabled: true,
        rolloutPercentage: 100,
        createdAt: '2023-10-20',
        updatedAt: '2023-11-01',
        updatedBy: 'John Admin'
    }
];

function FlagStats() {
    const enabledCount = mockFlags.filter(f => f.enabled).length;
    const partialRollout = mockFlags.filter(f => f.enabled && f.rolloutPercentage < 100).length;

    const stats = [
        { label: 'Total Flags', value: mockFlags.length, icon: <Flag size={18} />, color: '#3b82f6' },
        { label: 'Enabled', value: enabledCount, icon: <CheckCircle size={18} />, color: '#10b981' },
        { label: 'Disabled', value: mockFlags.length - enabledCount, icon: <AlertCircle size={18} />, color: '#64748b' },
        { label: 'Partial Rollout', value: partialRollout, icon: <Percent size={18} />, color: '#f59e0b' },
    ];

    return (
        <div className="flag-stats">
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
        .flag-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        
        @media (max-width: 900px) {
          .flag-stats {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        .stat-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 18px 20px;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 16px;
        }
        
        .stat-icon {
          width: 44px;
          height: 44px;
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
          font-size: 24px;
          font-weight: 700;
          color: #f1f5f9;
        }
        
        .stat-label {
          font-size: 12px;
          color: #94a3b8;
        }
      `}</style>
        </div>
    );
}

function FlagCard({ flag, onToggle, onRolloutChange }: {
    flag: FeatureFlag;
    onToggle: (id: string) => void;
    onRolloutChange: (id: string, value: number) => void;
}) {
    const [showRollout, setShowRollout] = useState(false);

    return (
        <motion.div
            className={`flag-card ${flag.enabled ? 'enabled' : 'disabled'}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <div className="card-header">
                <div className="flag-info">
                    <h3>{flag.name}</h3>
                    <p>{flag.description}</p>
                </div>
                <button
                    className={`toggle-btn ${flag.enabled ? 'on' : 'off'}`}
                    onClick={() => onToggle(flag.id)}
                >
                    {flag.enabled ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                </button>
            </div>

            {flag.enabled && (
                <div className="rollout-section">
                    <div className="rollout-header" onClick={() => setShowRollout(!showRollout)}>
                        <Users size={16} />
                        <span>Rollout: {flag.rolloutPercentage}%</span>
                        <div className="rollout-bar">
                            <div
                                className="rollout-fill"
                                style={{ width: `${flag.rolloutPercentage}%` }}
                            />
                        </div>
                    </div>

                    {showRollout && (
                        <motion.div
                            className="rollout-controls"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                        >
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={flag.rolloutPercentage}
                                onChange={(e) => onRolloutChange(flag.id, parseInt(e.target.value))}
                            />
                            <div className="rollout-presets">
                                {[0, 10, 25, 50, 100].map(val => (
                                    <button
                                        key={val}
                                        className={flag.rolloutPercentage === val ? 'active' : ''}
                                        onClick={() => onRolloutChange(flag.id, val)}
                                    >
                                        {val}%
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </div>
            )}

            <div className="card-footer">
                <div className="meta-item">
                    <Clock size={12} />
                    <span>Updated {flag.updatedAt}</span>
                </div>
                <div className="meta-item">
                    <User size={12} />
                    <span>by {flag.updatedBy}</span>
                </div>
            </div>

            <style jsx>{`
        .flag-card {
          padding: 24px;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(20px);
          border: 2px solid rgba(148, 163, 184, 0.2);
          border-radius: 20px;
          transition: all 0.3s ease;
        }
        
        .flag-card.enabled {
          border-color: rgba(16, 185, 129, 0.3);
        }
        
        .flag-card.disabled {
          opacity: 0.7;
        }
        
        .flag-card:hover {
          border-color: rgba(168, 85, 247, 0.4);
        }
        
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 16px;
        }
        
        .flag-info h3 {
          font-size: 18px;
          font-weight: 600;
          color: #f1f5f9;
          margin-bottom: 4px;
        }
        
        .flag-info p {
          font-size: 13px;
          color: #94a3b8;
        }
        
        .toggle-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 0;
          transition: transform 0.2s;
        }
        
        .toggle-btn:hover {
          transform: scale(1.1);
        }
        
        .toggle-btn.on {
          color: #10b981;
        }
        
        .toggle-btn.off {
          color: #64748b;
        }
        
        .rollout-section {
          margin-bottom: 16px;
        }
        
        .rollout-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: rgba(30, 41, 59, 0.5);
          border-radius: 12px;
          cursor: pointer;
          color: #94a3b8;
        }
        
        .rollout-header span {
          font-size: 13px;
          font-weight: 500;
        }
        
        .rollout-bar {
          flex: 1;
          height: 6px;
          background: rgba(148, 163, 184, 0.2);
          border-radius: 3px;
          overflow: hidden;
        }
        
        .rollout-fill {
          height: 100%;
          background: linear-gradient(90deg, #10b981, #3b82f6);
          border-radius: 3px;
          transition: width 0.3s;
        }
        
        .rollout-controls {
          padding: 16px;
          background: rgba(30, 41, 59, 0.3);
          border-radius: 0 0 12px 12px;
        }
        
        .rollout-controls input[type="range"] {
          width: 100%;
          margin-bottom: 12px;
          accent-color: #a855f7;
        }
        
        .rollout-presets {
          display: flex;
          gap: 8px;
        }
        
        .rollout-presets button {
          flex: 1;
          padding: 8px;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 8px;
          color: #94a3b8;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .rollout-presets button.active,
        .rollout-presets button:hover {
          background: rgba(168, 85, 247, 0.2);
          border-color: rgba(168, 85, 247, 0.4);
          color: #a855f7;
        }
        
        .card-footer {
          display: flex;
          gap: 16px;
          padding-top: 12px;
          border-top: 1px solid rgba(148, 163, 184, 0.1);
        }
        
        .meta-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #64748b;
        }
      `}</style>
        </motion.div>
    );
}

export default function FeatureFlagsPage() {
    const [flags, setFlags] = useState(mockFlags);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled'>('all');

    const handleToggle = (id: string) => {
        setFlags(prev => prev.map(f =>
            f.id === id ? { ...f, enabled: !f.enabled, updatedAt: new Date().toISOString().split('T')[0] } : f
        ));
    };

    const handleRolloutChange = (id: string, value: number) => {
        setFlags(prev => prev.map(f =>
            f.id === id ? { ...f, rolloutPercentage: value, updatedAt: new Date().toISOString().split('T')[0] } : f
        ));
    };

    const filteredFlags = flags.filter(f => {
        if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false;
        if (filter === 'enabled' && !f.enabled) return false;
        if (filter === 'disabled' && f.enabled) return false;
        return true;
    });

    return (
        <div className="flags-page">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1>Feature Flags</h1>
                    <p>Control feature rollouts and experiments</p>
                </div>
            </div>

            {/* Stats */}
            <FlagStats />

            {/* Info Banner */}
            <div className="info-banner">
                <Info size={18} />
                <span>Changes to feature flags take effect immediately. Use rollout percentages for gradual releases.</span>
            </div>

            {/* Filters */}
            <div className="filters-bar">
                <div className="search-box">
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder="Search features..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="filter-tabs">
                    {(['all', 'enabled', 'disabled'] as const).map((f) => (
                        <button
                            key={f}
                            className={filter === f ? 'active' : ''}
                            onClick={() => setFilter(f)}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                            <span className="count">
                                {f === 'all' ? flags.length :
                                    f === 'enabled' ? flags.filter(fl => fl.enabled).length :
                                        flags.filter(fl => !fl.enabled).length}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Flags Grid */}
            <div className="flags-grid">
                {filteredFlags.map((flag) => (
                    <FlagCard
                        key={flag.id}
                        flag={flag}
                        onToggle={handleToggle}
                        onRolloutChange={handleRolloutChange}
                    />
                ))}
            </div>

            <style jsx>{`
        .flags-page {
          max-width: 1400px;
          margin: 0 auto;
        }
        
        .page-header {
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
        
        .info-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 20px;
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 12px;
          color: #3b82f6;
          font-size: 13px;
          margin-bottom: 24px;
        }
        
        .filters-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        
        .search-box {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 12px;
          min-width: 280px;
        }
        
        .search-box svg {
          color: #64748b;
        }
        
        .search-box input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: #f1f5f9;
          font-size: 14px;
        }
        
        .filter-tabs {
          display: flex;
          gap: 8px;
        }
        
        .filter-tabs button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 10px;
          color: #94a3b8;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .filter-tabs button.active {
          background: rgba(168, 85, 247, 0.2);
          border-color: rgba(168, 85, 247, 0.4);
          color: #a855f7;
        }
        
        .filter-tabs .count {
          padding: 2px 8px;
          background: rgba(148, 163, 184, 0.2);
          border-radius: 10px;
          font-size: 11px;
        }
        
        .flags-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }
        
        @media (max-width: 900px) {
          .flags-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
        </div>
    );
}
