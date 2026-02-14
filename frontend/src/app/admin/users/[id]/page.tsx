'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { Toast } from '@/components/ui/Toast';
import { userDetailStyles } from './UserDetailStyles';
import { useUserActions } from './useUserActions';
import UserHeaderActions from './UserHeaderActions';
import UserProfileCard from './UserProfileCard';
import UserOverviewTab from './UserOverviewTab';
import UserPhotosTab from './UserPhotosTab';
import UserNotesTab from './UserNotesTab';
import PaymentHistory from './PaymentHistory';
import ActivityTimeline from './ActivityTimeline';
import StarsModal from './StarsModal';

export default function UserDetailPage() {
    const params = useParams();
    const router = useRouter();
    const userId = params.id as string;

    const { user, loading, fetchError, fetchUserDetails, handleAction, handleUpdateStars, handleGdprExport } = useUserActions(userId);

    const [activeTab, setActiveTab] = useState('overview');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Состояние модалки Stars
    const [showStarsModal, setShowStarsModal] = useState(false);
    const [starsAmount, setStarsAmount] = useState(10);
    const [starsAction, setStarsAction] = useState<'add' | 'remove'>('add');
    const [starsReason, setStarsReason] = useState('Bonus');

    const onUpdateStars = async () => {
        const ok = await handleUpdateStars(starsAmount, starsAction, starsReason);
        setShowStarsModal(false);
        setToast({ message: ok ? 'Stars updated successfully' : 'Failed to update stars', type: ok ? 'success' : 'error' });
    };

    const onGdprExport = async () => {
        const ok = await handleGdprExport();
        if (!ok) setToast({ message: 'Failed to export user data', type: 'error' });
    };

    // --- Загрузка ---
    if (loading) {
        return (
            <div className="loading-container">
                <RefreshCw className="spinning" size={32} />
                <p>Loading user details...</p>
                <style jsx>{userDetailStyles}</style>
            </div>
        );
    }

    // --- Ошибка / не найден ---
    if (!user) {
        return (
            <div className="error-container">
                <AlertTriangle size={48} className="text-orange-500" />
                <p>{fetchError || 'User not found'}</p>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={fetchUserDetails} className="text-blue-500" style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '10px 20px', background: 'rgba(59,130,246,0.2)',
                        border: '1px solid rgba(59,130,246,0.3)', borderRadius: 10,
                        fontSize: 14, cursor: 'pointer',
                    }}>
                        <RefreshCw size={16} /> Повторить
                    </button>
                    <button onClick={() => router.back()} className="text-slate-400" style={{
                        padding: '10px 20px', background: 'rgba(30,41,59,0.5)',
                        border: '1px solid rgba(148,163,184,0.2)', borderRadius: 10,
                        fontSize: 14, cursor: 'pointer',
                    }}>
                        Go Back
                    </button>
                </div>
                <style jsx>{userDetailStyles}</style>
            </div>
        );
    }

    // --- Основной рендер ---
    return (
        <div className="user-detail-page">
            <UserHeaderActions
                user={user}
                onBack={() => router.back()}
                onGdprExport={onGdprExport}
                onShowStarsModal={() => setShowStarsModal(true)}
                onAction={handleAction}
            />

            <UserProfileCard user={user} />

            {/* Табы */}
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

            {/* Контент табов */}
            <div className="tab-content glass-panel">
                {activeTab === 'overview' && <UserOverviewTab user={user} />}
                {activeTab === 'activity' && <ActivityTimeline userId={userId} />}
                {activeTab === 'photos' && <UserPhotosTab photos={user.photos} />}
                {activeTab === 'payments' && <PaymentHistory userId={userId} />}
                {activeTab === 'notes' && <UserNotesTab />}
            </div>

            {showStarsModal && (
                <StarsModal
                    starsAction={starsAction}
                    starsAmount={starsAmount}
                    starsReason={starsReason}
                    onActionChange={setStarsAction}
                    onAmountChange={setStarsAmount}
                    onReasonChange={setStarsReason}
                    onSubmit={onUpdateStars}
                    onClose={() => setShowStarsModal(false)}
                />
            )}

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            <style jsx>{userDetailStyles}</style>
        </div>
    );
}
