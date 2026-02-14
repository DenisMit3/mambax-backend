// Все стили для страницы детальной информации о пользователе
export const userDetailStyles = `
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

    .action-btn.gdpr {
        background: rgba(16, 185, 129, 0.2);
        color: #10b981;
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
        z-index: 100;
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
`;
