/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/api";
import { X, Camera, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useUser } from "@/context/UserContext";
import { ToggleSwitch } from "@/components/ui/ToggleSwitch";
import { Toast } from '@/components/ui/Toast';

export default function EditProfilePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{message: string; type: 'success' | 'error'} | null>(null);

    // Form State
    const [name, setName] = useState("");
    const [bio, setBio] = useState("");
    const [gender, setGender] = useState("male");
    const [interests, setInterests] = useState<string[]>([]);
    const [photos, setPhotos] = useState<string[]>([]);

    const { user, updateUXPreferences } = useUser();
    const [uxPreferences, setUxPreferences] = useState({
        sounds_enabled: true,
        haptic_enabled: true,
        reduced_motion: false
    });

    useEffect(() => {
        if (user?.ux_preferences) {
            setUxPreferences(user.ux_preferences);
        }
    }, [user]);

    const updateUXPref = async (key: string, value: boolean) => {
        const newPrefs = { ...uxPreferences, [key]: value };
        setUxPreferences(newPrefs);
        try {
            await updateUXPreferences(newPrefs);
        } catch (e) {
            console.warn('Failed to update UX preferences:', e);
        }
    };

    // UI State
    const [newInterest, setNewInterest] = useState("");

    useEffect(() => {
        authService.getMe()
            .then((data) => {
                setName(data.name);
                setBio(data.bio || "");
                setGender(data.gender || "male");
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
            setToast({message: "Профиль обновлён!", type: 'success'});
            router.push("/profile");
        } catch (err) {
            setToast({message: "Не удалось обновить профиль", type: 'error'});
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];

        try {
            const res = await authService.uploadPhoto(file);
            setPhotos(prev => [...prev, res.url]);
        } catch (err) {
            setToast({message: "Ошибка загрузки", type: 'error'});
            console.error(err);
        }
    };

    const removePhoto = (index: number) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
    };

    // Перемещение фото влево (на позицию раньше)
    const movePhotoLeft = (index: number) => {
        if (index <= 0) return;
        setPhotos(prev => {
            const next = [...prev];
            [next[index - 1], next[index]] = [next[index], next[index - 1]];
            return next;
        });
    };

    // Перемещение фото вправо (на позицию позже)
    const movePhotoRight = (index: number) => {
        if (index >= photos.length - 1) return;
        setPhotos(prev => {
            const next = [...prev];
            [next[index], next[index + 1]] = [next[index + 1], next[index]];
            return next;
        });
    };

    const addInterest = () => {
        if (!newInterest.trim()) return;
        if (interests.includes(newInterest.trim())) return;
        setInterests([...interests, newInterest.trim()]);
        setNewInterest("");
    };

    if (loading) return <div className="flex-center h-screen">Загрузка...</div>;

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
                    <span style={{ fontSize: '16px', fontWeight: 500 }}>Отмена</span>
                </Link>
                <h1 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--foreground)' }}>Редактировать профиль</h1>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{ fontSize: '16px', fontWeight: 600, color: 'var(--primary)' }}
                >
                    {saving ? "..." : "Готово"}
                </button>
            </header>

            <div style={{ maxWidth: '600px', margin: '0 auto' }}>

                {/* Photos Section */}
                <section style={{ padding: '20px 16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>

                        {/* Existing Photos с кнопками перемещения */}
                        {photos.map((url, i) => (
                            <div key={url || `slot-${i}`} style={{
                                position: 'relative',
                                aspectRatio: '2/3',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)'
                            }}>
                                <img
                                    src={url}
                                    alt={`Фото ${i + 1}`}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />

                                {/* Кнопка удаления */}
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
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                        border: 'none',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <X size={14} color="#000" />
                                </button>

                                {/* Номер позиции */}
                                <div style={{
                                    position: 'absolute',
                                    top: '6px',
                                    left: '6px',
                                    background: 'rgba(0,0,0,0.6)',
                                    color: '#fff',
                                    width: '22px',
                                    height: '22px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                }}>
                                    {i + 1}
                                </div>

                                {/* Кнопки перемещения внизу фото */}
                                {photos.length > 1 && (
                                    <div style={{
                                        position: 'absolute',
                                        bottom: '6px',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        display: 'flex',
                                        gap: '4px',
                                    }}>
                                        {/* Кнопка "Влево" */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); movePhotoLeft(i); }}
                                            disabled={i === 0}
                                            aria-label="Переместить влево"
                                            style={{
                                                width: '28px',
                                                height: '28px',
                                                borderRadius: '50%',
                                                background: i === 0 ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.6)',
                                                border: 'none',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: i === 0 ? 'default' : 'pointer',
                                                opacity: i === 0 ? 0.4 : 1,
                                            }}
                                        >
                                            <ChevronLeft size={16} color="#fff" />
                                        </button>

                                        {/* Кнопка "Вправо" */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); movePhotoRight(i); }}
                                            disabled={i === photos.length - 1}
                                            aria-label="Переместить вправо"
                                            style={{
                                                width: '28px',
                                                height: '28px',
                                                borderRadius: '50%',
                                                background: i === photos.length - 1 ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.6)',
                                                border: 'none',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: i === photos.length - 1 ? 'default' : 'pointer',
                                                opacity: i === photos.length - 1 ? 0.4 : 1,
                                            }}
                                        >
                                            <ChevronRight size={16} color="#fff" />
                                        </button>
                                    </div>
                                )}
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
                            <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Добавить фото</span>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoUpload}
                                style={{ position: 'absolute', opacity: 0, inset: 0, cursor: 'pointer' }}
                            />
                        </div>

                    </div>
                    <p style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                        Используйте стрелки для изменения порядка фото
                    </p>
                </section>

                {/* Form Fields - iOS Style Grouped */}
                <div style={{ padding: '0 16px 30px' }}>

                    <h3 style={{ textTransform: 'uppercase', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', paddingLeft: '4px' }}>
                        О вас
                    </h3>

                    <div style={{ background: 'var(--surface)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                        <div className="input-group" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
                            <label style={{ width: '100px', fontWeight: 500 }}>Имя</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '16px', outline: 'none' }}
                                placeholder="Ваше имя"
                            />
                        </div>

                        <div className="input-group" style={{ padding: '12px 16px', display: 'flex', gap: '10px' }}>
                            <label style={{ width: '100px', fontWeight: 500, paddingTop: '4px' }}>О себе</label>
                            <textarea
                                value={bio}
                                onChange={e => setBio(e.target.value)}
                                style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '16px', outline: 'none', resize: 'none', fontFamily: 'inherit' }}
                                rows={4}
                                placeholder="Расскажите о себе..."
                            />
                        </div>
                    </div>

                    <h3 style={{ textTransform: 'uppercase', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', marginTop: '24px', paddingLeft: '4px' }}>
                        Детали
                    </h3>

                    <div style={{ background: 'var(--surface)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                        <div className="input-group" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center' }}>
                            <label style={{ width: '100px', fontWeight: 500 }}>Пол</label>
                            <select
                                value={gender}
                                onChange={e => setGender(e.target.value)}
                                style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '16px', outline: 'none' }}
                            >
                                <option value="male">Мужской</option>
                                <option value="female">Женский</option>
                            </select>
                        </div>
                    </div>

                    <h3 style={{ textTransform: 'uppercase', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', marginTop: '24px', paddingLeft: '4px' }}>
                        Интересы
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
                            <span key={tag} style={{
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
                                placeholder="+ Добавить интерес"
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
                                        color: 'var(--primary)', fontWeight: 700,
                                        background: 'none', border: 'none', cursor: 'pointer',
                                    }}>
                                    +
                                </button>
                            )}
                        </div>
                    </div>

                    <h3 style={{ textTransform: 'uppercase', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', marginTop: '24px', paddingLeft: '4px' }}>
                        Настройки интерфейса
                    </h3>
                    <div style={{ background: 'var(--surface)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)', padding: '0 16px' }}>
                        <ToggleSwitch
                            label="Звуковые эффекты"
                            checked={uxPreferences.sounds_enabled}
                            onChange={(val) => updateUXPref('sounds_enabled', val)}
                        />
                        <div style={{ height: '1px', background: 'var(--border)' }} />
                        <ToggleSwitch
                            label="Вибрация"
                            checked={uxPreferences.haptic_enabled}
                            onChange={(val) => updateUXPref('haptic_enabled', val)}
                        />
                        <div style={{ height: '1px', background: 'var(--border)' }} />
                        <ToggleSwitch
                            label="Уменьшить анимацию"
                            checked={uxPreferences.reduced_motion}
                            onChange={(val) => updateUXPref('reduced_motion', val)}
                        />
                    </div>

                </div>

            </div>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
