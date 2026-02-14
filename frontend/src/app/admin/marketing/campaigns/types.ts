// === Общие типы и конфиги для раздела кампаний ===

import { ReactNode } from 'react';
import {
  Bell,
  Mail,
  MessageSquare,
  Megaphone,
} from 'lucide-react';
import React from 'react';

// --- Интерфейсы (snake_case от API) ---

export interface Campaign {
  id: string;
  name: string;
  type: 'push' | 'email' | 'sms' | 'in_app';
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed';
  target_segment: string;
  sent?: number;
  delivered?: number;
  opened?: number;
  clicked?: number;
  converted?: number;
  open_rate?: number;
  ctr?: number;
  conversion_rate?: number;
  created_at: string;
  scheduled_at?: string;
  completed_at?: string;
}

export interface CampaignStatsData {
  active: number;
  total_sent_week: number;
  avg_open_rate: number;
  conversions: number;
}

export interface CampaignsResponse {
  campaigns: Campaign[];
  stats: CampaignStatsData;
}

// --- Конфиги типов и статусов ---

export interface TypeConfigItem {
  icon: ReactNode;
  label: string;
  color: string;
}

export const typeConfig: Record<Campaign['type'], TypeConfigItem> = {
  push: { icon: React.createElement(Bell, { size: 16 }), label: 'Push', color: '#a855f7' },
  email: { icon: React.createElement(Mail, { size: 16 }), label: 'Email', color: '#3b82f6' },
  sms: { icon: React.createElement(MessageSquare, { size: 16 }), label: 'SMS', color: '#10b981' },
  in_app: { icon: React.createElement(Megaphone, { size: 16 }), label: 'In-App', color: '#f59e0b' },
};

export interface StatusConfigItem {
  color: string;
  bg: string;
}

export const statusConfig: Record<Campaign['status'], StatusConfigItem> = {
  draft: { color: '#64748b', bg: 'rgba(100, 116, 139, 0.15)' },
  scheduled: { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  active: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  paused: { color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)' },
  completed: { color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)' },
};

// --- Утилиты ---

export function formatNumber(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toString();
}
