// Общие типы для модуля промокодов

// Интерфейс промокода (snake_case от API)
export interface PromoCode {
  id: string;
  code: string;
  name: string;
  discount_type: 'percentage' | 'fixed_amount' | 'free_trial';
  discount_value: number;
  max_uses: number | null;
  current_uses: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  first_purchase_only: boolean;
  applicable_plans: string[];
  revenue_generated: number;
}

// Статистика из API
export interface PromoStats {
  active: number;
  total_redemptions: number;
  revenue_generated: number;
  avg_conversion: number;
}

// Ответ API
export interface PromoListResponse {
  promo_codes: PromoCode[];
  stats: PromoStats;
}

// Тип фильтра
export type PromoFilter = 'all' | 'active' | 'expired';

// Форматирование чисел для статистики
export function formatStatValue(value: number, type: 'number' | 'currency' | 'percent'): string {
  if (type === 'currency') {
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  }
  if (type === 'percent') return `${value}%`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toString();
}
