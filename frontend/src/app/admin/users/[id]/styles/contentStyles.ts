// Стили: Tabs, Content, Overview, Photos, Notes
export const contentStyles = `
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
