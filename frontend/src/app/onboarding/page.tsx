/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/api";
import { ArrowRight, Star, Shield, Zap, Camera } from "lucide-react";

export default function OnboardingPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: "",
        gender: "",
        photos: [] as string[],
        interests: [] as string[]
    });

    const handleNext = () => {
        setStep(prev => prev + 1);
    };

    const handleFinish = async () => {
        try {
            // For MVP, we mock photos upload or just send empty/placeholder if not implemented
            // In real app: upload photos to S3/Cloudinary first, get URLs.

            // Mocking a photo for now if none added
            const finalData = {
                ...formData,
                photos: formData.photos.length > 0 ? formData.photos : ["https://placehold.co/400x600/png"]
            };

            await authService.createProfile(finalData);
            router.push("/discover");
        } catch (error) {
            console.error("Onboarding error:", error);
            alert("Failed to create profile. Try again.");
        }
    };

    return (
        <div className="container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', justifyContent: 'center', padding: '20px' }}>

            {/* Step Indicator */}
            <div style={{ display: 'flex', gap: '5px', marginBottom: '40px' }}>
                {[1, 2, 3].map(i => (
                    <div key={i} style={{
                        flex: 1,
                        height: '4px',
                        borderRadius: '2px',
                        background: i <= step ? 'var(--primary)' : 'var(--border)'
                    }} />
                ))}
            </div>

            <div className="animate-fade-in">
                {step === 1 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <h1 style={{ fontSize: '28px', fontWeight: 800 }}>What&apos;s your name?</h1>
                        <input
                            type="text"
                            placeholder="Your Name"
                            className="input-field"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                borderBottom: '2px solid var(--border)',
                                padding: '10px 0',
                                fontSize: '24px',
                                color: 'white',
                                outline: 'none'
                            }}
                            autoFocus
                        />
                        <h1 style={{ fontSize: '28px', fontWeight: 800, marginTop: '20px' }}>Gender</h1>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            {['Male', 'Female'].map(g => (
                                <button
                                    key={g}
                                    onClick={() => setFormData({ ...formData, gender: g.toLowerCase() })}
                                    style={{
                                        flex: 1,
                                        padding: '15px',
                                        borderRadius: '12px',
                                        border: formData.gender === g.toLowerCase() ? '2px solid var(--primary)' : '1px solid var(--border)',
                                        background: formData.gender === g.toLowerCase() ? 'rgba(255, 77, 109, 0.1)' : 'transparent',
                                        color: 'white',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    {g}
                                </button>
                            ))}
                        </div>

                        <button
                            className="btn btn-primary"
                            disabled={!formData.name || !formData.gender}
                            onClick={handleNext}
                            style={{ marginTop: 'auto' }}
                        >
                            Continue <ArrowRight size={20} />
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <h1 style={{ fontSize: '28px', fontWeight: 800 }}>Add Photos</h1>
                        <p style={{ color: 'var(--text-secondary)' }}>Add at least 1 photo to continue.</p>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '10px',
                            marginBottom: '20px'
                        }}>
                            {/* Display Uploaded Photos */}
                            {formData.photos.map((photo, index) => (
                                <div key={index} style={{ position: 'relative', aspectRatio: '2/3', borderRadius: '12px', overflow: 'hidden' }}>
                                    <img src={photo} alt="Uploaded" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                            ))}

                            {/* Upload Button */}
                            {formData.photos.length < 4 && (
                                <label style={{
                                    aspectRatio: '2/3',
                                    borderRadius: '12px',
                                    background: 'var(--surface)',
                                    border: '2px dashed var(--border)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer'
                                }}>
                                    <input
                                        type="file"
                                        hidden
                                        accept="image/*"
                                        onChange={async (e) => {
                                            if (e.target.files?.[0]) {
                                                try {
                                                    const res = await authService.uploadPhoto(e.target.files[0]);
                                                    setFormData(prev => ({ ...prev, photos: [...prev.photos, res.url] }));
                                                } catch (err) {
                                                    console.error("Upload failed", err);
                                                    alert("Upload failed");
                                                }
                                            }
                                        }}
                                    />
                                    <Camera size={24} />
                                </label>
                            )}
                        </div>

                        <button
                            className="btn btn-primary"
                            disabled={formData.photos.length === 0}
                            onClick={handleNext}
                        >
                            Continue <ArrowRight size={20} />
                        </button>
                    </div>
                )}

                {step === 3 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <h1 style={{ fontSize: '28px', fontWeight: 800 }}>Interests</h1>
                        <p style={{ color: 'var(--text-secondary)' }}>Select a few tags.</p>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                            {['Music', 'Travel', 'Gym', 'Art', 'Gaming', 'Food', 'Tech'].map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => {
                                        const newInterests = formData.interests.includes(tag)
                                            ? formData.interests.filter(t => t !== tag)
                                            : [...formData.interests, tag];
                                        setFormData({ ...formData, interests: newInterests });
                                    }}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '20px',
                                        border: '1px solid ' + (formData.interests.includes(tag) ? 'var(--primary)' : 'var(--border)'),
                                        background: formData.interests.includes(tag) ? 'var(--primary)' : 'transparent',
                                        color: 'white',
                                        fontSize: '14px'
                                    }}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>

                        <button
                            className="btn btn-primary"
                            onClick={handleFinish}
                            style={{ marginTop: '40px' }}
                        >
                            Finish Profile
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
