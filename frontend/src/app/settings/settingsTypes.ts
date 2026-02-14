// Типы для страницы настроек

export type SettingsSection = 'main' | 'notifications' | 'visibility' | 'security' | 'blocked' | 'devices' | 'delete';

export interface NotificationSettings {
    new_match: boolean;
    new_message: boolean;
    new_like: boolean;
    super_like: boolean;
    profile_view: boolean;
    match_reminder: boolean;
    promotion: boolean;
}

export interface VisibilitySettings {
    show_online_status: boolean;
    show_last_seen: boolean;
    show_distance: boolean;
    show_age: boolean;
    read_receipts: boolean;
}

export interface BlockedUser {
    id: string;
    name: string;
    photo_url?: string;
    blocked_at: string;
}

export interface Device {
    id: string;
    user_agent: string;
    platform?: string;
    last_active: string;
}

export interface DeletionReason {
    value: string;
    label: string;
    emoji: string;
}
