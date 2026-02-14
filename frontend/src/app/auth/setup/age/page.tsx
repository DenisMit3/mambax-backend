"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Toast } from '@/components/ui/Toast';

export default function SetupAgePage() {
    const [age, setAge] = useState("");
    const [toast, setToast] = useState<{message: string; type: 'success' | 'error'} | null>(null);
    const router = useRouter();

    const handleNext = () => {
        const ageNum = parseInt(age);
        if (isNaN(ageNum) || ageNum < 18 || ageNum > 100) {
            setToast({message: "Введите корректный возраст (18+)", type: 'error'});
            return;
        }
        if (typeof window !== 'undefined') localStorage.setItem("setup_age", age);
        router.push("/auth/setup/gender");
    };

    return (
        <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '100px' }}>
            <div style={{ width: '100%', maxWidth: '320px' }}>
                <button onClick={() => router.back()} style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>
                    <ArrowLeft />
                </button>

                <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '10px' }}>Мой возраст</h1>

                <input
                    type="number"
                    placeholder="Введите возраст"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    autoFocus
                    style={{
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: '2px solid var(--text-muted)',
                        fontSize: '32px',
                        color: 'white',
                        fontWeight: 700,
                        padding: '10px 0',
                        outline: 'none',
                        marginBottom: '40px'
                    }}
                />

                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '40px' }}>
                    Ваш возраст будет виден другим пользователям.
                </p>

                <button
                    className="btn btn-primary"
                    disabled={!age}
                    onClick={handleNext}
                    style={{ width: '100%', opacity: !age ? 0.5 : 1 }}
                >
                    Далее <ArrowRight size={18} style={{ marginLeft: '8px' }} />
                </button>
            </div>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
