'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Copy, Check, X, Link2, QrCode } from 'lucide-react';

interface ProfileShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    profileId: string;
    profileName: string;
}

export function ProfileShareModal({ isOpen, onClose, profileId, profileName }: ProfileShareModalProps) {
    const [copied, setCopied] = useState(false);
    const profileUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/users/${profileId}`
        : `/users/${profileId}`;

    const copyLink = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(profileUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* clipboard unavailable */ }
    }, [profileUrl]);

    const shareNative = useCallback(async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `${profileName} на MambaX`,
                    text: `Посмотри профиль ${profileName}!`,
                    url: profileUrl,
                });
            } catch { /* cancelled */ }
        } else {
            copyLink();
        }
    }, [profileUrl, profileName, copyLink]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25 }}
                        onClick={e => e.stopPropagation()}
                        className="w-full max-w-md bg-slate-900 rounded-t-3xl p-6 border-t border-white/10"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-white">Поделиться профилем</h3>
                            <button onClick={onClose} className="text-slate-500 hover:text-white transition">
                                <X size={20} />
                            </button>
                        </div>

                        {/* QR Code placeholder */}
                        <div className="flex justify-center mb-6">
                            <div className="w-48 h-48 bg-white rounded-2xl flex items-center justify-center p-4">
                                <div className="w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNTYgMjU2Ij48cmVjdCB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgZmlsbD0id2hpdGUiLz48dGV4dCB4PSIxMjgiIHk9IjEyOCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9ImNlbnRyYWwiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IiMzMzMiPtCf0YDQvtGE0LjQu9GMPC90ZXh0Pjwvc3ZnPg==')] bg-contain bg-center bg-no-repeat flex items-center justify-center">
                                    <QrCode size={80} className="text-slate-800" />
                                </div>
                            </div>
                        </div>

                        {/* Link */}
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10 mb-4">
                            <Link2 size={16} className="text-slate-400 shrink-0" />
                            <span className="text-sm text-slate-300 truncate flex-1">{profileUrl}</span>
                            <button
                                onClick={copyLink}
                                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition"
                            >
                                {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-white" />}
                            </button>
                        </div>

                        {/* Share button */}
                        <button
                            onClick={shareNative}
                            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition"
                        >
                            <Share2 size={16} />
                            Поделиться
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
