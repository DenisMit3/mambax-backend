// Стили: Action Buttons, Modal
export const actionStyles = `
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
`;
