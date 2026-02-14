"use client";

import { useState, useEffect, useRef } from "react";
import { authService } from "@/services/api"; // We'll use getBaseUrl logic if exposed, or just fetch
import { ArrowLeft, Camera, Check, X, ShieldCheck, AlertCircle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Toast } from '@/components/ui/Toast';
import { useRequireAuth } from "@/hooks/useRequireAuth";

// Helper to get API URL since it's not exported from api.ts
// Ideally we should export it or add methods to authService.
// We will use relative path if proxy is set up or assume same host if not.
// But api.ts logic is complex. We'll use authService.getMe() to get base URL implicitly? No.
// We will assume the same API_URL as api.ts.
const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api_proxy";

export default function VerificationPage() {
    const { isAuthed, isChecking } = useRequireAuth();
    interface VerificationStatus {
        is_verified: boolean;
        active_session?: VerificationSession;
    }

    interface VerificationSession {
        session_id: string;
        gesture_emoji: string;
        gesture_name: string;
        instruction: string;
    }

    interface VerificationResult {
        is_verified: boolean;
        confidence?: number;
    }

    const [status, setStatus] = useState<VerificationStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState<VerificationSession | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<VerificationResult | null>(null);
    const [toast, setToast] = useState<{message: string; type: 'success' | 'error'} | null>(null);

    const checkStatus = async () => {
        try {
            const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
            const res = await fetch(`${API_URL}/verification/status`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setStatus(data);
                if (data.active_session) {
                    setSession(data.active_session);
                }
            }
        } catch (e) {
            console.error("Status check failed", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthed) checkStatus();
    }, [isAuthed]);

    const startVerification = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
            const res = await fetch(`${API_URL}/verification/start`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setSession(data);
            } else {
                setToast({message: data.detail || "Не удалось начать", type: 'error'});
            }
        } catch (e) {
            setToast({message: "Ошибка запуска верификации", type: 'error'});
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setPreview(URL.createObjectURL(e.target.files[0]));
        }
    };

    const submitVerification = async () => {
        if (!file || !session) return;
        setUploading(true);
        try {
            // 1. Upload Photo
            // reuse authService logic if possible, or implement simple upload
            const formData = new FormData();
            formData.append("file", file);
            const token = localStorage.getItem("accessToken") || localStorage.getItem("token");

            // Use existing upload endpoint
            const upRes = await fetch(`${API_URL}/users/me/photo`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` },
                body: formData
            });

            if (!upRes.ok) throw new Error("Upload failed");
            const upData = await upRes.json();
            const photoUrl = upData.photos[upData.photos.length - 1];

            // 2. Submit Verification
            const subRes = await fetch(`${API_URL}/verification/submit`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                    session_id: session.session_id,
                    selfie_url: photoUrl
                })
            });

            const subData = await subRes.json();
            if (subRes.ok) {
                setResult(subData);
                checkStatus();
            } else {
                setToast({message: subData.detail || "Верификация не пройдена", type: 'error'});
            }

        } catch (e) {
            setToast({message: "Ошибка отправки", type: 'error'});
        } finally {
            setUploading(false);
        }
    };

    if (loading && !status) return <div style={{ display: 'flex', height: '100dvh', alignItems: 'center', justifyContent: 'center' }}>Загрузка...</div>;

    return (
        <div style={{ minHeight: '100dvh', background: '#fff', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ height: '56px', display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid #eee' }}>
                <Link href="/profile">
                    <ArrowLeft color="#333" />
                </Link>
                <div style={{ marginLeft: '16px', fontWeight: 600 }}>Верификация</div>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>

                {status?.is_verified ? (
                    <div style={{ textAlign: 'center', marginTop: '40px' }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#E8F5E9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                            <ShieldCheck size={40} color="#4CAF50" />
                        </div>
                        <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#333' }}>Вы верифицированы!</h2>
                        <p style={{ color: '#666', marginTop: '8px' }}>Ваш профиль получил синий значок.</p>
                        <Link href="/profile" style={{ display: 'inline-block', marginTop: '32px', padding: '12px 32px', background: '#000', color: 'white', borderRadius: '12px', textDecoration: 'none' }}>
                            Перейти в профиль
                        </Link>
                    </div>
                ) : result?.is_verified ? (
                    <div style={{ textAlign: 'center', marginTop: '40px' }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#E8F5E9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                            <Check size={40} color="#4CAF50" />
                        </div>
                        <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#333' }}>Успешно!</h2>
                        <p style={{ color: '#666', marginTop: '8px' }}>Верификация пройдена.</p>
                        <Link href="/profile" style={{ display: 'inline-block', marginTop: '32px', padding: '12px 32px', background: '#000', color: 'white', borderRadius: '12px', textDecoration: 'none' }}>
                            Готово
                        </Link>
                    </div>
                ) : session ? (
                    <div style={{ width: '100%', maxWidth: '400px' }}>
                        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                            <div style={{ fontSize: '64px', marginBottom: '16px' }}>{session.gesture_emoji}</div>
                            <h3 style={{ fontSize: '20px', fontWeight: 700 }}>{session.gesture_name}</h3>
                            <p style={{ color: '#666', marginTop: '8px' }}>{session.instruction}</p>
                        </div>

                        <div style={{
                            aspectRatio: '3/4', background: '#f5f5f5', borderRadius: '20px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            overflow: 'hidden', position: 'relative', border: '2px dashed #ccc', marginBottom: '24px'
                        }}>
                            {preview ? (
                                <Image src={preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Selfie preview" fill unoptimized />
                            ) : (
                                <div style={{ color: '#999', flexDirection: 'column', display: 'flex', alignItems: 'center' }}>
                                    <Camera size={48} />
                                    <span style={{ marginTop: '8px' }}>Сделайте селфи</span>
                                </div>
                            )}

                            <input
                                type="file"
                                accept="image/*"
                                capture="user"
                                onChange={handleFileChange}
                                style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                            />
                        </div>

                        {preview ? (
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={() => { setPreview(null); setFile(null); }}
                                    style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid #ddd', background: 'white', fontWeight: 600 }}
                                >
                                    Переснять
                                </button>
                                <button
                                    onClick={submitVerification}
                                    disabled={uploading}
                                    style={{ flex: 1, padding: '14px', borderRadius: '12px', background: '#000', color: 'white', fontWeight: 600, opacity: uploading ? 0.7 : 1 }}
                                >
                                    {uploading ? 'Проверка...' : 'Отправить'}
                                </button>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', color: '#666', fontSize: '14px' }}>
                                Нажмите на область фото для камеры
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', marginTop: '40px', maxWidth: '320px' }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#F5F5F7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                            <ShieldCheck size={40} color="#333" />
                        </div>
                        <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#333' }}>Пройти верификацию</h2>
                        <p style={{ color: '#666', marginTop: '8px', lineHeight: '1.5' }}>
                            Покажите другим, что вы настоящий. Верифицированные профили получают на 30% больше матчей и синий значок.
                        </p>

                        <div style={{ marginTop: '32px', textAlign: 'left', background: '#f9f9f9', padding: '16px', borderRadius: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                                <div style={{ minWidth: '24px', height: '24px', background: 'black', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', marginRight: '12px' }}>1</div>
                                <span style={{ fontSize: '14px' }}>Повторите жест на экране</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <div style={{ minWidth: '24px', height: '24px', background: 'black', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', marginRight: '12px' }}>2</div>
                                <span style={{ fontSize: '14px' }}>Сделайте чёткое селфи</span>
                            </div>
                        </div>

                        <button
                            onClick={startVerification}
                            style={{ width: '100%', marginTop: '32px', padding: '16px', background: '#000', color: 'white', borderRadius: '16px', fontWeight: 600, fontSize: '16px' }}
                        >
                            Я готов(а)
                        </button>
                    </div>
                )}
            </div>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
