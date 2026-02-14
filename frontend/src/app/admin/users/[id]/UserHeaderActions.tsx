'use client';

import {
    ArrowLeft, Edit, Star, XCircle,
    CheckCircle, Ban, Download,
} from 'lucide-react';
import { UserDetail } from './types';

interface UserHeaderActionsProps {
    user: UserDetail;
    onBack: () => void;
    onGdprExport: () => void;
    onShowStarsModal: () => void;
    onAction: (action: string) => void;
}

export default function UserHeaderActions({
    user, onBack, onGdprExport, onShowStarsModal, onAction,
}: UserHeaderActionsProps) {
    return (
        <div className="page-header">
            <button className="back-btn" onClick={onBack}>
                <ArrowLeft size={20} /> Back to Users
            </button>
            <div className="header-actions">
                <button className="action-btn gdpr" onClick={onGdprExport}>
                    <Download size={16} /> GDPR Export
                </button>
                <button className="action-btn edit">
                    <Edit size={16} /> Edit Profile
                </button>
                <button className="action-btn stars" onClick={onShowStarsModal}>
                    <Star size={16} /> Manage Stars
                </button>
                {user.status === 'active' && (
                    <button className="action-btn suspend" onClick={() => onAction('suspend')}>
                        <XCircle size={16} /> Suspend
                    </button>
                )}
                {user.status === 'suspended' && (
                    <button className="action-btn activate" onClick={() => onAction('activate')}>
                        <CheckCircle size={16} /> Activate
                    </button>
                )}
                <button className="action-btn ban" onClick={() => onAction('ban')}>
                    <Ban size={16} /> Ban User
                </button>
            </div>
        </div>
    );
}
