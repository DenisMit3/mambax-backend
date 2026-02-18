'use client';

import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { Camera, Plus, Trash2, X, ChevronLeft, ChevronRight, Sparkles, User, Briefcase, GraduationCap, Ruler, MapPin, Heart, Cigarette, Wine, Star as StarIcon, Brain, PawPrint, Calendar, Target, Search } from 'lucide-react';

import { useTelegram } from '@/lib/telegram';
import { authService } from '@/services/api';

const PHOTO_BASE = '/api_proxy';

function resolvePhotoUrl(url: string | undefined): string {
    if (!url) return '';
    if (url.startsWith('/api/photos/')) return url;
    if (url.startsWith('/static/') || url.startsWith('/uploads/')) return `${PHOTO_BASE}${url}`;
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    return url;
}

interface ProfileFormData {
    name?: string;
    age?: number;
    gender?: string;
    bio?: string;
    photos?: string[];
    interests?: string[];
    city?: string;
    job?: string;
    education?: string;
    height?: number;
    children?: string;
    smoking?: string;
    drinking?: string;
    zodiac?: string;
    personality_type?: string;
    love_language?: string;
    pets?: string;
    ideal_date?: string;
    intent?: string;
    looking_for?: string;
    [key: string]: unknown;
}

interface ProfileMasterEditorProps {
    initialData?: ProfileFormData;
    onSave?: (data: ProfileFormData) => void;
    onCancel?: () => void;
}

const INTEREST_OPTIONS = [
    'Кино', 'Музыка', 'Спорт', 'Путешествия', 'Кофе', 'Игры', 'Фотография',
    'Кулинария', 'Книги', 'Йога', 'Танцы', 'Искусство', 'Технологии', 'Природа',
    'Животные', 'Мода', 'Фитнес', 'Вечеринки',
];

export const ProfileMasterEditor = ({ initialData, onSave, onCancel }: ProfileMasterEditorProps) => {
    const { hapticFeedback } = useTelegram();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form state
    const [photos, setPhotos] = useState<string[]>([]);
    const [name, setName] = useState('');
    const [age, setAge] = useState<number | ''>('');
    const [gender, setGender] = useState('male');
    const [bio, setBio] = useState('');
    const [city, setCity] = useState('');
    const [job, setJob] = useState('');
    const [education, setEducation] = useState('');
    const [height, setHeight] = useState<number | ''>('');
    const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
    const [customInterest, setCustomInterest] = useState('');

    // Additional fields from onboarding
    const [children, setChildren] = useState('');
    const [smoking, setSmoking] = useState('');
    const [drinking, setDrinking] = useState('');
    const [zodiac, setZodiac] = useState('');
    const [personalityType, setPersonalityType] = useState('');
    const [loveLanguage, setLoveLanguage] = useState('');
    const [pets, setPets] = useState('');
    const [intent, setIntent] = useState('');
    const [lookingFor, setLookingFor] = useState('');

    // Load initial data
    useEffect(() => {
        if (initialData) {
            setPhotos(initialData.photos || []);
            setName(initialData.name || '');
            setAge(initialData.age || '');
            setGender(initialData.gender || 'male');
            setBio(initialData.bio || '');
            setCity((initialData.city as string) || '');
            setJob((initialData.job as string) || (initialData.work as string) || '');
            setEducation((initialData.education as string) || '');
            setHeight((initialData.height as number) || '');
            setSelectedInterests((initialData.interests || []) as string[]);
            setChildren((initialData.children as string) || '');
            setSmoking((initialData.smoking as string) || '');
            setDrinking((initialData.drinking as string) || '');
            setZodiac((initialData.zodiac as string) || '');
            setPersonalityType((initialData.personality_type as string) || '');
            setLoveLanguage((initialData.love_language as string) || '');
            setPets((initialData.pets as string) || '');
            setIntent((initialData.intent as string) || '');
            setLookingFor((initialData.looking_for as string) || '');
        }
    }, [initialData]);

    // Photo upload
    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        setUploadingPhoto(true);
        try {
            const res = await authService.uploadPhoto(file);
            if (res.url) {
                setPhotos(prev => [...prev, res.url]);
                hapticFeedback.notificationOccurred('success');
            }
        } catch (err) {
            console.error('[ProfileEditor] Photo upload failed:', err);
            hapticFeedback.notificationOccurred('error');
        } finally {
            setUploadingPhoto(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const removePhoto = (index: number) => {
        hapticFeedback.impactOccurred('medium');
        setPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const movePhoto = (index: number, direction: -1 | 1) => {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= photos.length) return;
        hapticFeedback.selection();
        setPhotos(prev => {
            const next = [...prev];
            [next[index], next[newIndex]] = [next[newIndex], next[index]];
            return next;
        });
    };

    const toggleInterest = (interest: string) => {
        hapticFeedback.selection();
        setSelectedInterests(prev =>
            prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
        );
    };

    const addCustomInterest = () => {
        const trimmed = customInterest.trim();
        if (!trimmed || selectedInterests.includes(trimmed)) return;
        hapticFeedback.selection();
        setSelectedInterests(prev => [...prev, trimmed]);
        setCustomInterest('');
    };

    const handleSave = async () => {
        if (!onSave) return;
        setSaving(true);
        hapticFeedback.impactOccurred('medium');
        try {
            await onSave({
                name, age: age || undefined, gender, bio, photos,
                interests: selectedInterests,
                city, job, education, height: height || undefined,
                children, smoking, drinking, zodiac,
                personality_type: personalityType,
                love_language: loveLanguage,
                pets, intent, looking_for: lookingFor,
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6 pb-32">
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
            />

            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-black text-white">Редактировать</h1>
                <div className="flex items-center gap-3">
                    {onCancel && (
                        <button
                            onClick={onCancel}
                            className="text-sm text-slate-400 hover:text-white transition"
                        >
                            Отмена
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#ff4b91] to-[#ff9e4a] text-white font-bold text-sm shadow-lg active:scale-95 transition disabled:opacity-50"
                    >
                        {saving ? 'Сохранение...' : 'Сохранить'}
                    </button>
                </div>
            </div>

            {/* Photo Grid */}
            <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Camera className="w-3.5 h-3.5" /> Фото ({photos.length}/9)
                </h3>
                <div className="grid grid-cols-3 gap-2.5">
                    {photos.map((url, index) => (
                        <motion.div
                            key={`photo-${index}`}
                            className={`relative rounded-2xl overflow-hidden border border-white/10 ${index === 0 ? 'col-span-2 row-span-2' : ''}`}
                            style={{ aspectRatio: index === 0 ? '1' : '2/3' }}
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: index * 0.03 }}
                        >
                            <img
                                src={resolvePhotoUrl(url)}
                                alt={`Фото ${index + 1}`}
                                className="w-full h-full object-cover"
                            />
                            {/* Photo number */}
                            <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-[10px] font-bold text-white">
                                {index + 1}
                            </div>
                            {/* Delete button */}
                            <button
                                onClick={() => removePhoto(index)}
                                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-red-500/80 transition active:scale-90"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                            {/* Move buttons */}
                            {photos.length > 1 && (
                                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                                    <button
                                        onClick={() => movePhoto(index, -1)}
                                        disabled={index === 0}
                                        className="w-7 h-7 rounded-full bg-black/60 flex items-center justify-center disabled:opacity-30 active:scale-90"
                                    >
                                        <ChevronLeft className="w-3.5 h-3.5 text-white" />
                                    </button>
                                    <button
                                        onClick={() => movePhoto(index, 1)}
                                        disabled={index === photos.length - 1}
                                        className="w-7 h-7 rounded-full bg-black/60 flex items-center justify-center disabled:opacity-30 active:scale-90"
                                    >
                                        <ChevronRight className="w-3.5 h-3.5 text-white" />
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    ))}
                    {/* Add photo button */}
                    {photos.length < 9 && (
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingPhoto}
                            className={`rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 hover:border-[#ff4b91]/40 hover:bg-white/[0.03] transition active:scale-95 ${photos.length === 0 ? 'col-span-2 row-span-2' : ''}`}
                            style={{ aspectRatio: photos.length === 0 ? '1' : '2/3' }}
                        >
                            {uploadingPhoto ? (
                                <div className="w-6 h-6 rounded-full border-2 border-[#ff4b91] border-t-transparent animate-spin" />
                            ) : (
                                <>
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#ff4b91]/20 to-[#ff9e4a]/20 flex items-center justify-center">
                                        <Plus className="w-5 h-5 text-[#ff4b91]" />
                                    </div>
                                    <span className="text-[11px] text-slate-500 font-medium">Добавить</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* Basic Info */}
            <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] backdrop-blur-sm p-5">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <User className="w-3.5 h-3.5" /> Основное
                </h3>
                <div className="space-y-3">
                    <InputField label="Имя" value={name} onChange={setName} placeholder="Ваше имя" />
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <label className="text-[11px] text-slate-500 mb-1 block">Возраст</label>
                            <input
                                type="number"
                                className="w-full bg-white/[0.03] rounded-xl p-3 text-white text-sm outline-none border border-white/5 focus:border-[#ff4b91]/30 transition placeholder:text-slate-700"
                                value={age}
                                onChange={(e) => setAge(e.target.value ? Number(e.target.value) : '')}
                                placeholder="25"
                                min={18} max={99}
                            />
                        </div>
                        <div className="flex-1">
                            <label className="text-[11px] text-slate-500 mb-1 block">Пол</label>
                            <select
                                className="w-full bg-white/[0.03] rounded-xl p-3 text-white text-sm outline-none border border-white/5 focus:border-[#ff4b91]/30 transition appearance-none"
                                value={gender}
                                onChange={(e) => setGender(e.target.value)}
                            >
                                <option value="male" className="bg-[#1a1a1e]">Мужской</option>
                                <option value="female" className="bg-[#1a1a1e]">Женский</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="text-[11px] text-slate-500 mb-1 block">О себе</label>
                        <textarea
                            className="w-full bg-white/[0.03] rounded-xl p-3 text-white text-sm outline-none border border-white/5 focus:border-[#ff4b91]/30 transition placeholder:text-slate-700 resize-none"
                            rows={3}
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            placeholder="Расскажите о себе..."
                            maxLength={500}
                        />
                        <div className="text-right text-[10px] text-slate-600 mt-1">{bio.length}/500</div>
                    </div>
                </div>
            </div>

            {/* Details */}
            <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] backdrop-blur-sm p-5">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5" /> Подробности
                </h3>
                <div className="space-y-3">
                    <InputField label="Город" value={city} onChange={setCity} placeholder="Москва" icon={<MapPin className="w-3.5 h-3.5" />} />
                    <InputField label="Работа" value={job} onChange={setJob} placeholder="Кем работаете" icon={<Briefcase className="w-3.5 h-3.5" />} />
                    <InputField label="Образование" value={education} onChange={setEducation} placeholder="Где учились" icon={<GraduationCap className="w-3.5 h-3.5" />} />
                    <div>
                        <label className="text-[11px] text-slate-500 mb-1 block flex items-center gap-1">
                            <Ruler className="w-3.5 h-3.5" /> Рост (см)
                        </label>
                        <input
                            type="number"
                            className="w-full bg-white/[0.03] rounded-xl p-3 text-white text-sm outline-none border border-white/5 focus:border-[#ff4b91]/30 transition placeholder:text-slate-700"
                            value={height}
                            onChange={(e) => setHeight(e.target.value ? Number(e.target.value) : '')}
                            placeholder="170"
                            min={100} max={250}
                        />
                    </div>
                </div>
            </div>

            {/* Lifestyle */}
            <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] backdrop-blur-sm p-5">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Heart className="w-3.5 h-3.5" /> Стиль жизни
                </h3>
                <div className="space-y-3">
                    <SelectField label="Дети" value={children} onChange={setChildren} icon={<User className="w-3.5 h-3.5" />}
                        options={['', 'Нет и не планирую', 'Хочу в будущем', 'Есть дети']} />
                    <SelectField label="Курение" value={smoking} onChange={setSmoking} icon={<Cigarette className="w-3.5 h-3.5" />}
                        options={['', 'Не курю', 'Иногда', 'Курю']} />
                    <SelectField label="Алкоголь" value={drinking} onChange={setDrinking} icon={<Wine className="w-3.5 h-3.5" />}
                        options={['', 'Не пью', 'По праздникам', 'Иногда', 'Регулярно']} />
                    <SelectField label="Знак зодиака" value={zodiac} onChange={setZodiac} icon={<StarIcon className="w-3.5 h-3.5" />}
                        options={['', 'Овен', 'Телец', 'Близнецы', 'Рак', 'Лев', 'Дева', 'Весы', 'Скорпион', 'Стрелец', 'Козерог', 'Водолей', 'Рыбы']} />
                    <InputField label="Тип личности" value={personalityType} onChange={setPersonalityType} placeholder="INTJ, ENFP..." icon={<Brain className="w-3.5 h-3.5" />} />
                    <InputField label="Язык любви" value={loveLanguage} onChange={setLoveLanguage} placeholder="Прикосновения, слова..." icon={<Heart className="w-3.5 h-3.5" />} />
                    <InputField label="Питомцы" value={pets} onChange={setPets} placeholder="Кот, собака..." icon={<PawPrint className="w-3.5 h-3.5" />} />
                </div>
            </div>

            {/* Dating Preferences */}
            <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] backdrop-blur-sm p-5">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Target className="w-3.5 h-3.5" /> Цели знакомства
                </h3>
                <div className="space-y-3">
                    <SelectField label="Ищу" value={intent} onChange={setIntent} icon={<Search className="w-3.5 h-3.5" />}
                        options={['', 'Серьезные отношения', 'Дружба', 'Общение', 'Свидания', 'Не определился']} />
                    <InputField label="Идеальное свидание" value={(initialData?.ideal_date as string) || ''} onChange={() => {}} placeholder="Опишите..." icon={<Calendar className="w-3.5 h-3.5" />} />
                    <InputField label="Кого ищу" value={lookingFor} onChange={setLookingFor} placeholder="Опишите..." icon={<Heart className="w-3.5 h-3.5" />} />
                </div>
            </div>

            {/* Interests */}
            <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] backdrop-blur-sm p-5">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5" /> Интересы
                </h3>
                <div className="flex flex-wrap gap-2 mb-3">
                    {INTEREST_OPTIONS.map((interest) => (
                        <button
                            key={interest}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 ${
                                selectedInterests.includes(interest)
                                    ? 'bg-gradient-to-r from-[#ff4b91] to-[#ff9e4a] text-white shadow-lg shadow-[#ff4b91]/20'
                                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                            }`}
                            onClick={() => toggleInterest(interest)}
                        >
                            {interest}
                        </button>
                    ))}
                </div>
                {/* Custom interests */}
                {selectedInterests.filter(i => !INTEREST_OPTIONS.includes(i)).length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                        {selectedInterests.filter(i => !INTEREST_OPTIONS.includes(i)).map((interest) => (
                            <span
                                key={interest}
                                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-[#ff4b91] to-[#ff9e4a] text-white flex items-center gap-1"
                            >
                                {interest}
                                <X className="w-3 h-3 cursor-pointer" onClick={() => toggleInterest(interest)} />
                            </span>
                        ))}
                    </div>
                )}
                {/* Add custom interest */}
                <div className="flex gap-2">
                    <input
                        type="text"
                        className="flex-1 bg-white/[0.03] rounded-xl p-2.5 text-white text-sm outline-none border border-white/5 focus:border-[#ff4b91]/30 transition placeholder:text-slate-700"
                        value={customInterest}
                        onChange={(e) => setCustomInterest(e.target.value)}
                        placeholder="+ Свой интерес"
                        onKeyDown={(e) => e.key === 'Enter' && addCustomInterest()}
                    />
                    {customInterest && (
                        <button
                            onClick={addCustomInterest}
                            className="px-4 rounded-xl bg-[#ff4b91]/20 text-[#ff4b91] font-bold text-sm active:scale-95 transition"
                        >
                            +
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// Reusable input field
function InputField({ label, value, onChange, placeholder, icon }: {
    label: string; value: string; onChange: (v: string) => void; placeholder?: string; icon?: React.ReactNode;
}) {
    return (
        <div>
            <label className="text-[11px] text-slate-500 mb-1 block flex items-center gap-1">
                {icon} {label}
            </label>
            <input
                type="text"
                className="w-full bg-white/[0.03] rounded-xl p-3 text-white text-sm outline-none border border-white/5 focus:border-[#ff4b91]/30 transition placeholder:text-slate-700"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
            />
        </div>
    );
}

// Reusable select field
function SelectField({ label, value, onChange, options, icon }: {
    label: string; value: string; onChange: (v: string) => void; options: string[]; icon?: React.ReactNode;
}) {
    return (
        <div>
            <label className="text-[11px] text-slate-500 mb-1 block flex items-center gap-1">
                {icon} {label}
            </label>
            <select
                className="w-full bg-white/[0.03] rounded-xl p-3 text-white text-sm outline-none border border-white/5 focus:border-[#ff4b91]/30 transition appearance-none"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            >
                {options.map((opt) => (
                    <option key={opt} value={opt} className="bg-[#1a1a1e]">
                        {opt || 'Не указано'}
                    </option>
                ))}
            </select>
        </div>
    );
}
