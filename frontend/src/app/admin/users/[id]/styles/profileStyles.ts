// Стили: Profile Section, Avatar, Stats, Fraud
export const profileStyles = `
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
`;
