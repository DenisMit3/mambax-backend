"use client";

import { useState, Suspense, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authService } from "@/services/api";
import { ShieldCheck, ArrowLeft } from "lucide-react";

function OtpContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const phone = searchParams.get("phone") || "";

    // FIX: 6 digits OTP instead of 4
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [loading, setLoading] = useState(false);
    const inputs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        // Auto-focus first input
        inputs.current[0]?.focus();
    }, []);

    const handleChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return; // Numbers only
        if (value.length > 1) {
            // Handle paste somewhat properly if getting huge string, but basics first
            return;
        }

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto focus next (6 digits now)
        if (value && index < 5) {
            inputs.current[index + 1]?.focus();
        }

        // Auto submit on last digit
        if (index === 5 && value) {
            handleComplete(newOtp.join(""));
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            inputs.current[index - 1]?.focus();
        }
    };

    const handleComplete = async (code: string) => {
        setLoading(true);
        try {
            if (!phone) return;
            const data = await authService.login(phone, code);

            // Redirect based on profile existence
            if (data.has_profile) {
                router.push("/");
            } else {
                router.push("/onboarding");
            }
        } catch (error) {
            // Dev hint - updated for 6 digits
            alert("Код неверный (Попробуйте 000000)");
            setOtp(["", "", "", "", "", ""]);
            setLoading(false);
            inputs.current[0]?.focus();
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-purple-900/10 to-transparent pointer-events-none" />
            <div className="absolute right-0 top-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="w-full max-w-sm relative z-10 flex flex-col items-center">
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-8 border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)]">
                    <ShieldCheck className="w-8 h-8 text-cyan-400" />
                </div>

                <h1 className="text-2xl font-black text-white tracking-wide uppercase mb-2">Код доступа</h1>
                <p className="text-slate-400 text-center text-sm mb-10 max-w-[250px]">
                    Мы отправили цифровой ключ на номер <span className="text-white font-mono">{phone}</span>
                </p>

                <div className="flex gap-4 mb-10">
                    {otp.map((digit, i) => (
                        <input
                            key={i}
                            ref={(el) => { inputs.current[i] = el; }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleChange(i, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(i, e)}
                            onPaste={(e) => {
                                e.preventDefault();
                                // FIX: 6 digits instead of 4
                                const pastedData = e.clipboardData.getData('text').slice(0, 6).split('');
                                if (pastedData.length === 6 && pastedData.every(c => /\d/.test(c))) {
                                    setOtp(pastedData as [string, string, string, string, string, string]);
                                    handleComplete(pastedData.join(""));
                                }
                            }}
                            className={`w-11 h-14 bg-white/5 border rounded-2xl text-center text-2xl font-mono text-white outline-none transition-all duration-300
                                ${digit
                                    ? 'border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)] scale-105'
                                    : 'border-white/10 focus:border-white/30 focus:bg-white/10'
                                }
                                ${loading ? 'opacity-50 cursor-wait' : ''}
                            `}
                        />
                    ))}
                </div>

                {loading && (
                    <div className="mb-6 flex items-center gap-2 text-cyan-400 text-sm font-bold uppercase tracking-widest animate-pulse">
                        <span className="w-2 h-2 bg-cyan-400 rounded-full" />
                        Проверка ключа...
                    </div>
                )}

                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-sm font-medium"
                >
                    <ArrowLeft size={16} />
                    Изменить номер
                </button>

                <p className="mt-8 text-xs text-slate-600 font-mono">
                    DEV HINT: Используйте код <span className="text-slate-400">000000</span>
                </p>
            </div>
        </div>
    );
}

export default function OtpPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Загрузка нейросети...</div>}>
            <OtpContent />
        </Suspense>
    );
}
