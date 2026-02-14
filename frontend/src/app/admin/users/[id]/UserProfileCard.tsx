'use client';

import { motion } from 'framer-motion';
import {
    User, CheckCircle, MapPin, Heart,
    MessageCircle, Star, Flag, AlertTriangle,
    Shield, RefreshCw,
} from 'lucide-react';
import { UserDetail } from './types';

interface UserProfileCardProps {
    user: UserDetail;
}

// Цвет статуса пользователя
const getStatusColor = (status: string) => {
    switch (status) {
        case 'active': return '#10b981';
        case 'suspended': return '#f97316';
        case 'banned': return '#ef4444';
        default: return '#94a3b8';
    }
};

// Уровень риска фрода
const getFraudRiskLevel = (score: number) => {
    if (score < 20) return { level: 'Low', color: '#10b981' };
    if (score < 50) return { level: 'Medium', color: '#f97316' };
    return { level: 'High', color: '#ef4444' };
};

export default function UserProfileCard({ user }: UserProfileCardProps) {
    const fraudRisk = getFraudRiskLevel(user.fraud_score);

    return (
        <div className="profile-section">
            {/* Карточка профиля */}
            <motion.div
                className="profile-card glass-panel"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="profile-header">
                    <div className="avatar-container">
                        <div className="avatar">
                            <User size={48} />
                        </div>
                        {user.is_verified && (
                            <div className="verified-badge">
                                <CheckCircle size={16} />
                            </div>
                        )}
                    </div>
                    <div className="profile-info">
                        <h1>{user.name}</h1>
                        <div className="profile-meta">
                            {user.age && <span>{user.age} years old</span>}
                            {user.gender && <span>• {user.gender}</span>}
                            {user.location && (
                                <>
                                    <MapPin size={14} />
                                    <span>{user.location}</span>
                                </>
                            )}
                        </div>
                        <div className="profile-badges">
                            <span
                                className="status-badge"
                                style={{
                                    background: `${getStatusColor(user.status)}20`,
                                    color: getStatusColor(user.status)
                                }}
                            >
                                {user.status}
                            </span>
                            <span className="tier-badge">{user.subscription_tier}</span>
                        </div>
                    </div>
                </div>

                <div className="profile-stats">
                    <div className="stat-item">
                        <Heart size={20} color="#ec4899" />
                        <span className="stat-value">{user.matches_count}</span>
                        <span className="stat-label">Matches</span>
                    </div>
                    <div className="stat-item">
                        <MessageCircle size={20} color="#3b82f6" />
                        <span className="stat-value">{user.messages_count}</span>
                        <span className="stat-label">Messages</span>
                    </div>
                    <div className="stat-item">
                        <Star size={20} color="#eab308" />
                        <span className="stat-value">{user.stars_balance}</span>
                        <span className="stat-label">Stars Balance</span>
                    </div>
                    <div className="stat-item">
                        <Flag size={20} color="#f97316" />
                        <span className="stat-value">{user.reports_received}</span>
                        <span className="stat-label">Жалобы</span>
                    </div>
                    <div className="stat-item">
                        <AlertTriangle size={20} color={fraudRisk.color} />
                        <span className="stat-value" style={{ color: fraudRisk.color }}>{user.fraud_score}</span>
                        <span className="stat-label">Fraud Score</span>
                    </div>
                </div>
            </motion.div>

            {/* Карточка анализа фрода */}
            <motion.div
                className="fraud-card glass-panel"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <h3>
                    <Shield size={18} />
                    Fraud Analysis
                </h3>
                <div className="fraud-score-display">
                    <div
                        className="fraud-meter"
                        style={{
                            background: `conic-gradient(${fraudRisk.color} ${user.fraud_score * 3.6}deg, rgba(30, 41, 59, 0.5) 0deg)`
                        }}
                    >
                        <div className="fraud-meter-inner">
                            <span className="fraud-value">{user.fraud_score}</span>
                            <span className="fraud-label">{fraudRisk.level} Risk</span>
                        </div>
                    </div>
                </div>
                <button className="analyze-btn">
                    <RefreshCw size={14} />
                    Re-analyze
                </button>
            </motion.div>
        </div>
    );
}
