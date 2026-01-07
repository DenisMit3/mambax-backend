"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function SetupGenderPage() {
    const [gender, setGender] = useState("");
    const router = useRouter();

    const handleNext = () => {
        if (!gender) return;
        if (typeof window !== 'undefined') localStorage.setItem("setup_gender", gender);
        router.push("/auth/setup/photos");
    };

    return (
        <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '80px' }}>
            <div style={{ width: '100%', maxWidth: '320px' }}>
                <button onClick={() => router.back()} style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>
                    <ArrowLeft />
                </button>

                <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '30px' }}>I am a</h1>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '40px' }}>
                    {['Woman', 'Man', 'More'].map((opt) => (
                        <button
                            key={opt}
                            onClick={() => setGender(opt)}
                            style={{
                                padding: '16px',
                                borderRadius: 'var(--radius-full)',
                                border: `2px solid ${gender === opt ? 'var(--primary)' : 'var(--border)'}`,
                                color: gender === opt ? 'var(--primary)' : 'var(--text-secondary)',
                                fontWeight: 600,
                                background: 'transparent',
                                fontSize: '18px',
                                transition: 'all 0.2s'
                            }}
                        >
                            {opt}
                        </button>
                    ))}
                </div>

                <button
                    className="btn btn-primary"
                    disabled={!gender}
                    onClick={handleNext}
                    style={{ width: '100%', opacity: !gender ? 0.5 : 1 }}
                >
                    Next <ArrowRight size={18} style={{ marginLeft: '8px' }} />
                </button>
            </div>
        </div>
    );
}
