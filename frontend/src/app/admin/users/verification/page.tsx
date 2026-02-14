'use client';

import { useState, useEffect } from 'react';
import { adminApi, VerificationRequestItem } from '@/services/adminApi';
import { Check, X, RefreshCw, Loader2, User, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
// Assuming we have these, if not I'll stick to basic standard UI or imports available
// using standard img tags for now to avoid next/image complexity with external URLs if not configured

export default function VerificationQueuePage() {
    const [queue, setQueue] = useState<VerificationRequestItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchQueue = async () => {
        setLoading(true);
        try {
            const response = await adminApi.users.getVerificationQueue();
            setQueue(response.items);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQueue();
    }, []);

    const handleReview = async (requestId: string, action: 'approve' | 'reject') => {
        try {
            await adminApi.users.reviewVerification(requestId, action);
            setQueue(prev => prev.filter(item => item.id !== requestId));
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="p-6 md:p-8 space-y-6 pb-24 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter">
                        Verification Queue
                    </h1>
                    <p className="text-gray-400 font-mono text-sm mt-1">
                        PENDING REVIEWS: <span className="text-primary-red font-bold">{queue.length}</span>
                    </p>
                </div>
                <AnimatedButton
                    variant="ghost"
                    onClick={fetchQueue}
                    disabled={loading}
                >
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    <span className="ml-2">Обновить</span>
                </AnimatedButton>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-500" />
                    <p className="font-mono text-sm animate-pulse">Establishing secure link...</p>
                </div>
            ) : queue.length === 0 ? (
                <GlassCard className="p-12 flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6">
                        <Check className="w-10 h-10 text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">All Clear</h2>
                    <p className="text-gray-400 max-w-md">
                        There are no pending verification requests at this moment.
                        Good job, Officer.
                    </p>
                </GlassCard>
            ) : (
                <div className="grid grid-cols-1 gap-8">
                    <AnimatePresence>
                        {queue.map(item => (
                            <VerificationCard
                                key={item.id}
                                item={item}
                                onReview={handleReview}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}

function VerificationCard({ item, onReview }: { item: VerificationRequestItem, onReview: (id: string, action: 'approve' | 'reject') => void }) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -50 }}
        >
            <GlassCard className="overflow-hidden border-l-4 border-l-blue-500">
                {/* Header */}
                <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                            {item.user_name.charAt(0)}
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg leading-none">{item.user_name}</h3>
                            <div className="flex items-center space-x-2 mt-1">
                                <span className="text-xs font-mono text-gray-400">ID: {item.user_id.slice(0, 8)}</span>
                                <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-300 font-bold uppercase">
                                    Score: {item.ai_confidence ? Math.round(item.ai_confidence * 100) : 'N/A'}%
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-gray-500 font-mono">
                            Submitted: {new Date(item.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">
                            {new Date(item.created_at).toLocaleTimeString()}
                        </div>
                    </div>
                </div>

                {/* Comparison Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                    {/* Left: Profile Photos (Reference) */}
                    <div className="p-6 bg-black/20 border-r border-white/5">
                        <div className="flex items-center space-x-2 mb-4 text-gray-400">
                            <User className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-widest">Profile Reference</span>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            {item.user_photos.slice(0, 3).map((url, idx) => (
                                <div key={idx} className="aspect-[3/4] rounded-lg overflow-hidden bg-gray-800 relative group">
                                    <img
                                        src={url}
                                        alt="Profile"
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                </div>
                            ))}
                            {item.user_photos.length === 0 && (
                                <div className="col-span-3 aspect-video bg-gray-800/50 rounded-lg flex items-center justify-center text-gray-500 text-xs italic">
                                    No profile photos found
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Verification Selfie (Evidence) */}
                    <div className="p-6 bg-blue-500/5 relative">
                        <div className="absolute top-0 right-0 p-1 bg-blue-500 text-white text-[10px] font-bold uppercase px-2 rounded-bl-lg">
                            Evidence
                        </div>
                        <div className="flex items-center space-x-2 mb-4 text-blue-300">
                            <Camera className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-widest">Verification Selfie</span>
                        </div>

                        <div className="w-full max-w-sm mx-auto aspect-[3/4] rounded-xl overflow-hidden bg-black border-2 border-blue-500/30 shadow-2xl relative">
                            {item.submitted_photos[0] ? (
                                <img
                                    src={item.submitted_photos[0]}
                                    alt="Verification Selfie"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-500">
                                    No selfie uploaded
                                </div>
                            )}
                            {/* Overlay info */}
                            <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                                <p className="text-white text-xs font-mono text-center opacity-70">
                                    Valid Gesture Required
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer / Actions */}
                <div className="p-4 bg-white/5 border-t border-white/5 flex items-center justify-end gap-3">
                    <button
                        className="px-6 py-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 hover:border-red-500 transition-all font-bold text-sm flex items-center gap-2 uppercase tracking-wide"
                        onClick={() => onReview(item.id, 'reject')}
                    >
                        <X className="w-4 h-4" />
                        Reject
                    </button>
                    <button
                        className="px-8 py-3 rounded-xl bg-green-500 text-white hover:bg-green-400 hover:shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all font-bold text-sm flex items-center gap-2 uppercase tracking-wide transform hover:-translate-y-0.5"
                        onClick={() => onReview(item.id, 'approve')}
                    >
                        <Check className="w-4 h-4" />
                        Approve User
                    </button>
                </div>
            </GlassCard>
        </motion.div>
    );
}
