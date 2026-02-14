// Общие типы для страницы управления пользователями
import { UserListItem } from '@/services/adminApi';

export type UserStatus = 'active' | 'suspended' | 'banned' | 'pending';
export type SubscriptionTier = 'free' | 'gold' | 'platinum';
export type ViewMode = 'grid' | 'table';

export interface FilterState {
  status: string;
  subscription: string;
  verified: string;
  fraudRisk: string;
  search: string;
}

// Цвета статусов — переиспользуются в нескольких компонентах
export const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  active: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
  suspended: { bg: 'rgba(249, 115, 22, 0.15)', color: '#f97316' },
  banned: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' },
  pending: { bg: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' },
};

export const SUBSCRIPTION_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  free: { bg: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', label: 'Бесплатный' },
  gold: { bg: 'rgba(249, 115, 22, 0.15)', color: '#f97316', label: 'Gold' },
  platinum: { bg: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', label: 'Platinum' },
};

export const FRAUD_COLORS: Record<string, string> = {
  low: '#10b981',
  medium: '#f97316',
  high: '#ef4444',
};

export function getFraudLevel(score: number): 'low' | 'medium' | 'high' {
  return score < 30 ? 'low' : score < 70 ? 'medium' : 'high';
}
