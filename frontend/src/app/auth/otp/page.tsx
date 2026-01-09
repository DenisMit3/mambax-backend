"use client";

import { useState, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authService } from "@/services/api";


function OtpContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const phone = searchParams.get("phone") || "";

    const [otp, setOtp] = useState(["", "", "", ""]);
    const [loading, setLoading] = useState(false);
    const inputs = useRef<(HTMLInputElement | null)[]>([]);

    const handleChange = (index: number, value: string) => {
        if (value.length > 1) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto focus next
        if (value && index < 3) {
            inputs.current[index + 1]?.focus();
        }

        // Auto submit
        if (index === 3 && value) {
            handleComplete(newOtp.join(""));
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            inputs.current[index - 1]?.focus();
        }
    };

    const handleComplete = async (code: string) => {
        try {
            if (!phone) return;
            const data = await authService.login(phone, code);
            if (data.has_profile) {
                router.push("/discover");
            } else {
                router.push("/onboarding");
            }
        } catch (error) {
            alert("Invalid Code (Try 0000)");
            setOtp(["", "", "", ""]);
            inputs.current[0]?.focus();
        }
    };

    return (
        <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '100%', maxWidth: '320px', textAlign: 'center' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '10px' }}>Enter Code</h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>
                    We sent it to {phone || "your number"}.
                </p>

                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginBottom: '30px' }}>
                    {otp.map((digit, i) => (
                        <input
                            key={i}
                            ref={(el) => { inputs.current[i] = el; }} // TypeScript can infer, or cast as HTMLInputElement | null
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleChange(i, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(i, e)}
                            onFocus={(e) => {
                                e.currentTarget.style.transform = 'scale(1.05)';
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                            }}
                            onPaste={(e) => {
                                e.preventDefault();
                                const pastedData = e.clipboardData.getData('text').slice(0, 4).split('');
                                if (pastedData.length === 4) {
                                    setOtp(pastedData as [string, string, string, string]);
                                    // Focus last input or submit
                                    setTimeout(() => handleComplete(pastedData.join("")), 100);
                                }
                            }}
                            style={{
                                width: '60px',
                                height: '70px',
                                background: 'var(--surface)',
                                border: '1px solid var(--border)',
                                borderRadius: '12px',
                                fontSize: '32px',
                                textAlign: 'center',
                                color: 'white',
                                outline: 'none',
                                fontWeight: 700,
                                transition: 'transform 0.2s ease-in-out'
                            }}
                        />
                    ))}
                </div>

                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                        Didn&apos;t receive code? <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Resend</span>
                    </p>
                </div>

                <button
                    className="btn btn-secondary"
                    style={{ fontSize: '14px' }}
                    onClick={() => alert("Verification code is 0000")}
                >
                    I didn&apos;t receive a code
                </button>
            </div>
        </div>
    );
}

export default function OtpPage() {
    return (
        <Suspense fallback={<div className="container center" style={{ color: 'var(--text-secondary)' }}>Loading...</div>}>
            <OtpContent />
        </Suspense>
    );
}
