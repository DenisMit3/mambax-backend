import { Mail, Phone, Calendar, Clock } from 'lucide-react';
import { UserDetail } from './types';

interface UserOverviewTabProps {
    user: UserDetail;
}

export default function UserOverviewTab({ user }: UserOverviewTabProps) {
    return (
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
                        <span>Last Active: {user.last_active ? new Date(user.last_active).toLocaleString() : 'Never'}</span>
                    </div>
                </div>
            </div>

            <div className="info-section full-width">
                <h4>Bio</h4>
                <p className="bio-text">{user.bio || 'No bio provided'}</p>
            </div>
        </div>
    );
}
