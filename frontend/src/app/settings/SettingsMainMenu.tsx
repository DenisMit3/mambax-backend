'use client';

import { useRouter } from 'next/navigation';
import {
    Bell, Eye, Shield, Smartphone, UserX, Trash2,
    ChevronRight, Globe, SlidersHorizontal, Hash,
    MessageSquare, CreditCard, Crown, HelpCircle
} from 'lucide-react';
import { SectionWrapper } from './SettingsShared';
import type { SettingsSection } from './settingsTypes';

interface MainMenuProps {
    onNavigate: (s: SettingsSection) => void;
}

// Главное меню настроек
export function SettingsMainMenu({ onNavigate }: MainMenuProps) {
    const router = useRouter();

    const menuItems: { id: SettingsSection; icon: React.ReactNode; label: string; desc: string; danger?: boolean }[] = [
        { id: 'notifications', icon: <Bell size={20} />, label: 'Уведомления', desc: 'Настройка push-уведомлений' },
        { id: 'visibility', icon: <Eye size={20} />, label: 'Приватность', desc: 'Видимость профиля и инкогнито' },
        { id: 'security', icon: <Shield size={20} />, label: 'Безопасность', desc: '2FA и защита аккаунта' },
        { id: 'blocked', icon: <UserX size={20} />, label: 'Заблокированные', desc: 'Управление чёрным списком' },
        { id: 'devices', icon: <Smartphone size={20} />, label: 'Устройства', desc: 'Активные сессии' },
        { id: 'delete', icon: <Trash2 size={20} />, label: 'Удаление аккаунта', desc: 'Удалить профиль и данные', danger: true },
    ];

    const linkItems = [
        { icon: <Globe size={20} />, label: 'Язык', desc: 'Выбор языка интерфейса', href: '/settings/language' },
        { icon: <SlidersHorizontal size={20} />, label: 'Предпочтения', desc: 'Возраст, дистанция, пол', href: '/preferences' },
        { icon: <Hash size={20} />, label: 'Интересы', desc: 'Редактировать интересы', href: '/profile/interests' },
        { icon: <CreditCard size={20} />, label: 'Платежи', desc: 'История платежей', href: '/payments' },
        { icon: <MessageSquare size={20} />, label: 'Обратная связь', desc: 'Сообщить о проблеме', href: '/feedback' },
        { icon: <Crown size={20} />, label: 'Подписка', desc: 'Управление планом', href: '/settings/subscription' },
        { icon: <HelpCircle size={20} />, label: 'Помощь', desc: 'FAQ и поддержка', href: '/help' },
    ];

    return (
        <SectionWrapper>
            <div className="space-y-2">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onNavigate(item.id)}
                        className={`w-full p-4 rounded-2xl bg-white/5 flex items-center gap-4 hover:bg-white/10 transition ${item.danger ? 'hover:bg-red-500/10' : ''}`}
                    >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.danger ? 'bg-red-500/10 text-red-500' : 'bg-white/5 text-slate-300'}`}>
                            {item.icon}
                        </div>
                        <div className="flex-1 text-left">
                            <div className={`font-medium text-sm ${item.danger ? 'text-red-500' : 'text-white'}`}>{item.label}</div>
                            <div className="text-xs text-slate-500">{item.desc}</div>
                        </div>
                        <ChevronRight size={18} className="text-slate-600" />
                    </button>
                ))}
            </div>

            {/* Дополнительные ссылки */}
            <div className="mt-6 space-y-2">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-1 mb-2">Дополнительно</p>
                {linkItems.map((item) => (
                    <button
                        key={item.href}
                        onClick={() => router.push(item.href)}
                        className="w-full p-4 rounded-2xl bg-white/5 flex items-center gap-4 hover:bg-white/10 transition"
                    >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 text-slate-300">
                            {item.icon}
                        </div>
                        <div className="flex-1 text-left">
                            <div className="font-medium text-sm text-white">{item.label}</div>
                            <div className="text-xs text-slate-500">{item.desc}</div>
                        </div>
                        <ChevronRight size={18} className="text-slate-600" />
                    </button>
                ))}
            </div>
        </SectionWrapper>
    );
}
