/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/api";
import { X, Camera } from "lucide-react";
import Link from "next/link";

export default function EditProfilePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form State
    const [name, setName] = useState("");
    const [bio, setBio] = useState("");
    const [gender, setGender] = useState("male");
    const [interests, setInterests] = useState<string[]>([]);
    const [photos, setPhotos] = useState<string[]>([]);

    // UI State
    const [newInterest, setNewInterest] = useState("");

    useEffect(() => {
        authService.getMe()
            .then((data) => {
                setName(data.name);
                setBio(data.bio || "");
                setGender(data.gender);
                setInterests(data.interests || []);
                setPhotos(data.photos || []);
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await authService.updateProfile({
                name,
                bio,
                gender,
                interests,
                photos
            });
            alert("Profile updated!");
            router.push("/profile");
        } catch (err) {
            alert("Failed to update profile");
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];

        try {
            // Upload
            const res = await authService.uploadPhoto(file);
            // Update local state
            setPhotos(prev => [...prev, res.url]);
        } catch (err) {
            alert("Upload failed");
            console.error(err);
        }
    };

    const removePhoto = (index: number) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const addInterest = () => {
        if (!newInterest.trim()) return;
        if (interests.includes(newInterest.trim())) return;
        setInterests([...interests, newInterest.trim()]);
        setNewInterest("");
    };

    if (loading) return <div className="flex-center h-screen">Loading...</div>;

    return (
        <div style={{ paddingBottom: '80px', minHeight: '100dvh', background: 'var(--background)' }}>

            {/* Header */}
            <header style={{
                position: 'sticky',
                top: 0,
                zIndex: 50,
                background: 'rgba(255,255,255,0.9)',
                backdropFilter: 'blur(10px)',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                height: '56px'
            }}>
                <Link href="/profile" style={{ display: 'flex', alignItems: 'center', color: 'var(--primary)' }}>
                    <span style={{ fontSize: '16px', fontWeight: 500 }}>Cancel</span>
                </Link>
                <h1 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--foreground)' }}>Edit Profile</h1>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{ fontSize: '16px', fontWeight: 600, color: 'var(--primary)' }}
                >
                    {saving ? "..." : "Done"}
                </button>
            </header>

            <div style={{ maxWidth: '600px', margin: '0 auto' }}>

                {/* Photos Section */}
                <section style={{ padding: '20px 16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>

                        {/* Existing Photos */}
                        {photos.map((url, i) => (
                            <div key={i} style={{
                                position: 'relative',
                                aspectRatio: '2/3',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)'
                            }}>
                                <img
                                    src={url}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                                <button
                                    onClick={() => removePhoto(i)}
                                    style={{
                                        position: 'absolute',
                                        top: '6px',
                                        right: '6px',
                                        background: 'rgba(255, 255, 255, 0.9)',
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                    }}
                                >
                                    <X size={14} color="#000" />
                                </button>
                            </div>
                        ))}

                        {/* Add Photo Button */}
                        <div style={{
                            aspectRatio: '2/3',
                            borderRadius: '12px',
                            background: 'var(--surface-hover)',
                            border: '2px dashed var(--border)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            position: 'relative'
                        }}>
                            <div style={{
                                width: '40px', height: '40px',
                                borderRadius: '50%', background: 'var(--primary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                marginBottom: '8px'
                            }}>
                                <Camera size={20} color="white" />
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Add Photo</span>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoUpload}
                                style={{ position: 'absolute', opacity: 0, inset: 0, cursor: 'pointer' }}
                            />
                        </div>

                    </div>
                    <p style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                        Drag to reorder photos coming soon
                    </p>
                </section>

                {/* Form Fields - iOS Style Grouped */}
                <div style={{ padding: '0 16px 30px' }}>

                    <h3 style={{ textTransform: 'uppercase', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', paddingLeft: '4px' }}>
                        About You
                    </h3>

                    <div style={{ background: 'var(--surface)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                        <div className="input-group" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
                            <label style={{ width: '100px', fontWeight: 500 }}>Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '16px', outline: 'none' }}
                                placeholder="Your Name"
                            />
                        </div>

                        <div className="input-group" style={{ padding: '12px 16px', display: 'flex', gap: '10px' }}>
                            <label style={{ width: '100px', fontWeight: 500, paddingTop: '4px' }}>Bio</label>
                            <textarea
                                value={bio}
                                onChange={e => setBio(e.target.value)}
                                style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '16px', outline: 'none', resize: 'none', fontFamily: 'inherit' }}
                                rows={4}
                                placeholder="Describe yourself..."
                            />
                        </div>
                    </div>

                    <h3 style={{ textTransform: 'uppercase', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', marginTop: '24px', paddingLeft: '4px' }}>
                        Details
                    </h3>

                    <div style={{ background: 'var(--surface)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                        <div className="input-group" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center' }}>
                            <label style={{ width: '100px', fontWeight: 500 }}>Gender</label>
                            <select
                                value={gender}
                                onChange={e => setGender(e.target.value)}
                                style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '16px', outline: 'none' }}
                            >
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                            </select>
                        </div>
                    </div>

                    <h3 style={{ textTransform: 'uppercase', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', marginTop: '24px', paddingLeft: '4px' }}>
                        Interests
                    </h3>

                    <div style={{
                        background: 'var(--surface)',
                        borderRadius: '12px',
                        padding: '16px',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '8px'
                    }}>
                        {interests.map((tag, i) => (
                            <span key={i} style={{
                                background: 'rgba(255, 90, 39, 0.1)',
                                color: 'var(--primary)',
                                padding: '6px 12px',
                                borderRadius: '100px',
                                fontSize: '14px',
                                fontWeight: 500,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                                {tag}
                                <X size={14} style={{ cursor: 'pointer' }} onClick={() => setInterests(interests.filter(t => t !== tag))} />
                            </span>
                        ))}

                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <input
                                type="text"
                                value={newInterest}
                                onChange={e => setNewInterest(e.target.value)}
                                placeholder="+ Add Interest"
                                onKeyDown={e => e.key === 'Enter' && addInterest()}
                                style={{
                                    background: 'transparent',
                                    border: '1px dashed var(--text-muted)',
                                    borderRadius: '100px',
                                    padding: '6px 12px',
                                    fontSize: '14px',
                                    outline: 'none',
                                    width: '120px'
                                }}
                            />
                            {newInterest && (
                                <button
                                    onClick={addInterest}
                                    style={{
                                        position: 'absolute', right: '4px',
                                        color: 'var(--primary)', fontWeight: 700
                                    }}>
                                    +
                                </button>
                            )}
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}
