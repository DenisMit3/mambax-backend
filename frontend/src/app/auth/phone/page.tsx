"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Phone } from "lucide-react";
import { authService } from "@/services/api";

export default function PhonePage() {
    const [identifier, setIdentifier] = useState("");
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (identifier.length < 3) return;

        await authService.requestOtp(identifier);
        // Pass identifier to next screen via query param or context
        router.push(`/auth/otp?phone=${encodeURIComponent(identifier)}`);
    };

    return (
        <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', background: 'var(--background)' }}>

            <div style={{ width: '100%', maxWidth: '320px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '10px', color: 'var(--foreground)' }}>Log in</h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>
                    Enter your Phone Number or Telegram ID.
                </p>

                <form onSubmit={handleSubmit}>
                    <div style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '15px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        marginBottom: '20px'
                    }}>
                        <Phone size={20} color="var(--text-muted)" />
                        <input
                            type="text"
                            placeholder="Phone or TG ID"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--foreground)',
                                fontSize: '18px',
                                width: '100%',
                                outline: 'none',
                                fontWeight: 500
                            }}
                            autoFocus
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={identifier.length < 3}
                        className="btn btn-primary"
                        style={{ width: '100%', opacity: identifier.length < 3 ? 0.5 : 1 }}
                    >
                        Continue <ArrowRight size={18} style={{ marginLeft: '8px' }} />
                    </button>
                </form>

                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '20px', textAlign: 'center' }}>
                    By continuing, you agree to our Terms of Service.
                </p>
            </div>
        </div>
    );
}
