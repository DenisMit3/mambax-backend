'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    User,
    Shield,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Ban,
    Mail,
    Phone,
    MapPin,
    Calendar,
    Clock,
    Heart,
    MessageCircle,
    DollarSign,
    Camera,
    Flag,
    Star,
    Edit,
    Trash2,
    RefreshCw,
} from 'lucide-react';

interface UserDetail {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    age: number | null;
    gender: string | null;
    bio: string | null;
    photos: string[];
    location: string | null;
    city: string | null;
    status: string;
    subscription_tier: string;
    stars_balance: number;
    is_verified: boolean;
    created_at: string;
    updated_at: string;
    last_active: string | null;
    // Stats
    matches_count: number;
    messages_count: number;
    reports_received: number;
    reports_sent: number;
    // Fraud
    fraud_score: number;
    fraud_factors: Record<string, number>;
}

export default function UserDetailPage() {
    const params = useParams();
    const router = useRouter();
    const userId = params.id as string;

    const [user, setUser] = useState<UserDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    // Stars Modal State
    const [showStarsModal, setShowStarsModal] = useState(false);
    const [starsAmount, setStarsAmount] = useState(10);
    const [starsAction, setStarsAction] = useState<'add' | 'remove'>('add');
    const [starsReason, setStarsReason] = useState('Bonus');

    const handleUpdateStars = async () => {
        try {
            const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/admin/users/${userId}/stars`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    amount: starsAmount,
                    action: starsAction,
                    reason: starsReason
                }),
            });

            if (response.ok) {
                setShowStarsModal(false);
                fetchUserDetails();
                alert('Stars updated successfully');
            } else {
                alert('Failed to update stars');
            }
        } catch (error) {
            console.error('Error updating stars:', error);
            alert('Error updating stars');
        }
    };

    useEffect(() => {
        fetchUserDetails();
    }, [userId]);

    const fetchUserDetails = async () => {
        setLoading(true);
        try {
            const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            });

            if (response.ok) {
                const data = await response.json();
                setUser(data);
            } else {
                // Mock data for development
                setUser({
                    id: userId,
                    name: 'Alex Johnson',
                    email: 'alex.johnson@email.com',
                    phone: '+1 555-123-4567',
                    age: 28,
                    gender: 'male',
                    bio: 'Coffee enthusiast, travel lover, and tech geek. Looking for meaningful connections.',
                    photos: [
                        '/placeholder-avatar.jpg',
                        '/placeholder-photo-1.jpg',
                        '/placeholder-photo-2.jpg',
                    ],
                    location: 'San Francisco, CA',
                    city: 'San Francisco',
                    status: 'active',
                    subscription_tier: 'gold',
                    stars_balance: 150,
                    is_verified: true,
                    created_at: '2024-06-15T10:30:00Z',
                    updated_at: '2025-01-10T08:45:00Z',
                    last_active: '2025-01-10T08:45:00Z',
                    matches_count: 47,
                    messages_count: 234,
                    reports_received: 0,
                    reports_sent: 2,
                    fraud_score: 12,
                    fraud_factors: {},
                });
            }
        } catch (error) {
            console.error('Error fetching user:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (action: string) => {
        if (!confirm(`Are you sure you want to ${action} this user?`)) return;

        try {
            const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/admin/users/${userId}/action`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ action }),
            });

            if (response.ok) {
                fetchUserDetails();
            }
        } catch (error) {
            console.error('Error performing action:', error);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return '#10b981';
            case 'suspended': return '#f97316';
            case 'banned': return '#ef4444';
            default: return '#94a3b8';
        }
    };

    const getFraudRiskLevel = (score: number) => {
        if (score < 20) return { level: 'Low', color: '#10b981' };
        if (score < 50) return { level: 'Medium', color: '#f97316' };
        return { level: 'High', color: '#ef4444' };
    };

    if (loading) {
        return (
            <div className="loading-container">
                <RefreshCw className="spinning" size={32} />
                <p>Loading user details...</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="error-container">
                <p>User not found</p>
                <button onClick={() => router.back()}>Go Back</button>
            </div>
        );
    }

    const fraudRisk = getFraudRiskLevel(user.fraud_score);

    return (
        <div className="user-detail-page">
            {/* Header */}
            <div className="page-header">
                <button className="back-btn" onClick={() => router.back()}>
                    <ArrowLeft size={20} />
                    Back to Users
                </button>
                <div className="header-actions">
                    <button className="action-btn edit">
                        <Edit size={16} />
                        Edit Profile
                    </button>
                    <button className="action-btn stars" onClick={() => setShowStarsModal(true)}>
                        <Star size={16} />
                        Manage Stars
                    </button>
                    {user.status === 'active' && (
                        <button className="action-btn suspend" onClick={() => handleAction('suspend')}>
                            <XCircle size={16} />
                            Suspend
                        </button>
                    )}
                    {user.status === 'suspended' && (
                        <button className="action-btn activate" onClick={() => handleAction('activate')}>
                            <CheckCircle size={16} />
                            Activate
                        </button>
                    )}
                    <button className="action-btn ban" onClick={() => handleAction('ban')}>
                        <Ban size={16} />
                        Ban User
                    </button>
                </div>
            </div>

            {/* Profile Card */}
            <div className="profile-section">
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
                            <span className="stat-label">Reports</span>
                        </div>
                        <div className="stat-item">
                            <AlertTriangle size={20} color={fraudRisk.color} />
                            <span className="stat-value" style={{ color: fraudRisk.color }}>{user.fraud_score}</span>
                            <span className="stat-label">Fraud Score</span>
                        </div>
                    </div>
                </motion.div>

                {/* Fraud Analysis Card */}
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

            {/* Tabs */}
            <div className="tabs-container">
                {['overview', 'activity', 'photos', 'payments', 'notes'].map((tab) => (
                    <button
                        key={tab}
                        className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="tab-content glass-panel">
                {activeTab === 'overview' && (
                    <div className="overview-grid">
                        <div className="info-section">
                            <h4>Contact Information</h4>
                            <div className="info-list">
                                <div className="info-item">
                                    <Mail size={16} />
                                    <span>{user.email || 'No email'}</span>
                                </div>
                                <div className="info-item">
                                    <Phone size={16} />
                                    <span>{user.phone || 'No phone'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="info-section">
                            <h4>Account Details</h4>
                            <div className="info-list">
                                <div className="info-item">
                                    <Calendar size={16} />
                                    <span>Joined: {new Date(user.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="info-item">
                                    <Clock size={16} />
                                    <span>Last Active: {user.last_active ? new Date(user.last_active!).toLocaleString() : 'Never'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="info-section full-width">
                            <h4>Bio</h4>
                            <p className="bio-text">{user.bio || 'No bio provided'}</p>
                        </div>
                    </div>
                )}

                {activeTab === 'photos' && (
                    <div className="photos-grid">
                        {user.photos.length > 0 ? (
                            user.photos.map((photo, index) => (
                                <div key={index} className="photo-item">
                                    <Camera size={32} />
                                    <span>Photo {index + 1}</span>
                                </div>
                            ))
                        ) : (
                            <p className="no-data">No photos uploaded</p>
                        )}
                    </div>
                )}

                {activeTab === 'activity' && (
                    <div className="activity-timeline">
                        <p className="no-data">Activity timeline coming soon...</p>
                    </div>
                )}

                {activeTab === 'payments' && (
                    <div className="payments-list">
                        <p className="no-data">Payment history coming soon...</p>
                    </div>
                )}

                {activeTab === 'notes' && (
                    <div className="notes-section">
                        <textarea placeholder="Add a note about this user..." />
                        <button className="add-note-btn">Add Note</button>
                    </div>
                )}
            </div >

            {/* Stars Modal */}
            {
                showStarsModal && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h3 style={{ color: 'white', marginBottom: '20px' }}>Manage User Stars</h3>

                            <div className="form-group">
                                <label>Action</label>
                                <select
                                    value={starsAction}
                                    onChange={(e) => setStarsAction(e.target.value as 'add' | 'remove')}
                                >
                                    <option value="add">Add Stars</option>
                                    <option value="remove">Remove Stars</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Amount</label>
                                <input
                                    type="number"
                                    value={starsAmount}
                                    onChange={(e) => setStarsAmount(Number(e.target.value))}
                                    min="1"
                                />
                            </div>

                            <div className="form-group">
                                <label>Reason</label>
                                <input
                                    type="text"
                                    value={starsReason}
                                    onChange={(e) => setStarsReason(e.target.value)}
                                    placeholder="e.g. Bonus, Refund, Adjustment"
                                />
                            </div>

                            <div className="modal-actions">
                                <button
                                    onClick={() => setShowStarsModal(false)}
                                    style={{
                                        padding: '10px 16px',
                                        background: 'transparent',
                                        border: '1px solid #475569',
                                        color: '#94a3b8',
                                        borderRadius: '8px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpdateStars}
                                    style={{
                                        padding: '10px 16px',
                                        background: starsAction === 'add' ? '#10b981' : '#ef4444',
                                        border: 'none',
                                        color: 'white',
                                        borderRadius: '8px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {starsAction === 'add' ? 'Add Stars' : 'Remove Stars'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            <style jsx>{`
                .user-detail-page {
                    max-width: 1400px;
                    margin: 0 auto;
                }

                .loading-container,
                .error-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 400px;
                    color: #94a3b8;
                    gap: 16px;
                }

                .spinning {
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                .page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                }

                .back-btn {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 16px;
                    background: rgba(30, 41, 59, 0.5);
                    border: 1px solid rgba(148, 163, 184, 0.2);
                    border-radius: 10px;
                    color: #94a3b8;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .back-btn:hover {
                    background: rgba(59, 130, 246, 0.2);
                    color: #3b82f6;
                }

                .header-actions {
                    display: flex;
                    gap: 12px;
                }

                .action-btn {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 16px;
                    border: none;
                    border-radius: 10px;
                    font-size: 13px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .action-btn.edit {
                    background: rgba(59, 130, 246, 0.2);
                    color: #3b82f6;
                }

                .action-btn.suspend {
                    background: rgba(249, 115, 22, 0.2);
                    color: #f97316;
                }

                .action-btn.activate {
                    background: rgba(16, 185, 129, 0.2);
                    color: #10b981;
                }

                .action-btn.ban {
                    background: rgba(239, 68, 68, 0.2);
                    color: #ef4444;
                }

                .action-btn.stars {
                    background: rgba(234, 179, 8, 0.2);
                    color: #eab308;
                }
                
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.7);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    backdrop-filter: blur(5px);
                }
                
                .modal-content {
                    background: #1e293b;
                    padding: 24px;
                    border-radius: 16px;
                    width: 400px;
                    border: 1px solid rgba(148, 163, 184, 0.2);
                }
                
                .form-group {
                    margin-bottom: 16px;
                }
                
                .form-group label {
                    display: block;
                    margin-bottom: 8px;
                    color: #94a3b8;
                    font-size: 14px;
                }
                
                .form-group input, .form-group select {
                    width: 100%;
                    padding: 10px;
                    background: rgba(15, 23, 42, 0.5);
                    border: 1px solid rgba(148, 163, 184, 0.2);
                    border-radius: 8px;
                    color: white;
                }
                
                .modal-actions {
                    display: flex;
                    gap: 12px;
                    justify-content: flex-end;
                    margin-top: 24px;
                }

                .profile-section {
                    display: grid;
                    grid-template-columns: 1fr 300px;
                    gap: 24px;
                    margin-bottom: 24px;
                }

                @media (max-width: 900px) {
                    .profile-section {
                        grid-template-columns: 1fr;
                    }
                }

                .glass-panel {
                    background: rgba(15, 23, 42, 0.65);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(148, 163, 184, 0.2);
                    border-radius: 20px;
                    padding: 24px;
                }

                .profile-header {
                    display: flex;
                    gap: 24px;
                    margin-bottom: 24px;
                }

                .avatar-container {
                    position: relative;
                }

                .avatar {
                    width: 100px;
                    height: 100px;
                    background: linear-gradient(135deg, #667eea, #764ba2);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                }

                .verified-badge {
                    position: absolute;
                    bottom: 0;
                    right: 0;
                    background: #10b981;
                    border-radius: 50%;
                    padding: 4px;
                    color: white;
                }

                .profile-info h1 {
                    font-size: 28px;
                    font-weight: 700;
                    color: #f1f5f9;
                    margin-bottom: 8px;
                }

                .profile-meta {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: #94a3b8;
                    font-size: 14px;
                    margin-bottom: 12px;
                }

                .profile-badges {
                    display: flex;
                    gap: 8px;
                }

                .status-badge,
                .tier-badge {
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 600;
                    text-transform: capitalize;
                }

                .tier-badge {
                    background: linear-gradient(135deg, #fbbf24, #f59e0b);
                    color: #1e293b;
                }

                .profile-stats {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 16px;
                    padding-top: 24px;
                    border-top: 1px solid rgba(148, 163, 184, 0.1);
                }

                .stat-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 4px;
                }

                .stat-value {
                    font-size: 24px;
                    font-weight: 700;
                    color: #f1f5f9;
                }

                .stat-label {
                    font-size: 12px;
                    color: #64748b;
                }

                .fraud-card h3 {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 16px;
                    color: #f1f5f9;
                    margin-bottom: 20px;
                }

                .fraud-score-display {
                    display: flex;
                    justify-content: center;
                    margin-bottom: 20px;
                }

                .fraud-meter {
                    width: 140px;
                    height: 140px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .fraud-meter-inner {
                    width: 110px;
                    height: 110px;
                    background: rgba(15, 23, 42, 0.9);
                    border-radius: 50%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                }

                .fraud-value {
                    font-size: 32px;
                    font-weight: 700;
                    color: #f1f5f9;
                }

                .fraud-label {
                    font-size: 12px;
                    color: #94a3b8;
                }

                .analyze-btn {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    padding: 10px;
                    background: rgba(59, 130, 246, 0.2);
                    border: none;
                    border-radius: 10px;
                    color: #3b82f6;
                    font-size: 13px;
                    cursor: pointer;
                }

                .tabs-container {
                    display: flex;
                    gap: 8px;
                    margin-bottom: 24px;
                    padding: 8px;
                    background: rgba(15, 23, 42, 0.5);
                    border-radius: 14px;
                }

                .tab-btn {
                    flex: 1;
                    padding: 12px 20px;
                    background: transparent;
                    border: none;
                    border-radius: 10px;
                    color: #94a3b8;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .tab-btn.active {
                    background: rgba(59, 130, 246, 0.2);
                    color: #3b82f6;
                }

                .tab-content {
                    min-height: 300px;
                }

                .overview-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 24px;
                }

                .info-section.full-width {
                    grid-column: span 2;
                }

                .info-section h4 {
                    font-size: 14px;
                    color: #94a3b8;
                    margin-bottom: 12px;
                }

                .info-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .info-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    color: #f1f5f9;
                    font-size: 14px;
                }

                .info-item svg {
                    color: #64748b;
                }

                .bio-text {
                    color: #f1f5f9;
                    font-size: 14px;
                    line-height: 1.6;
                }

                .photos-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                    gap: 16px;
                }

                .photo-item {
                    aspect-ratio: 1;
                    background: rgba(30, 41, 59, 0.5);
                    border-radius: 12px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    color: #64748b;
                    gap: 8px;
                }

                .no-data {
                    color: #64748b;
                    text-align: center;
                    padding: 40px;
                }

                .notes-section {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .notes-section textarea {
                    width: 100%;
                    min-height: 120px;
                    padding: 16px;
                    background: rgba(30, 41, 59, 0.5);
                    border: 1px solid rgba(148, 163, 184, 0.2);
                    border-radius: 12px;
                    color: #f1f5f9;
                    font-size: 14px;
                    resize: vertical;
                }

                .add-note-btn {
                    align-self: flex-end;
                    padding: 10px 20px;
                    background: linear-gradient(135deg, #667eea, #764ba2);
                    border: none;
                    border-radius: 10px;
                    color: white;
                    font-size: 14px;
                    cursor: pointer;
                }
            `}</style>
        </div >
    );
}
