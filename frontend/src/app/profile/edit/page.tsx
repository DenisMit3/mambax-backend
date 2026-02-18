/* eslint-disable @next/next/no-img-element */
"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Toast } from '@/components/ui/Toast';
import { ErrorState } from "@/components/ui/ErrorState";
import { useEditProfile } from "./useEditProfile";
import { PhotoGrid } from "./PhotoGrid";
import { X, Sparkles, User, Heart, Cigarette, Wine, Star as StarIcon, Brain, PawPrint, MapPin, Briefcase, GraduationCap, Ruler, Target, Search, Calendar } from "lucide-react";

export default function EditProfilePage() {
    const router = useRouter();
    const {
        isChecking, loading, error, saving, toast, setToast,
        name, setName, bio, setBio, gender, setGender,
        interests, setInterests, photos,
        newInterest, setNewInterest,
        uxPreferences, updateUXPref,
        loadProfile, handleSave, handlePhotoUpload,
        removePhoto, movePhotoLeft, movePhotoRight, addInterest
    } = useEditProfile();

    if (isChecking || loading) {
        return (
            <div className="flex items-center justify-center h-full bg-transparent">
                <div className="w-8 h-8 rounded-full border-2 border-[#ff4b91] border-t-transparent animate-spin" />
            </div>
        );
    }
    if (error) return <ErrorState onRetry={loadProfile} />;

    const INTEREST_OPTIONS = [
        'Кино', 'Музыка', 'Спорт', 'Путешествия', 'Кофе', 'Игры', 'Фотография',
        'Кулинария', 'Книги', 'Йога', 'Танцы', 'Искусство', 'Технологии', 'Природа',
        'Животные', 'Мода', 'Фитнес', 'Вечеринки',
    ];

    return (
        <div className="h-full overflow-y-auto scrollbar-hide bg-transparent pb-24">
            {/* Ambient Background */}
            <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-pink-900/20 via-slate-900/50 to-transparent pointer-events-none" />

            {/* Header */}
            <div className="sticky top-0 z-50 backdrop-blur-xl bg-black/60 border-b border-white/5">
                <div className="flex items-center justify-between px-4 h-14">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-1 text-slate-400 hover:text-white transition active:scale-95"
                    >
                        <ChevronLeft size={20} />
                        <span className="text-sm font-medium">Назад</span>
                    </button>
                    <h1 className="text-base font-bold text-white">Редактировать</h1>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#ff4b91] to-[#ff9e4a] text-white font-bold text-sm active:scale-95 transition disabled:opacity-50"
                    >
                        {saving ? "..." : "Готово"}
                    </button>
                </div>
            </div>

            <div className="px-4 pt-6 space-y-5 relative z-10">
                {/* Photos */}
                <PhotoGrid
                    photos={photos}
                    onRemove={removePhoto}
                    onMoveLeft={movePhotoLeft}
                    onMoveRight={movePhotoRight}
                    onUpload={handlePhotoUpload}
                />

                {/* Basic Info */}
                <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] backdrop-blur-sm p-5">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <User className="w-3.5 h-3.5" /> О вас
                    </h3>
                    <div className="space-y-3">
                        <div>
                            <label className="text-[11px] text-slate-500 mb-1 block">Имя</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Ваше имя"
                                autoComplete="name"
                                autoCapitalize="words"
                                className="w-full bg-white/[0.03] rounded-xl p-3 text-white text-sm outline-none border border-white/5 focus:border-[#ff4b91]/30 transition placeholder:text-slate-700"
                            />
                        </div>
                        <div>
                            <label className="text-[11px] text-slate-500 mb-1 block">Пол</label>
                            <select
                                value={gender}
                                onChange={e => setGender(e.target.value)}
                                className="w-full bg-white/[0.03] rounded-xl p-3 text-white text-sm outline-none border border-white/5 focus:border-[#ff4b91]/30 transition appearance-none"
                            >
                                <option value="male" className="bg-[#1a1a1e]">Мужской</option>
                                <option value="female" className="bg-[#1a1a1e]">Женский</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[11px] text-slate-500 mb-1 block">О себе</label>
                            <textarea
                                value={bio}
                                onChange={e => setBio(e.target.value)}
                                rows={3}
                                placeholder="Расскажите о себе..."
                                autoCapitalize="sentences"
                                maxLength={500}
                                className="w-full bg-white/[0.03] rounded-xl p-3 text-white text-sm outline-none border border-white/5 focus:border-[#ff4b91]/30 transition placeholder:text-slate-700 resize-none"
                            />
                            <div className="text-right text-[10px] text-slate-600 mt-1">{bio.length}/500</div>
                        </div>
                    </div>
                </div>

                {/* Interests */}
                <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] backdrop-blur-sm p-5">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5" /> Интересы
                    </h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                        {INTEREST_OPTIONS.map((tag) => (
                            <button
                                key={tag}
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 ${
                                    interests.includes(tag)
                                        ? 'bg-gradient-to-r from-[#ff4b91] to-[#ff9e4a] text-white shadow-lg shadow-[#ff4b91]/20'
                                        : 'bg-white/5 text-slate-400 hover:bg-white/10'
                                }`}
                                onClick={() => {
                                    if (interests.includes(tag)) {
                                        setInterests(interests.filter(t => t !== tag));
                                    } else {
                                        setInterests([...interests, tag]);
                                    }
                                }}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                    {/* Custom interests */}
                    {interests.filter(i => !INTEREST_OPTIONS.includes(i)).length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                            {interests.filter(i => !INTEREST_OPTIONS.includes(i)).map((tag) => (
                                <span
                                    key={tag}
                                    className="px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-[#ff4b91] to-[#ff9e4a] text-white flex items-center gap-1"
                                >
                                    {tag}
                                    <X className="w-3 h-3 cursor-pointer" onClick={() => setInterests(interests.filter(t => t !== tag))} />
                                </span>
                            ))}
                        </div>
                    )}
                    {/* Add custom */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newInterest}
                            onChange={e => setNewInterest(e.target.value)}
                            placeholder="+ Свой интерес"
                            autoComplete="off"
                            onKeyDown={e => e.key === 'Enter' && addInterest()}
                            className="flex-1 bg-white/[0.03] rounded-xl p-2.5 text-white text-sm outline-none border border-white/5 focus:border-[#ff4b91]/30 transition placeholder:text-slate-700"
                        />
                        {newInterest && (
                            <button
                                onClick={addInterest}
                                className="px-4 rounded-xl bg-[#ff4b91]/20 text-[#ff4b91] font-bold text-sm active:scale-95 transition"
                            >
                                +
                            </button>
                        )}
                    </div>
                </div>

                {/* UX Settings */}
                <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] backdrop-blur-sm p-5">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Heart className="w-3.5 h-3.5" /> Настройки интерфейса
                    </h3>
                    <div className="space-y-1">
                        <ToggleRow
                            label="Звуковые эффекты"
                            checked={uxPreferences.sounds_enabled}
                            onChange={(val) => updateUXPref('sounds_enabled', val)}
                        />
                        <div className="h-px bg-white/5" />
                        <ToggleRow
                            label="Вибрация"
                            checked={uxPreferences.haptic_enabled}
                            onChange={(val) => updateUXPref('haptic_enabled', val)}
                        />
                        <div className="h-px bg-white/5" />
                        <ToggleRow
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

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <div className="flex items-center justify-between py-3">
            <span className="text-sm text-slate-300 font-medium">{label}</span>
            <button
                role="switch"
                aria-checked={checked}
                onClick={() => onChange(!checked)}
                className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-[#ff4b91]' : 'bg-white/10'}`}
            >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
        </div>
    );
}
