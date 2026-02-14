"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Phone, Send } from "lucide-react";
import { authService } from "@/services/api";
import { useTelegram } from "@/lib/telegram";
import { Toast } from '@/components/ui/Toast';
// из env или дефолтное
const TELEGRAM_BOT_NAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME || "YouMeMeet_bot";

export default function AuthGatePage() {
    const [identifier, setIdentifier] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [telegramLoading, setTelegramLoading] = useState(false);
    const [toast, setToast] = useState<{message: string; type: 'success' | 'error'} | null>(null);
    const router = useRouter();
    const { initData, isReady } = useTelegram();

    // Auto-login when opened inside Telegram Mini App (initData present)
    useEffect(() => {
        if (!isReady || !initData || telegramLoading || isLoading) return;
        
        // FIX: Check if we were redirected due to 401 - prevent auto-login loop
        const redirectReason = sessionStorage.getItem('auth_redirect_reason');
        if (redirectReason === 'unauthorized') {
            sessionStorage.removeItem('auth_redirect_reason');
            // Don't auto-login, let user click the button manually
            return;
        }
        
        // Проверяем, есть ли уже токен - если да, валидируем его перед редиректом
        const existingToken = localStorage.getItem('accessToken') || localStorage.getItem('token');
        if (existingToken) {
            // Validate token by calling /users/me before redirecting
            authService.getMe()
                .then((user) => {
                    // FIX: Check profile completion status
                    if (user.is_complete === false) {
                        router.replace("/onboarding");
                    } else {
                        router.replace("/");
                    }
                })
                .catch(() => {
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('token');
                    // Now proceed with Telegram login
                    performTelegramLogin();
                });
            return;
        }
        
        // No token - proceed with Telegram login
        performTelegramLogin();
        
        function performTelegramLogin() {
            if (!initData) return; // Guard against undefined
            setTelegramLoading(true);
            authService
                .telegramLogin(initData)
                .then(async (data) => {
                    
                    // FIX: Even if has_profile is true, verify profile is actually complete
                    // by checking for photos and real data
                    if (data.has_profile) {
                        try {
                            const me = await authService.getMe();
                            
                            // Profile is only truly complete if user has photos and real gender
                            const hasPhotos = me.photos && me.photos.length > 0;
                            const hasRealGender = me.gender && me.gender !== 'other';
                            
                            if (!hasPhotos || !hasRealGender) {
                                router.replace("/onboarding");
                                return;
                            }
                            
                            router.replace("/");
                        } catch (e) {
                            console.error("[Auth] Failed to verify profile:", e);
                            router.replace("/onboarding");
                        }
                    } else {
                        // Используем единый onboarding flow вместо /auth/setup
                        router.replace("/onboarding");
                    }
                })
                .catch((err) => {
                    console.error("[Auth] Telegram login failed:", err);
                    setTelegramLoading(false);
                });
        }
    }, [isReady, initData, router, telegramLoading, isLoading]);

    const handleTelegramClick = () => {
        // FIX: Prevent double-click
        if (telegramLoading || isLoading) return;
        
        // Проверяем, есть ли initData (открыто внутри Telegram Mini App)
        const initDataRaw =
            (typeof window !== "undefined" && window.Telegram?.WebApp?.initData) || initData;

        if (initDataRaw && initDataRaw.length >= 10) {
            // Уже внутри Mini App - делаем автовход
            setTelegramLoading(true);
            authService.telegramLogin(initDataRaw)
                .then(async (data) => {
                    
                    // FIX: Even if has_profile is true, verify profile is actually complete
                    if (data.has_profile) {
                        try {
                            const me = await authService.getMe();
                            
                            const hasPhotos = me.photos && me.photos.length > 0;
                            const hasRealGender = me.gender && me.gender !== 'other';
                            
                            if (!hasPhotos || !hasRealGender) {
                                router.replace("/onboarding");
                                return;
                            }
                            
                            router.replace("/");
                        } catch (e) {
                            console.error("[Auth] Button - Failed to verify profile:", e);
                            router.replace("/onboarding");
                        }
                    } else {
                        // Используем единый onboarding flow
                        router.replace("/onboarding");
                    }
                })
                .catch((error: unknown) => {
                    setTelegramLoading(false);
                    const err = error as Error;
                    setToast({message: err?.message || "Ошибка входа через Telegram", type: 'error'});
                });
            return;
        }

        // Не в Mini App - открываем бота в Telegram
        window.open(`https://t.me/${TELEGRAM_BOT_NAME}`, "_blank");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (identifier.length < 3) return;

        setIsLoading(true);
        try {
            await authService.requestOtp(identifier);
            // SEC-001: OTP is no longer returned in response, check server logs in dev mode
            router.push(`/auth/otp?phone=${encodeURIComponent(identifier)}`);
        } catch (error: unknown) {
            console.error("Login failed:", error);
            const err = error as Error;
            setToast({message: err.message || "Ошибка входа", type: 'error'});
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-sm flex flex-col items-center">
                {/* Brand Logo */}
                <div className="w-24 h-24 mb-8 rounded-[2rem] bg-gradient-to-br from-[#ff4b91] to-[#ff9e4a] flex items-center justify-center shadow-xl shadow-pink-200">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                    </svg>
                </div>

                <h1 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">YouMe</h1>
                <p className="text-slate-500 mb-10 text-center">
                    Знакомства нового поколения
                </p>

                {/* Primary Action: Telegram — inside Mini App = login by initData; outside = open in Telegram */}
                <button
                    type="button"
                    onClick={handleTelegramClick}
                    disabled={telegramLoading}
                    className="w-full py-4 rounded-2xl bg-[#0088cc] text-white font-bold text-lg shadow-lg shadow-blue-200 hover:shadow-blue-300 transition-all active:scale-95 flex items-center justify-center gap-3 mb-8 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {telegramLoading ? (
                        <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <Send size={24} />
                    )}
                    <span>Войти через Telegram</span>
                </button>
                <p className="text-slate-500 text-sm text-center mb-4 -mt-4">
                    {initData ? "После входа откроется анкета или главная." : "Нажмите кнопку, чтобы открыть бота и войти в приложение"}
                </p>

                <div className="flex items-center gap-4 w-full mb-8">
                    <div className="h-px bg-gray-200 flex-1"></div>
                    <span className="text-gray-400 text-sm font-medium">ИЛИ</span>
                    <div className="h-px bg-gray-200 flex-1"></div>
                </div>

                {/* Developer / Phone Login (Visible now) */}
                <div className="w-full bg-white p-6 rounded-3xl shadow-soft">
                    <h2 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-wider text-center">
                        Вход по номеру
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Phone size={18} className="text-gray-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="+7 999 000-00-00"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-100 rounded-xl py-4 pl-12 pr-4 text-slate-900 outline-none focus:border-[#ff4b91] focus:ring-2 focus:ring-pink-100 transition-all font-medium placeholder:text-gray-400"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={identifier.length < 3 || isLoading}
                            className="w-full py-4 rounded-xl bg-slate-900 text-white font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>Получить код</span>
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>
                    <p className="text-center text-xs text-slate-400 mt-4">
                        * Для локального тестирования код придёт во всплывающем окне
                    </p>
                </div>
            </div>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
