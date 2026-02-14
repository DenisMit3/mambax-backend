'use client';

import { useState } from 'react';
import { X, UserPlus, Loader2 } from 'lucide-react';
import { adminApi, AdminCreateUserData } from '@/services/adminApi';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateUserModal({ isOpen, onClose, onCreated }: CreateUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<AdminCreateUserData>({
    name: '',
    email: '',
    phone: '',
    age: 18,
    gender: 'other',
    password: '',
    role: 'user',
    status: 'active',
    subscription_tier: 'free',
    bio: '',
    city: '',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError('Имя обязательно');
      return;
    }
    if (form.age < 18 || form.age > 120) {
      setError('Возраст должен быть от 18 до 120');
      return;
    }

    setLoading(true);
    try {
      const payload: AdminCreateUserData = {
        name: form.name.trim(),
        age: form.age,
        gender: form.gender,
        role: form.role,
        status: form.status,
        subscription_tier: form.subscription_tier,
      };
      if (form.email?.trim()) payload.email = form.email.trim();
      if (form.phone?.trim()) payload.phone = form.phone.trim();
      if (form.password?.trim()) payload.password = form.password.trim();
      if (form.bio?.trim()) payload.bio = form.bio.trim();
      if (form.city?.trim()) payload.city = form.city.trim();

      await adminApi.users.create(payload);
      onCreated();
      onClose();
      // Reset form
      setForm({
        name: '', email: '', phone: '', age: 18, gender: 'other',
        password: '', role: 'user', status: 'active', subscription_tier: 'free',
        bio: '', city: '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка создания пользователя');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-[var(--neon-blue)] focus:outline-none text-sm';
  const selectClass = 'w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-[var(--neon-blue)] focus:outline-none text-sm [&>option]:bg-[#1a1a2e] [&>option]:text-white';
  const labelClass = 'block text-xs text-white/60 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-[#1a1a2e]/95 border border-white/10 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--neon-blue)]/20 flex items-center justify-center">
              <UserPlus size={20} className="text-[var(--neon-blue)]" />
            </div>
            <h2 className="text-lg font-bold text-white">Добавить пользователя</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Name + Age */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Имя *</label>
              <input
                type="text"
                className={inputClass}
                placeholder="Имя пользователя"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Возраст *</label>
              <input
                type="number"
                className={inputClass}
                min={18}
                max={120}
                value={form.age}
                onChange={(e) => setForm({ ...form, age: parseInt(e.target.value) || 18 })}
                required
              />
            </div>
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                className={inputClass}
                placeholder="email@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Телефон</label>
              <input
                type="text"
                className={inputClass}
                placeholder="+7..."
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>

          {/* Gender + Password */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Пол</label>
              <select className={selectClass} value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="male">Мужской</option>
                <option value="female">Женский</option>
                <option value="other">Другой</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Пароль</label>
              <input
                type="text"
                className={inputClass}
                placeholder="Оставьте пустым для авто"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
          </div>

          {/* Role + Status + Subscription */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Роль</label>
              <select className={selectClass} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="user">Пользователь</option>
                <option value="moderator">Модератор</option>
                <option value="admin">Админ</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Статус</label>
              <select className={selectClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="active">Активен</option>
                <option value="pending">Ожидание</option>
                <option value="suspended">Заблокирован</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Подписка</label>
              <select className={selectClass} value={form.subscription_tier} onChange={(e) => setForm({ ...form, subscription_tier: e.target.value })}>
                <option value="free">Free</option>
                <option value="vip">VIP</option>
                <option value="gold">Gold</option>
                <option value="platinum">Platinum</option>
              </select>
            </div>
          </div>

          {/* City + Bio */}
          <div>
            <label className={labelClass}>Город</label>
            <input
              type="text"
              className={inputClass}
              placeholder="Москва"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>О себе</label>
            <textarea
              className={inputClass + ' resize-none h-20'}
              placeholder="Краткое описание..."
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-white/70 hover:bg-white/5 transition-colors text-sm"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--neon-blue)] text-white font-medium hover:opacity-90 transition-opacity text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
              {loading ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
