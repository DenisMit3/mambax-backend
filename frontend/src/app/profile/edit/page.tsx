"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/api";
import { Bot, Save, ArrowLeft, Camera, X } from "lucide-react";
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
        <div style={{ paddingBottom: '40px', minHeight: '100dvh', background: 'var(--background)' }}>

            {/* Header */}
            <div style={{
                padding: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                position: 'sticky',
                top: 0,
                background: 'rgba(10,10,10,0.8)',
                backdropFilter: 'blur(10px)',
                zIndex: 50
            }}>
                <Link href="/profile">
                    <div className="icon-btn">
                        <ArrowLeft size={24} />
                    </div>
                </Link>
                <h1 style={{ fontSize: '20px', fontWeight: 700 }}>Edit Profile</h1>
            </div>

            <div className="container" style={{ padding: '20px' }}>

                {/* Photos Section */}
                <section style={{ marginBottom: '30px' }}>
                    <h3 style={{ marginBottom: '15px', color: 'var(--text-muted)' }}>Photos</h3>
                    <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px' }}>
                        {/* Add Button */}
                        <div style={{
                            minWidth: '100px',
                            height: '140px',
                            borderRadius: '16px',
                            border: '2px dashed var(--border)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            position: 'relative'
                        }}>
                            <Camera size={24} color="var(--primary)" />
                            <span style={{ fontSize: '12px', marginTop: '5px', color: 'var(--primary)' }}>Add</span>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoUpload}
                                style={{ position: 'absolute', opacity: 0, inset: 0, cursor: 'pointer' }}
                            />
                        </div>

                        {/* Photo List */}
                        {photos.map((url, i) => (
                            <div key={i} style={{ position: 'relative', minWidth: '100px', height: '140px' }}>
                                <img
                                    src={url}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '16px' }}
                                />
                                <button
                                    onClick={() => removePhoto(i)}
                                    style={{
                                        position: 'absolute',
                                        top: '5px',
                                        right: '5px',
                                        background: 'rgba(0,0,0,0.5)',
                                        borderRadius: '50%',
                                        padding: '4px',
                                        border: 'none',
                                        color: 'white',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Form Fields */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* Name */}
                    <div className="input-group">
                        <label>Name</label>
                        <input
                            type="text"
                            className="input"
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    </div>

                    {/* Bio */}
                    <div className="input-group">
                        <label>About Me</label>
                        <textarea
                            className="input"
                            rows={4}
                            value={bio}
                            onChange={e => setBio(e.target.value)}
                            placeholder="Tell us about yourself..."
                            style={{ resize: 'none' }}
                        />
                    </div>

                    {/* Gender */}
                    <div className="input-group">
                        <label>Gender</label>
                        <select
                            className="input"
                            value={gender}
                            onChange={e => setGender(e.target.value)}
                        >
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                        </select>
                    </div>

                    {/* Interests */}
                    <div className="input-group">
                        <label>Interests</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                            {interests.map((tag, i) => (
                                <span key={i} style={{
                                    background: 'var(--surface-hover)',
                                    padding: '5px 12px',
                                    borderRadius: '20px',
                                    fontSize: '13px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px'
                                }}>
                                    {tag}
                                    <X size={12} style={{ cursor: 'pointer' }} onClick={() => setInterests(interests.filter(t => t !== tag))} />
                                </span>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input
                                type="text"
                                className="input"
                                value={newInterest}
                                onChange={e => setNewInterest(e.target.value)}
                                placeholder="Add interest (e.g. Travel)"
                                onKeyDown={e => e.key === 'Enter' && addInterest()}
                            />
                            <button className="icon-btn" onClick={addInterest} style={{ background: 'var(--primary-gradient)' }}>
                                <Save size={18} />
                            </button>
                        </div>
                    </div>

                </div>

                {/* Save Button */}
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn btn-primary"
                    style={{
                        width: '100%',
                        marginTop: '30px',
                        padding: '15px',
                        fontSize: '16px',
                        fontWeight: 600
                    }}
                >
                    {saving ? "Saving..." : "Save Changes"}
                </button>

            </div>
        </div>
    );
}
