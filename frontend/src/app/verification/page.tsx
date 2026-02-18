"use client";

import { useState, useEffect, useRef } from "react";
import { verificationApi, type VerificationStatus } from "@/services/api/verification";
import { ArrowLeft, Camera, ShieldCheck, Clock, XCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Toast } from "@/components/ui/Toast";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export default function VerificationPage() {
    const { isAuthed, isChecking } = useRequireAuth();
    const [status, setStatus] = useState<VerificationStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const loadStatus = async () => {
        try {
            const data = await verificationApi.getStatus();
            setStatus(data);
        } catch {
            console.error("Failed to load verification status");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthed) loadStatus();
    }, [isAuthed]);

    useEffect(() => {
        return () => {
            if (preview) URL.revokeObjectURL(preview);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            if (preview) URL.revokeObjectURL(preview);
            const f = e.target.files[0];
            setFile(f);
            setPreview(URL.createObjectURL(f));
        }
    };

    const handleSubmit = async () => {
        if (!file) return;
        setUploading(true);
        try {
            await verificationApi.uploadVerificationPhoto(file);
            setSubmitted(true);
            setFile(null);
            if (preview) URL.revokeObjectURL(preview);
            setPreview(null);
            setToast({ message: "Фото отправлено на проверку", type: "success" });
        } catch {
            setToast({ message: "Ошибка отправки фото", type: "error" });
        } finally {
            setUploading(false);
        }
    };

    if (isChecking || loading) {
        return (
            <div className="flex items-center justify-center h-dvh bg-black">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    // --- Approved ---
    if (status?.status === "approved") {
        return (
            <div className="min-h-dvh bg-black flex flex-col">
                <Header />
                <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
                    <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
                        <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Вы верифицированы</h2>
                    <p className="text-slate-400 mt-2 text-sm">Ваш профиль отмечен синим значком.</p>
                    <Link href="/profile" className="mt-8 px-8 py-3 bg-white text-black font-semibold rounded-xl">
                        В профиль
                    </Link>
                </div>
            </div>
        );
    }

    // --- Pending (or just submitted) ---
    if (status?.status === "pending" || submitted) {
        return (
            <div className="min-h-dvh bg-black flex flex-col">
                <Header />
                <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
                    <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
                        <Clock className="w-10 h-10 text-amber-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Фото на проверке</h2>
                    <p className="text-slate-400 mt-2 text-sm max-w-xs">
                        Мы проверим ваше селфи в ближайшее время. Обычно это занимает до 24 часов.
                    </p>
                    <Link href="/" className="mt-8 px-8 py-3 bg-white/10 text-white font-semibold rounded-xl">
                        На главную
                    </Link>
                </div>
            </div>
        );
    }

    // --- Rejected ---
    const isRejected = status?.status === "rejected";

    // --- None / Rejected → upload form ---
    return (
        <div className="min-h-dvh bg-black flex flex-col">
            <Header />
            <div className="flex-1 flex flex-col items-center px-6 pt-8">
                {isRejected && (
                    <div className="w-full max-w-sm mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                        <div className="flex items-start gap-3">
                            <XCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-red-300 font-semibold text-sm">Верификация отклонена</p>
                                {status?.rejection_reason && (
                                    <p className="text-red-300/70 text-xs mt-1">{status.rejection_reason}</p>
                                )}
                                <p className="text-slate-400 text-xs mt-2">Попробуйте загрузить другое фото.</p>
                            </div>
                        </div>
                    </div>
                )}

                {!isRejected && (
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 rounded-full bg-cyan-500/20 flex items-center justify-center mx-auto mb-4">
                            <ShieldCheck className="w-8 h-8 text-cyan-400" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Пройдите верификацию</h2>
                        <p className="text-slate-400 mt-2 text-sm max-w-xs mx-auto">
                            Верифицированные профили получают больше лайков и синий значок.
                        </p>
                    </div>
                )}

                {/* Photo area */}
                <div
                    onClick={() => fileRef.current?.click()}
                    className="w-full max-w-sm aspect-[3/4] rounded-2xl border-2 border-dashed border-white/10 bg-white/5 flex items-center justify-center overflow-hidden relative cursor-pointer hover:border-white/20 transition"
                >
                    {preview ? (
                        <Image src={preview} alt="Селфи" fill sizes="100vw" className="object-cover" />
                    ) : (
                        <div className="flex flex-col items-center text-slate-500">
                            <Camera className="w-12 h-12 mb-2" />
                            <span className="text-sm">Нажмите, чтобы сделать селфи</span>
                        </div>
                    )}
                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        capture="user"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                </div>

                {/* Actions */}
                {preview && (
                    <div className="flex gap-3 w-full max-w-sm mt-4">
                        <button
                            onClick={() => {
                                if (preview) URL.revokeObjectURL(preview);
                                setPreview(null);
                                setFile(null);
                            }}
                            className="flex-1 py-3.5 rounded-xl border border-white/10 text-white font-semibold text-sm"
                        >
                            Переснять
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={uploading}
                            className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold text-sm disabled:opacity-50"
                        >
                            {uploading ? "Отправка..." : "Отправить"}
                        </button>
                    </div>
                )}

                {!preview && (
                    <p className="text-slate-600 text-xs mt-4 text-center">
                        Сделайте чёткое фото лица при хорошем освещении
                    </p>
                )}
            </div>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}

function Header() {
    return (
        <div className="h-14 flex items-center px-4 border-b border-white/5">
            <Link href="/profile">
                <ArrowLeft className="w-6 h-6 text-white" />
            </Link>
            <span className="ml-4 font-semibold text-white">Верификация</span>
        </div>
    );
}
