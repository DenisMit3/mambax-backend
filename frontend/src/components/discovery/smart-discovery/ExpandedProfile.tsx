'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, MapPin, Briefcase, GraduationCap, Ruler, X, Star as StarIcon, Heart } from 'lucide-react';
import Image from 'next/image';
import { FALLBACK_AVATAR } from '@/lib/constants';
import { User } from './types';
import { formatLastSeen } from './utils';

interface ExpandedProfileProps {
    profile: User | null;
    onClose: () => void;
    onSwipe: (direction: 'left' | 'right' | 'up') => void;
}

export function ExpandedProfile({ profile, onClose, onSwipe }: ExpandedProfileProps) {
    return (
        <AnimatePresence>
            {profile && (
                <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    drag="y"
                    dragConstraints={{ top: 0, bottom: 0 }}
                    dragElastic={0.2}
                    onDragEnd={(e, { offset, velocity }) => {
                        if (offset.y > 100 || velocity.y > 100) {
                            onClose();
                        }
                    }}
                    className="absolute inset-0 z-50 bg-black overflow-y-auto scrollbar-hide"
                >
                    {/* Drag Handle */}
                    <div className="absolute top-4 left-0 right-0 flex justify-center z-50 pointer-events-none">
                        <div className="w-12 h-1.5 bg-white/20 rounded-full backdrop-blur-md" />
                    </div>
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 w-10 h-10 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center z-50 text-white"
                    >
                        <ChevronDown className="rotate-180" />
                    </button>

                    {/* Main Photo */}
                    <div className="relative h-[60vh] w-full">
                        <Image
                            src={profile.photos?.[0] || FALLBACK_AVATAR}
                            className="w-full h-full object-cover"
                            alt={profile.name || 'Фото профиля'}
                            fill
                            sizes="100vw"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                        <div className="absolute bottom-0 left-0 p-6 w-full">
                            <h1 className="text-4xl font-bold text-white mb-2">{profile.name}, {profile.age}</h1>
                            <div className="flex items-center space-x-2 text-white/80">
                                <div className={`w-2 h-2 rounded-full ${profile.is_online ? 'bg-green-500' : 'bg-gray-500'}`} />
                                <span>{profile.is_online ? 'Онлайн' : formatLastSeen(profile.last_seen)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Details */}
                    <div className="px-6 py-8 space-y-8 pb-32">
                        {profile.bio && (
                            <div>
                                <h3 className="text-white/50 text-xs font-bold uppercase tracking-widest mb-3">О себе</h3>
                                <p className="text-white text-lg leading-relaxed font-medium">{profile.bio}</p>
                            </div>
                        )}

                        <div>
                            <h3 className="text-white/50 text-xs font-bold uppercase tracking-widest mb-3">Интересы</h3>
                            <div className="flex flex-wrap gap-2">
                                {(profile.interests && profile.interests.length > 0 ? profile.interests : ['Не указаны']).map(tag => (
                                    <span key={tag} className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-white text-sm font-semibold">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/5 rounded-2xl p-4 flex items-center gap-3">
                                <Ruler className="text-blue-400" />
                                <div>
                                    <p className="text-white/50 text-xs">Рост</p>
                                    <p className="text-white font-bold">{profile.height ? `${profile.height} см` : '—'}</p>
                                </div>
                            </div>
                            <div className="bg-white/5 rounded-2xl p-4 flex items-center gap-3">
                                <Briefcase className="text-purple-400" />
                                <div>
                                    <p className="text-white/50 text-xs">Работа</p>
                                    <p className="text-white font-bold">{profile.work || '—'}</p>
                                </div>
                            </div>
                            <div className="bg-white/5 rounded-2xl p-4 flex items-center gap-3">
                                <GraduationCap className="text-yellow-400" />
                                <div>
                                    <p className="text-white/50 text-xs">Образование</p>
                                    <p className="text-white font-bold">{profile.education || '—'}</p>
                                </div>
                            </div>
                            <div className="bg-white/5 rounded-2xl p-4 flex items-center gap-3">
                                <MapPin className="text-red-400" />
                                <div>
                                    <p className="text-white/50 text-xs">Расстояние</p>
                                    <p className="text-white font-bold">{Math.round(profile.distance || 0)} км</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {profile.photos?.slice(1).map((photo, i) => (
                                <Image key={photo} src={photo} className="w-full rounded-3xl" alt={`${profile.name || 'Профиль'} — фото ${i + 2}`} width={400} height={500} />
                            ))}
                        </div>
                    </div>

                    {/* Action Bar */}
                    <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/90 to-transparent flex justify-center gap-6 z-50 pointer-events-auto">
                        <button onClick={() => { onClose(); onSwipe('left'); }} className="w-16 h-16 rounded-full bg-black/50 border border-red-500/50 flex items-center justify-center text-red-500 hover:bg-red-500/10 transition-colors">
                            <X size={32} />
                        </button>
                        <button onClick={() => { onClose(); onSwipe('up'); }} className="w-14 h-14 rounded-full bg-black/50 border border-blue-500/50 flex items-center justify-center text-blue-500 hover:bg-blue-500/10 transition-colors mt-2">
                            <StarIcon size={24} />
                        </button>
                        <button onClick={() => { onClose(); onSwipe('right'); }} className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#ff4b91] to-[#ff9e4a] flex items-center justify-center text-white shadow-xl hover:scale-105 transition-transform">
                            <Heart size={32} fill="white" />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
