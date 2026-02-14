"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

export default function SetupNamePage() {
    const [name, setName] = useState("");
    const router = useRouter();

    const handleNext = () => {
        if (name.length < 2) return;
        // Save to context/localstorage in real app
        if (typeof window !== 'undefined') localStorage.setItem("setup_name", name);
        router.push("/auth/setup/age");
    };

    return (
        <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '100px' }}>
            <div style={{ width: '100%', maxWidth: '320px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '10px' }}>Меня зовут</h1>

                <input
                    type="text"
                    placeholder="Ваше имя"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
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
                    Так ваше имя будет отображаться в MambaX.
                </p>

                <button
                    className="btn btn-primary"
                    disabled={name.length < 2}
                    onClick={handleNext}
                    style={{ width: '100%', opacity: name.length < 2 ? 0.5 : 1 }}
                >
                    Далее <ArrowRight size={18} style={{ marginLeft: '8px' }} />
                </button>
            </div>
        </div>
    );
}
