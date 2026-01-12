"use client";

import { useState, useEffect, useRef } from "react";
import { authService } from "@/services/api"; // We'll use getBaseUrl logic if exposed, or just fetch
import { ArrowLeft, Camera, Check, X, ShieldCheck, AlertCircle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

// Helper to get API URL since it's not exported from api.ts
// Ideally we should export it or add methods to authService.
// We will use relative path if proxy is set up or assume same host if not.
// But api.ts logic is complex. We'll use authService.getMe() to get base URL implicitly? No.
// We will assume the same API_URL as api.ts.
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://mambax-backend.up.railway.app";

export default function VerificationPage() {
    const [status, setStatus] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState<any>(null);
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const checkStatus = async () => {
        try {
            const token = localStorage.getItem("token");
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
        checkStatus();
    }, []);

    const startVerification = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_URL}/verification/start`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setSession(data);
            } else {
                alert(data.detail || "Failed to start");
            }
        } catch (e) {
            alert("Error starting verification");
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
            const token = localStorage.getItem("token");

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
                alert(subData.detail || "Verification failed");
            }

        } catch (e) {
            alert("Submission error");
        } finally {
            setUploading(false);
        }
    };

    if (loading && !status) return <div style={{ display: 'flex', height: '100dvh', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;

    return (
        <div style={{ minHeight: '100dvh', background: '#fff', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ height: '56px', display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid #eee' }}>
                <Link href="/profile">
                    <ArrowLeft color="#333" />
                </Link>
                <div style={{ marginLeft: '16px', fontWeight: 600 }}>Verification</div>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>

                {status?.is_verified ? (
                    <div style={{ textAlign: 'center', marginTop: '40px' }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#E8F5E9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                            <ShieldCheck size={40} color="#4CAF50" />
                        </div>
                        <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#333' }}>You're Verified!</h2>
                        <p style={{ color: '#666', marginTop: '8px' }}>Your profile has the blue badge.</p>
                        <Link href="/profile" style={{ display: 'inline-block', marginTop: '32px', padding: '12px 32px', background: '#000', color: 'white', borderRadius: '12px', textDecoration: 'none' }}>
                            Go to Profile
                        </Link>
                    </div>
                ) : result?.is_verified ? (
                    <div style={{ textAlign: 'center', marginTop: '40px' }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#E8F5E9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                            <Check size={40} color="#4CAF50" />
                        </div>
                        <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#333' }}>Success!</h2>
                        <p style={{ color: '#666', marginTop: '8px' }}>Verification Successful.</p>
                        <Link href="/profile" style={{ display: 'inline-block', marginTop: '32px', padding: '12px 32px', background: '#000', color: 'white', borderRadius: '12px', textDecoration: 'none' }}>
                            Done
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
                                <img src={preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <div style={{ color: '#999', flexDirection: 'column', display: 'flex', alignItems: 'center' }}>
                                    <Camera size={48} />
                                    <span style={{ marginTop: '8px' }}>Take a selfie</span>
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
                                    Retake
                                </button>
                                <button
                                    onClick={submitVerification}
                                    disabled={uploading}
                                    style={{ flex: 1, padding: '14px', borderRadius: '12px', background: '#000', color: 'white', fontWeight: 600, opacity: uploading ? 0.7 : 1 }}
                                >
                                    {uploading ? 'Checking...' : 'Submit'}
                                </button>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', color: '#666', fontSize: '14px' }}>
                                Tap photo area to open camera
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', marginTop: '40px', maxWidth: '320px' }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#F5F5F7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                            <ShieldCheck size={40} color="#333" />
                        </div>
                        <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#333' }}>Get Verified</h2>
                        <p style={{ color: '#666', marginTop: '8px', lineHeight: '1.5' }}>
                            Show others you're real. Verified profiles get 30% more matches and a blue badge.
                        </p>

                        <div style={{ marginTop: '32px', textAlign: 'left', background: '#f9f9f9', padding: '16px', borderRadius: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                                <div style={{ minWidth: '24px', height: '24px', background: 'black', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', marginRight: '12px' }}>1</div>
                                <span style={{ fontSize: '14px' }}>Copy the gesture shown on screen</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <div style={{ minWidth: '24px', height: '24px', background: 'black', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', marginRight: '12px' }}>2</div>
                                <span style={{ fontSize: '14px' }}>Take a clear selfie</span>
                            </div>
                        </div>

                        <button
                            onClick={startVerification}
                            style={{ width: '100%', marginTop: '32px', padding: '16px', background: '#000', color: 'white', borderRadius: '16px', fontWeight: 600, fontSize: '16px' }}
                        >
                            I'm Ready
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
