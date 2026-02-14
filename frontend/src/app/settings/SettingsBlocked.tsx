'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { UserX } from 'lucide-react';
import { authService } from '@/services/api';
import { SectionWrapper, Loader } from './SettingsShared';
import type { BlockedUser } from './settingsTypes';

// Секция заблокированных пользователей
export function SettingsBlocked() {
    const [users, setUsers] = useState<BlockedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [unblocking, setUnblocking] = useState<string | null>(null);

    useEffect(() => {
        authService.getBlockedUsers()
            .then((data) => {
                if (data && typeof data === 'object' && 'blocked_users' in data) {
                    setUsers((data as { blocked_users: BlockedUser[] }).blocked_users);
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const handleUnblock = async (userId: string) => {
        setUnblocking(userId);
        try {
            await authService.unblockUser(userId);
            setUsers(prev => prev.filter(u => u.id !== userId));
        } catch (e) {
            console.error('Unblock failed:', e);
        } finally {
            setUnblocking(null);
        }
    };

    if (loading) return <Loader />;

    if (users.length === 0) {
        return (
            <SectionWrapper>
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <UserX size={48} className="text-slate-600 mb-4" />
                    <p className="text-slate-400 font-medium">Список пуст</p>
                    <p className="text-xs text-slate-600 mt-1">Вы никого не заблокировали</p>
                </div>
            </SectionWrapper>
        );
    }

    return (
        <SectionWrapper>
            <div className="space-y-2">
                {users.map((user) => (
                    <div key={user.id} className="p-4 rounded-2xl bg-white/5 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 overflow-hidden">
                            {user.photo_url ? (
                                <Image src={user.photo_url} alt={user.name || 'Аватар'} className="w-full h-full object-cover" width={48} height={48} unoptimized />
                            ) : (
                                <UserX size={18} />
                            )}
                        </div>
                        <div className="flex-1">
                            <div className="text-white font-medium text-sm">{user.name}</div>
                            <div className="text-xs text-slate-500">
                                {new Date(user.blocked_at).toLocaleDateString('ru-RU')}
                            </div>
                        </div>
                        <button
                            onClick={() => handleUnblock(user.id)}
                            disabled={unblocking === user.id}
                            className="px-3 py-1.5 rounded-lg bg-white/5 text-slate-300 text-xs font-medium hover:bg-white/10 transition disabled:opacity-50"
                        >
                            {unblocking === user.id ? '...' : 'Разблокировать'}
                        </button>
                    </div>
                ))}
            </div>
        </SectionWrapper>
    );
}
