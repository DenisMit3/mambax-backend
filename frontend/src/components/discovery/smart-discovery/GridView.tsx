'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import Image from 'next/image';
import { FALLBACK_AVATAR } from '@/lib/constants';
import { User } from './types';

interface GridViewProps {
    users: User[];
    onSelectUser: (index: number) => void;
}

export function GridView({ users, onSelectUser }: GridViewProps) {
    return (
        <div className="absolute top-16 left-0 right-0 bottom-20 overflow-y-auto p-2 scrollbar-hide z-20">
            <div className="grid grid-cols-2 gap-2 pb-20">
                {users.map((user, idx) => (
                    <motion.div
                        key={user.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="aspect-[3/4] relative rounded-2xl overflow-hidden bg-zinc-900 border border-white/5 active:scale-95 transition-transform"
                        onClick={() => onSelectUser(idx)}
                    >
                        <Image
                            src={user.photos?.[0] || FALLBACK_AVATAR}
                            alt={user.name || ''}
                            fill
                            sizes="(max-width: 768px) 50vw, 200px"
                            className="object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                        <div className="absolute bottom-2 left-3 text-white">
                            <h3 className="font-bold text-sm leading-tight">{user.name}, {user.age}</h3>
                            <div className="flex items-center gap-1 mt-0.5">
                                <div className="relative">
                                    <div className={`w-2 h-2 rounded-full ${user.is_online ? 'bg-green-500' : 'bg-gray-500'}`} />
                                    {user.is_online && (
                                        <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75" />
                                    )}
                                </div>
                                <span className="text-[10px] opacity-70">{user.is_online ? 'Live Now' : 'Offline'}</span>
                            </div>
                        </div>
                        {user.is_verified && (
                            <div className="absolute top-2 right-2 bg-blue-500 rounded-full p-0.5">
                                <Zap size={10} className="text-white fill-white" />
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
