'use client';

import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import { Heart, X, Star, MapPin, Verified } from 'lucide-react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

import { useHaptic } from '@/hooks/useHaptic';
import { GlassCard } from '@/components/ui/GlassCard';

interface Profile {
    id: string;
    name: string;
    age: number;
    bio: string;
    photos: string[];
    distance: number;
    isVerified: boolean;
    aiCompatibility: number;
    isOnline: boolean;
    lastSeen?: string;
}

interface SwipeCardProps {
    profile: Profile;
    onSwipe: (direction: 'left' | 'right' | 'up', profileId: string) => void;
    isTop?: boolean;
    compatibilityScore?: number;
    commonInterests?: string[];
}

export const SwipeCard = ({
    profile,
    onSwipe,
    isTop = false,
    compatibilityScore,
    commonInterests
}: SwipeCardProps) => {
    const haptic = useHaptic();
    const prefersReducedMotion = useReducedMotion();
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotate = useTransform(x, [-300, 300], [-30, 30]);
    const opacity = useTransform(x, [-300, -150, 0, 150, 300], [0, 1, 1, 1, 0]);

    // Action indicators
    const likeOpacity = useTransform(x, [0, 150], [0, 1]);
    const passOpacity = useTransform(x, [0, -150], [0, 1]);
    const superLikeOpacity = useTransform(y, [0, -150], [0, 1]);

    const handleDragStart = () => {
        setIsDragging(true);
        haptic.selection();
    };

    const handleDragEnd = (event: any, info: PanInfo) => {
        setIsDragging(false);
        const threshold = 150;

        if (Math.abs(info.offset.x) > threshold) {
            const direction = info.offset.x > 0 ? 'right' : 'left';
            haptic.medium();
            onSwipe(direction, profile.id);
        } else if (info.offset.y < -threshold) {
            haptic.heavy();
            onSwipe('up', profile.id);
        } else {
            // Snap back
            x.set(0);
            y.set(0);
        }
    };

    const nextPhoto = () => {
        setCurrentPhotoIndex((prev) =>
            prev < profile.photos.length - 1 ? prev + 1 : 0
        );
        haptic.light();
    };

    const prevPhoto = () => {
        setCurrentPhotoIndex((prev) =>
            prev > 0 ? prev - 1 : profile.photos.length - 1
        );
        haptic.light();
    };

    return (
        <motion.div
            ref={cardRef}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
            style={{ x, y, rotate, opacity }}
            drag={isTop}
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            whileHover={(!isDragging && !prefersReducedMotion) ? { scale: 1.02 } : {}}
            transition={{ type: 'spring', stiffness: prefersReducedMotion ? 0 : 300, damping: 20 }}
        >
            <GlassCard className="h-full w-full overflow-hidden">
                {/* Photo Container */}
                <div className="relative h-2/3 overflow-hidden rounded-t-3xl">
                    <motion.img
                        src={profile.photos[currentPhotoIndex]}
                        alt={profile.name}
                        loading="lazy"
                        className="h-full w-full object-cover"
                        initial={{ scale: 1.1 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                    />

                    {/* Photo Navigation */}
                    <div className="absolute top-4 left-4 right-4 flex space-x-1">
                        {profile.photos.map((_, index) => (
                            <div
                                key={index}
                                className={`h-1 flex-1 rounded-full transition-all duration-300 ${index === currentPhotoIndex
                                    ? 'bg-white'
                                    : 'bg-white/30'
                                    }`}
                            />
                        ))}
                    </div>

                    {/* Invisible tap areas for photo navigation */}
                    <button
                        className="absolute left-0 top-0 h-full w-1/2"
                        onClick={prevPhoto}
                    />
                    <button
                        className="absolute right-0 top-0 h-full w-1/2"
                        onClick={nextPhoto}
                    />

                    {/* Status Badges */}
                    <div className="absolute top-4 right-4 flex flex-col space-y-2">
                        {profile.isVerified && (
                            <motion.div
                                className="flex items-center space-x-1 rounded-full bg-blue-500 px-2 py-1"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2 }}
                            >
                                <Verified size={12} className="text-white" />
                            </motion.div>
                        )}

                        {profile.isOnline && (
                            <motion.div
                                className="h-3 w-3 rounded-full bg-green-500 border-2 border-white"
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                            />
                        )}
                    </div>

                    {/* Swipe Action Overlays */}
                    <motion.div
                        className="absolute inset-0 flex items-center justify-center bg-green-500/20"
                        style={{ opacity: likeOpacity }}
                    >
                        <motion.div
                            className="rounded-full bg-green-500 p-4"
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ repeat: Infinity, duration: 0.5 }}
                        >
                            <Heart className="h-8 w-8 text-white fill-white" />
                        </motion.div>
                    </motion.div>

                    <motion.div
                        className="absolute inset-0 flex items-center justify-center bg-red-500/20"
                        style={{ opacity: passOpacity }}
                    >
                        <motion.div
                            className="rounded-full bg-red-500 p-4"
                            animate={{ rotate: [0, -10, 10, 0] }}
                            transition={{ repeat: Infinity, duration: 0.5 }}
                        >
                            <X className="h-8 w-8 text-white" />
                        </motion.div>
                    </motion.div>

                    <motion.div
                        className="absolute inset-0 flex items-center justify-center bg-blue-500/20"
                        style={{ opacity: superLikeOpacity }}
                    >
                        <motion.div
                            className="rounded-full bg-blue-500 p-4"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ repeat: Infinity, duration: 0.8 }}
                        >
                            <Star className="h-8 w-8 text-white fill-white" />
                        </motion.div>
                    </motion.div>
                </div>

                {/* Profile Info */}
                <div className="h-1/3 p-6">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                            <h3 className="text-2xl font-bold text-white">
                                {profile.name}, {profile.age}
                            </h3>
                        </div>

                        <div className="flex items-center space-x-1 text-orange-400">
                            <Star size={16} className="fill-current" />
                            <span className="text-sm font-semibold">
                                {profile.aiCompatibility}%
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4 mb-3">
                        <div className="flex items-center space-x-1 text-gray-400">
                            <MapPin size={14} />
                            <span className="text-sm">{profile.distance}km away</span>
                        </div>

                        {!profile.isOnline && profile.lastSeen && (
                            <span className="text-sm text-gray-400">
                                Active {profile.lastSeen}
                            </span>
                        )}
                    </div>

                    {(compatibilityScore || profile.aiCompatibility) && (
                        <div className="flex items-center gap-2 mb-3">
                            <div className="bg-green-500/20 px-3 py-1 rounded-full">
                                <span className="text-green-400 text-xs font-black">
                                    {Math.round(compatibilityScore || profile.aiCompatibility || 0)}% совместимость
                                </span>
                            </div>
                        </div>
                    )}

                    {commonInterests && commonInterests.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                            {commonInterests.map((interest) => (
                                <span
                                    key={interest}
                                    className="bg-pink-500/20 text-pink-300 px-3 py-1 rounded-full text-[10px] font-bold"
                                >
                                    ✨ {interest}
                                </span>
                            ))}
                        </div>
                    )}

                    <p className="text-gray-300 text-sm leading-relaxed line-clamp-3">
                        {profile.bio}
                    </p>
                </div>
            </GlassCard>
        </motion.div>
    );
};
