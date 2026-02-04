/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, X } from "lucide-react";
import { authService } from "@/services/api";

export default function SetupPhotosPage() {
    const [photos, setPhotos] = useState<string[]>([]);
    const router = useRouter();

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAddPhotoClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (photos.length >= 10) {
            alert("Maximum 10 photos allowed");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert("File is too large (max 5MB)");
            return;
        }

        try {
            // Upload to server (Vercel Blob)
            const result = await authService.uploadPhoto(file);
            setPhotos([...photos, result.url]);
        } catch (e) {
            console.error("Upload failed", e);
            alert("Upload failed. Please try again.");
        }

        // Reset input so same file can be selected again if needed
        e.target.value = '';
    };

    const handleFinish = async () => {
        if (photos.length < 1) return;

        try {
            const name = typeof window !== 'undefined' ? localStorage.getItem("setup_name") || "User" : "User";
            const gender = typeof window !== 'undefined' ? localStorage.getItem("setup_gender") || "More" : "More";
            const ageStr = typeof window !== 'undefined' ? localStorage.getItem("setup_age") || "18" : "18";
            const age = parseInt(ageStr);

            await authService.createProfile({ name, age, gender, photos, interests: [] });
            router.push("/discover");
        } catch (e) {
            console.error("Failed to create profile", e);
            // Assuming mock flow allows continue
            router.push("/discover");
        }
    };

    return (
        <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '40px' }}>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                style={{ display: 'none' }}
            />

            <div style={{ width: '100%', maxWidth: '320px' }}>
                <button onClick={() => router.back()} style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>
                    <ArrowLeft />
                </button>

                <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '10px' }}>Add Photos</h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>Add at least 1 photo to continue.</p>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '10px',
                    marginBottom: '40px'
                }}>
                    {/* Photo slots - now 10 instead of 6 */}
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                        <div key={i} style={{
                            aspectRatio: '1',
                            background: 'var(--surface)',
                            borderRadius: 'var(--radius-md)',
                            border: '2px dashed var(--border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            {photos[i] ? (
                                <>
                                    <img src={photos[i]} alt="Uploaded" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <button
                                        onClick={() => setPhotos(photos.filter((_, idx) => idx !== i))}
                                        style={{ position: 'absolute', bottom: 4, right: 4, background: 'rgba(0,0,0,0.5)', borderRadius: '50%', padding: '4px' }}
                                    >
                                        <X size={12} color="white" />
                                    </button>
                                </>
                            ) : (
                                <button onClick={handleAddPhotoClick} style={{ width: '100%', height: '100%' }}>
                                    <Plus color="var(--primary)" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                <button
                    className="btn btn-primary"
                    disabled={photos.length < 1}
                    onClick={handleFinish}
                    style={{ width: '100%', opacity: photos.length < 1 ? 0.5 : 1 }}
                >
                    {photos.length < 1 ? `Add a photo to continue` : "Continue →"}
                </button>
            </div>
        </div>
    );
}
