// Общие типы для модуля модерации

export interface QueueItem {
  id: string;
  type: 'photo' | 'chat' | 'report';
  user_id: string;
  user_name: string;
  ai_score: number;
  ai_flags: string[];
  priority: 'high' | 'medium' | 'low';
  status: string;
  created_at: string;
  reason?: string;
  description?: string;
}

export type ContentFilter = 'all' | 'photo' | 'chat' | 'report';
export type PriorityFilter = 'all' | 'high' | 'medium' | 'low';
