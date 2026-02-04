'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, KeyRound, AlertTriangle, User, ArrowRight } from 'lucide-react';
import { authService } from '@/services/api';

interface GatekeeperProps {
    onUnlock: () => void;
}

export function AdminGatekeeper({ onUnlock }: GatekeeperProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Use adminLogin for email/password auth
            const response = await authService.adminLogin(email, password);
            if (response && response.access_token) {
                onUnlock();
            } else {
                setError("Invalid response from server");
            }
        } catch (err: any) {
            console.error("Login failed", err);
            setError(err.message || "Authentication failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-6 text-white font-mono overflow-hidden">
            {/* Background Grid */}
            <div className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                    backgroundImage: `linear-gradient(to right, #333 1px, transparent 1px), linear-gradient(to bottom, #333 1px, transparent 1px)`,
                    backgroundSize: '40px 40px'
                }}
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative z-10 w-full max-w-sm space-y-8"
            >
                <div className="text-center space-y-4">
                    <motion.div
                        className={`w-20 h-20 rounded-2xl mx-auto flex items-center justify-center border-2 shadow-[0_0_30px_rgba(0,0,0,0.5)] ${error ? 'border-red-500 bg-red-900/20' : 'border-blue-500 bg-blue-900/20'}`}
                        animate={{ rotate: loading ? 360 : 0 }}
                        transition={{ duration: 2, repeat: loading ? Infinity : 0, ease: "linear" }}
                    >
                        {loading ? <KeyRound className="w-8 h-8 text-blue-400" /> : <Lock className={`w-8 h-8 ${error ? 'text-red-500' : 'text-blue-500'}`} />}
                    </motion.div>

                    <div>
                        <h1 className="text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                            SECURE ACCESS
                        </h1>
                        <p className="text-[10px] text-gray-500 uppercase tracking-[0.3em] mt-2">
                            Admin Clearance Required
                        </p>
                    </div>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="email"
                                placeholder="GHOST ID (EMAIL)"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={loading}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all font-mono"
                            />
                        </div>
                        <div className="relative">
                            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="password"
                                placeholder="ACCESS TOKEN (PASSWORD)"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all font-mono"
                            />
                        </div>
                    </div>

                    <div className="h-4 flex items-center justify-center">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center space-x-2 text-red-500 text-xs font-bold"
                            >
                                <AlertTriangle className="w-3 h-3" />
                                <span>{error.toUpperCase()}</span>
                            </motion.div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !email || !password}
                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all flex items-center justify-center space-x-2 group"
                    >
                        <span>{loading ? 'AUTHENTICATING...' : 'INITIATE SESSION'}</span>
                        {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                    </button>
                </form>

                <div className="text-center">
                    <p className="text-[8px] text-gray-600 uppercase">
                        Use your standard platform credentials.<br />
                        IP: {typeof window !== 'undefined' ? window.location.hostname : 'DETECTED'}
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
