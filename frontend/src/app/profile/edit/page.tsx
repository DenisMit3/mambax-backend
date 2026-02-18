/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { ToggleSwitch } from "@/components/ui/ToggleSwitch";
import { Toast } from '@/components/ui/Toast';
import { ErrorState } from "@/components/ui/ErrorState";
import { useEditProfile } from "./useEditProfile";
import { PhotoGrid } from "./PhotoGrid";

export default function EditProfilePage() {
    const {
        isChecking, loading, error, saving, toast, setToast,
        name, setName, bio, setBio, gender, setGender,
        interests, setInterests, photos,
        newInterest, setNewInterest,
        uxPreferences, updateUXPref,
        loadProfile, handleSave, handlePhotoUpload,
        removePhoto, movePhotoLeft, movePhotoRight, addInterest
    } = useEditProfile();

    if (isChecking || loading) return <div className="flex-center h-full">Загрузка...</div>;
    if (error) return <ErrorState onRetry={loadProfile} />;

    return (
        <div style={{ minHeight: '100%', background: 'var(--background)' }}>
            {/* Header */}
            <header style={{
                position: 'sticky', top: 0, zIndex: 50,
                background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)',
                borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', height: '56px'
            }}>
                <Link href="/profile" style={{ display: 'flex', alignItems: 'center', color: 'var(--primary)' }}>
                    <span style={{ fontSize: '16px', fontWeight: 500 }}>Отмена</span>
                </Link>
                <h1 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--foreground)' }}>Редактировать профиль</h1>
                <button onClick={handleSave} disabled={saving}
                    style={{ fontSize: '16px', fontWeight: 600, color: 'var(--primary)' }}>
                    {saving ? "..." : "Готово"}
                </button>
            </header>

            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                <PhotoGrid
                    photos={photos}
                    onRemove={removePhoto}
                    onMoveLeft={movePhotoLeft}
                    onMoveRight={movePhotoRight}
                    onUpload={handlePhotoUpload}
                />

                <div style={{ padding: '0 16px 30px' }}>
                    <h3 style={{ textTransform: 'uppercase', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', paddingLeft: '4px' }}>
                        О вас
                    </h3>
                    <div style={{ background: 'var(--surface)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                        <div className="input-group" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
                            <label style={{ width: '100px', fontWeight: 500 }}>Имя</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)}
                                style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '16px', outline: 'none' }}
                                placeholder="Ваше имя" autoComplete="name" autoCapitalize="words" enterKeyHint="next" />
                        </div>
                        <div className="input-group" style={{ padding: '12px 16px', display: 'flex', gap: '10px' }}>
                            <label style={{ width: '100px', fontWeight: 500, paddingTop: '4px' }}>О себе</label>
                            <textarea value={bio} onChange={e => setBio(e.target.value)}
                                style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '16px', outline: 'none', resize: 'none', fontFamily: 'inherit' }}
                                rows={4} placeholder="Расскажите о себе..." autoCapitalize="sentences" />
                        </div>
                    </div>

                    <h3 style={{ textTransform: 'uppercase', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', marginTop: '24px', paddingLeft: '4px' }}>
                        Детали
                    </h3>
                    <div style={{ background: 'var(--surface)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                        <div className="input-group" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center' }}>
                            <label style={{ width: '100px', fontWeight: 500 }}>Пол</label>
                            <select value={gender} onChange={e => setGender(e.target.value)}
                                style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '16px', outline: 'none' }}>
                                <option value="male">Мужской</option>
                                <option value="female">Женский</option>
                            </select>
                        </div>
                    </div>

                    <h3 style={{ textTransform: 'uppercase', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', marginTop: '24px', paddingLeft: '4px' }}>
                        Интересы
                    </h3>
                    <div style={{
                        background: 'var(--surface)', borderRadius: '12px', padding: '16px',
                        border: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: '8px'
                    }}>
                        {interests.map((tag) => (
                            <span key={tag} style={{
                                background: 'rgba(255, 90, 39, 0.1)', color: 'var(--primary)',
                                padding: '6px 12px', borderRadius: '100px', fontSize: '14px', fontWeight: 500,
                                display: 'flex', alignItems: 'center', gap: '6px'
                            }}>
                                {tag}
                                <X size={14} style={{ cursor: 'pointer' }} onClick={() => setInterests(interests.filter(t => t !== tag))} />
                            </span>
                        ))}
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <input type="text" value={newInterest} onChange={e => setNewInterest(e.target.value)}
                                placeholder="+ Добавить интерес" autoComplete="off" autoCapitalize="off" enterKeyHint="done"
                                onKeyDown={e => e.key === 'Enter' && addInterest()}
                                style={{
                                    background: 'transparent', border: '1px dashed var(--text-muted)',
                                    borderRadius: '100px', padding: '6px 12px', fontSize: '14px', outline: 'none', width: '120px'
                                }} />
                            {newInterest && (
                                <button onClick={addInterest} style={{
                                    position: 'absolute', right: '4px', color: 'var(--primary)',
                                    fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer',
                                }}>+</button>
                            )}
                        </div>
                    </div>

                    <h3 style={{ textTransform: 'uppercase', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', marginTop: '24px', paddingLeft: '4px' }}>
                        Настройки интерфейса
                    </h3>
                    <div style={{ background: 'var(--surface)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)', padding: '0 16px' }}>
                        <ToggleSwitch label="Звуковые эффекты" checked={uxPreferences.sounds_enabled}
                            onChange={(val) => updateUXPref('sounds_enabled', val)} />
                        <div style={{ height: '1px', background: 'var(--border)' }} />
                        <ToggleSwitch label="Вибрация" checked={uxPreferences.haptic_enabled}
                            onChange={(val) => updateUXPref('haptic_enabled', val)} />
                        <div style={{ height: '1px', background: 'var(--border)' }} />
                        <ToggleSwitch label="Уменьшить анимацию" checked={uxPreferences.reduced_motion}
                            onChange={(val) => updateUXPref('reduced_motion', val)} />
                    </div>
                </div>
            </div>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
