'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Camera, Plus, Trash2, Shield, EyeOff, MapPinOff, Calendar, Sparkles, Wand2, Check, Volume2, Vibrate, MonitorOff } from 'lucide-react';

import { useTelegram } from '@/lib/telegram';
import { useUser } from '@/context/UserContext';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { GlassCard } from '@/components/ui/GlassCard';

interface PhotoSlot {
    id: string;
    url: string | null;
}

interface ProfileMasterEditorProps {
    initialData?: any;
    onSave?: (data: any) => void;
}

export const ProfileMasterEditor = ({ initialData, onSave }: ProfileMasterEditorProps) => {
    const { hapticFeedback } = useTelegram();
    const [photos, setPhotos] = useState<PhotoSlot[]>([
        { id: '1', url: null },
        { id: '2', url: null },
        { id: '3', url: null },
        { id: '4', url: null },
        { id: '5', url: null },
        { id: '6', url: null },
    ]);

    const [bio, setBio] = useState('');
    const [incognito, setIncognito] = useState(false);
    const [hideAge, setHideAge] = useState(false);
    const [hideDistance, setHideDistance] = useState(false);
    const { user, updateUXPreferences } = useUser();
    const [uxPrefs, setUxPrefs] = useState({
        sounds_enabled: true,
        haptic_enabled: true,
        reduced_motion: false
    });

    useEffect(() => {
        if (user?.ux_preferences) {
            setUxPrefs(user.ux_preferences);
        }
    }, [user]);

    const handleUXToggle = (key: keyof typeof uxPrefs) => {
        const newVal = !uxPrefs[key];
        setUxPrefs(prev => ({ ...prev, [key]: newVal }));
        updateUXPreferences({ [key]: newVal });
        hapticFeedback.selection();
    };

    const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

    useEffect(() => {
        if (initialData) {
            setBio(initialData.bio || '');
            if (initialData.photos) {
                const newPhotos = [...photos];
                initialData.photos.forEach((url: string, idx: number) => {
                    if (idx < 6) newPhotos[idx].url = url;
                });
                setPhotos(newPhotos);
            }
            setSelectedInterests(initialData.interests || []);
            setIncognito(initialData.is_incognito || false);
            setHideAge(initialData.hide_age || false);
            setHideDistance(initialData.hide_distance || false);
        }
    }, [initialData]);

    const handleSave = () => {
        if (onSave) {
            onSave({
                bio,
                photos: photos.filter(p => p.url).map(p => p.url),
                interests: selectedInterests,
                is_incognito: incognito,
                hide_age: hideAge,
                hide_distance: hideDistance
            });
            hapticFeedback.notificationOccurred('success');
        }
    };

    const toggleInterest = (interest: string) => {
        hapticFeedback.selection();
        if (selectedInterests.includes(interest)) {
            setSelectedInterests(selectedInterests.filter(i => i !== interest));
        } else {
            setSelectedInterests([...selectedInterests, interest]);
        }
    };

    return (
        <div className="p-6 md:p-8 space-y-8 pb-32">
            {/* Header */}
            <motion.div
                className="flex items-center justify-between"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
            >
                <div>
                    <h1 className="text-4xl font-black text-white mb-2 uppercase tracking-tighter bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent italic">
                        Профиль
                    </h1>
                    <p className="text-primary-red text-[11px] font-mono uppercase tracking-[0.4em] font-bold">
                        Настройки Neural Interface
                    </p>
                </div>
                <AnimatedButton
                    variant="primary"
                    className="w-12 h-12 rounded-full flex items-center justify-center p-0"
                    onClick={handleSave}
                >
                    <Check className="w-5 h-5 text-white" />
                </AnimatedButton>
            </motion.div>

            {/* Photo Grid 3x2 */}
            <div className="grid grid-cols-3 gap-4 md:gap-6">
                {photos.map((slot, index) => (
                    <motion.div
                        key={slot.id}
                        className={`aspect-[3/4] relative rounded-[2.5rem] overflow-hidden cursor-pointer group border border-white/10 shadow-lg transition-transform hover:scale-[1.02] active:scale-95 ${index === 0 ? 'col-span-2 row-span-2' : ''
                            }`}
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: index * 0.05 }}
                    >
                        {slot.url ? (
                            <>
                                <img src={slot.url} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-[2px]">
                                    <button
                                        className="bg-primary-red w-12 h-12 rounded-full flex items-center justify-center shadow-lg shadow-primary-red/40 transform -translate-y-4 group-hover:translate-y-0 transition-transform duration-300"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            hapticFeedback.impactOccurred('medium');
                                            const newPhotos = [...photos];
                                            newPhotos[index].url = null;
                                            setPhotos(newPhotos);
                                        }}
                                    >
                                        <Trash2 className="w-5 h-5 text-white" />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="w-full h-full bg-white/[0.03] border-2 border-dashed border-white/10 flex items-center justify-center hover:bg-white/[0.08] hover:border-white/20 transition-all">
                                <Plus className="w-8 h-8 text-white/20 group-hover:text-white/40" />
                            </div>
                        )}
                        {/* Glass edge highlight */}
                        <div className="absolute inset-0 border border-white/10 rounded-[2.5rem] pointer-events-none" />
                    </motion.div>
                ))}
            </div>

            {/* Bio Section */}
            <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white text-sm font-black uppercase tracking-widest flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-primary-red" />
                        <span>Обо мне</span>
                    </h3>
                    <button
                        className="text-[10px] font-mono text-primary-red uppercase tracking-widest flex items-center space-x-1 hover:opacity-70 transition-opacity disabled:opacity-30"
                        onClick={() => {
                            if (!bio.trim()) {
                                hapticFeedback.notificationOccurred('warning');
                                return;
                            }
                            hapticFeedback.impactOccurred('medium');
                            // Simple AI-like optimization: add emojis and improve structure
                            const optimized = `✨ ${bio.trim()}${bio.includes('!') ? '' : ' 💫'}`;
                            setBio(optimized);
                            hapticFeedback.notificationOccurred('success');
                        }}
                        disabled={!bio.trim()}
                    >
                        <Wand2 className="w-3.5 h-3.5" />
                        <span>Улучшить</span>
                    </button>
                </div>
                <textarea
                    className="w-full bg-white/[0.02] rounded-2xl p-4 text-white text-sm outline-none border border-white/5 focus:border-primary-red/30 transition-all placeholder:text-gray-700"
                    rows={4}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Расскажи о себе..."
                />
            </GlassCard>

            {/* Interests Section */}
            <GlassCard className="p-6">
                <h3 className="text-white text-sm font-black uppercase tracking-widest mb-4 flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-primary-red opacity-60" />
                    <span>Интересы</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                    {['Кино', 'Музыка', 'Спорт', 'Техно', 'NFT', 'Космос', 'Кофе', 'Игры', 'Вечеринки', 'Еда'].map((interest) => (
                        <button
                            key={interest}
                            className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${selectedInterests.includes(interest)
                                ? 'bg-primary-red text-white shadow-[0_5px_15px_rgba(255,59,48,0.3)]'
                                : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-400'
                                }`}
                            onClick={() => toggleInterest(interest)}
                        >
                            {interest}
                        </button>
                    ))}
                </div>
            </GlassCard>

            {/* VIP Settings */}
            <div className="space-y-6">
                <h3 className="text-white text-sm font-black uppercase tracking-widest mb-4 flex items-center space-x-2">
                    <Shield className="w-5 h-5 text-primary-red opacity-80" />
                    <span>Приватность</span>
                </h3>

                <SettingsToggle
                    icon={EyeOff}
                    title="Режим Инкогнито"
                    desc="Видим только тем, кого лайкнул"
                    active={incognito}
                    onToggle={() => { setIncognito(!incognito); hapticFeedback.selection(); }}
                />

                <SettingsToggle
                    icon={Calendar}
                    title="Скрыть возраст"
                    desc="Не показывать возраст в анкете"
                    active={hideAge}
                    onToggle={() => { setHideAge(!hideAge); hapticFeedback.selection(); }}
                />

                <SettingsToggle
                    icon={MapPinOff}
                    title="Скрыть расстояние"
                    desc="Не показывать дистанцию"
                    active={hideDistance}
                    onToggle={() => { setHideDistance(!hideDistance); hapticFeedback.selection(); }}
                />
            </div>

            {/* UX Settings */}
            <div className="space-y-6">
                <h3 className="text-white text-sm font-black uppercase tracking-widest mb-4 flex items-center space-x-2">
                    <Sparkles className="w-5 h-5 text-primary-red opacity-80" />
                    <span>Интерфейс</span>
                </h3>

                <SettingsToggle
                    icon={Volume2}
                    title="Звуки"
                    desc="Звуковые эффекты в приложении"
                    active={uxPrefs.sounds_enabled}
                    onToggle={() => handleUXToggle('sounds_enabled')}
                />

                <SettingsToggle
                    icon={Vibrate}
                    title="Вибрация"
                    desc="Тактильный отклик при действиях"
                    active={uxPrefs.haptic_enabled}
                    onToggle={() => handleUXToggle('haptic_enabled')}
                />

                <SettingsToggle
                    icon={MonitorOff} // Or a better icon for motion
                    title="Меньше анимаций"
                    desc="Отключить сложные переходы"
                    active={uxPrefs.reduced_motion}
                    onToggle={() => handleUXToggle('reduced_motion')}
                />
            </div>
        </div>
    );
};

const SettingsToggle = ({ icon: Icon, title, desc, active, onToggle }: any) => (
    <GlassCard
        className="p-4 flex items-center justify-between cursor-pointer group hover:bg-white/[0.05] transition-colors"
        onClick={onToggle}
    >
        <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-2xl bg-white/5 ${active ? 'text-primary-red' : 'text-gray-600'}`}>
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <h4 className="text-white font-bold text-sm tracking-tight">{title}</h4>
                <p className="text-gray-600 text-[9px] uppercase tracking-tighter leading-tight">{desc}</p>
            </div>
        </div>

        <div className={`w-10 h-5 rounded-full p-1 transition-all duration-300 relative ${active ? 'bg-primary-red' : 'bg-white/10'}`}>
            <motion.div
                className="w-3 h-3 bg-white rounded-full shadow-lg"
                animate={{ x: active ? 20 : 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
        </div>
    </GlassCard>
);
