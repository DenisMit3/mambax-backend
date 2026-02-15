// Стили: Layout, Loading, Header
export const layoutStyles = `
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
`;
