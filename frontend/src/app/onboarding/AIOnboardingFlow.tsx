import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Send, Check, Loader2, Sparkles, ArrowRight, Edit2, Ruler, Baby, Cigarette, Wine, BookOpen, Briefcase, Star, Heart, X, MessageCircle, Music, Coffee, Moon } from 'lucide-react';
import { useTelegram } from '@/lib/telegram';
import { authService } from '@/services/api';

// --- Interfaces ---
interface Message {
    id: string;
    text: string;
    isAI: boolean;
    type?: 'text' | 'number' | 'image' | 'options' | 'photo_upload';
    options?: string[];
    content?: string;
    multiSelect?: boolean;
    layoutType?: 'chip' | 'card'; // New property for visual refresh
}

interface PhotoData {
    file: File;
    preview: string; // Object URL for display
}

interface UserData {
    name: string;
    gender: 'male' | 'female';
    age: number;
    interests: string[];
    bio: string;
    photos: PhotoData[];  // FIX (MEM): Store File + preview URL instead of base64
    details: Record<string, string>;
}

// --- FLOW STEPS ---
const FLOW_STEPS = [
    { id: 'name', label: "Имя", q: "Привет! 👋 Я YouMe AI. Как тебя зовут?", type: 'text' },
    { id: 'gender', label: "Пол", q: "Приятно! Кто ты?", type: 'options', options: ["Мужчина", "Женщина"], multiSelect: false, layoutType: 'card' },
    { id: 'age', label: "Возраст", q: "Сколько тебе лет? (Это останется между нами... и мэтчами 😉)", type: 'number' },
    { id: 'city', label: "Город", q: "В каком ты городе сейчас?", type: 'text' },
    { id: 'intent', label: "Цель", q: "Что ищем? (Можно выбрать несколько) ❤️‍🔥", type: 'options', options: ["Отношения", "Свидания", "Флирт", "Дружба", "Пока смотрю"], multiSelect: true, layoutType: 'card' },
    { id: 'education', label: "Образование", q: "Образование? 🎓", type: 'options', options: ["Высшее", "Студент", "Среднее", "PhD"], multiSelect: false },
    { id: 'job', label: "Работа", q: "Кем работаешь? 💼", type: 'text' },
    { id: 'height', label: "Рост", q: "Рост? (в см. Только цифры)", type: 'number' },
    { id: 'children_clean', label: "Дети", q: "Дети? 👶", type: 'options', options: ["Есть", "Нет", "Хочу", "Чайлдфри"], multiSelect: false },
    { id: 'smoking', label: "Курение", q: "Куришь? 🚬", type: 'options', options: ["Да", "Нет", "Иногда", "Бросаю", "Вейп"], multiSelect: true },
    { id: 'alcohol', label: "Алкоголь", q: "Алкоголь? 🍷", type: 'options', options: ["Нет", "Редко", "Иногда", "Люблю"], multiSelect: false },
    { id: 'zodiac', label: "Знак Зодиака", q: "Знак зодиака? ✨", type: 'options', options: ["Овен", "Телец", "Близнецы", "Рак", "Лев", "Дева", "Весы", "Скорпион", "Стрелец", "Козерог", "Водолей", "Рыбы"], multiSelect: false },
    { id: 'personality_type', label: "Тип личности", q: "Ты скорее... ☯️", type: 'options', options: ["Экстраверт", "Интроверт", "Амбиверт"], multiSelect: false },
    { id: 'love_language', label: "Язык любви", q: "Твой язык любви? (Можно несколько) ❤️", type: 'options', options: ["Слова", "Подарки", "Время", "Прикосновения", "Забота"], multiSelect: true },
    { id: 'pets', label: "Питомцы", q: "Животные? 🐾", type: 'options', options: ["Собака", "Кошка", "Нет", "Хочу", "Другое"], multiSelect: true },
    { id: 'ideal_date', label: "Идеальное свидание", q: "Идеальное свидание? (Выбери варианты) 🌹", type: 'options', options: ["Ресторан", "Прогулка", "Активность", "Кино", "Бар", "Дома"], multiSelect: true },
    { id: 'interests_1', label: "Интересы", q: "Твои интересы? 🔥", type: 'options', options: ["Спорт", "Путешествия", "Музыка", "IT", "Арт", "Кино", "Книги", "Еда", "Бизнес", "Наука", "Игры", "Природа"], multiSelect: true },
    { id: 'bio', label: "О себе", q: "Пару слов о себе для профиля? (Био) ✨", type: 'text' },
    { id: 'photos', label: "Фото", q: "Финальный шаг! Загрузи 3-4 классных фото. 📸", type: 'photo_upload' }
];

export default function AIOnboardingFlow() {
    const { hapticFeedback } = useTelegram();
    const [messages, setMessages] = useState<Message[]>([]);
    const [stepIndex, setStepIndex] = useState(0);
    const [inputValue, setInputValue] = useState('');
    const [showSummary, setShowSummary] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true); // NEW: Loading state
    const [initError, setInitError] = useState<string | null>(null); // NEW: Error state
    const [userData, setUserData] = useState<UserData>({
        name: '', gender: 'male', age: 18, interests: [], bio: '', photos: [], details: {}
    });

    const [isTyping, setIsTyping] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [tempSelectedOptions, setTempSelectedOptions] = useState<string[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const initialMessageSent = useRef(false);

    useEffect(() => {
        // FIX: Prevent multiple initializations
        if (initialMessageSent.current) return;
        
        const initOnboarding = async () => {
            console.log("[Onboarding] Starting initialization...");
            // #region agent log
            const sendLog = (msg: string, data: any, hId?: string) => { try { const logs = JSON.parse(localStorage.getItem('__debug_logs__') || '[]'); logs.push({msg, data, hId, t: Date.now()}); localStorage.setItem('__debug_logs__', JSON.stringify(logs)); } catch(e){} console.log('[DEBUG]', msg, data); };
            // Clear old logs on fresh init
            localStorage.setItem('__debug_logs__', '[]');
            const tgWebApp = (window as any).Telegram?.WebApp;
            const tgInitData = tgWebApp?.initData;
            const existingToken = localStorage.getItem('accessToken') || localStorage.getItem('token');
            sendLog('ONBOARDING_START', {url: window.location.href, hasTgSDK: !!tgWebApp, initDataLen: tgInitData?.length || 0, initDataEmpty: !tgInitData, hasExistingToken: !!existingToken, userAgent: navigator.userAgent}, 'H1');
            // #endregion
            setIsInitializing(true);
            setInitError(null);
            
            // Step 1: Check for existing token
            let token = typeof window !== 'undefined' ? (localStorage.getItem('accessToken') || localStorage.getItem('token')) : null;
            console.log("[Onboarding] Existing token:", !!token);
            // #region agent log
            sendLog('STEP1_TOKEN_CHECK', {hasToken: !!token, tokenPreview: token ? token.substring(0,20)+'...' : null}, 'H1');
            // #endregion
            
            // Step 2: If no token, try Telegram auth
            if (!token) {
                const initData = window.Telegram?.WebApp?.initData || sessionStorage.getItem('tg_init_data') || '';
                if (initData && initData.trim()) {
                    console.log("[Onboarding] No token, attempting Telegram auth...");
                    console.log("[Onboarding] initData length:", initData.length);
                    // #region agent log
                    sendLog('STEP2_TG_AUTH_ATTEMPT', {initDataLen: initData.length}, 'H2');
                    // #endregion
                    try {
                        const result = await authService.telegramLogin(initData);
                        console.log("[Onboarding] Telegram auth success, has_profile:", result.has_profile);
                        // #region agent log
                        sendLog('STEP2_TG_AUTH_SUCCESS', {has_profile: result.has_profile}, 'H2');
                        // #endregion
                        token = localStorage.getItem('accessToken');
                    } catch (err: any) {
                        console.error("[Onboarding] Telegram auth failed:", err);
                        const errorMsg = err?.message || err?.data?.detail || 'Unknown error';
                        // #region agent log
                        sendLog('STEP2_TG_AUTH_FAILED', {error: errorMsg, status: err?.status}, 'H2');
                        // #endregion
                        setInitError(`Ошибка авторизации: ${errorMsg}`);
                        setIsInitializing(false);
                        return;
                    }
                }
            }
            
            // Step 3: Still no token and no Telegram data - show error instead of redirect
            if (!token) {
                const hasTelegramData = typeof window !== 'undefined' && !!(window.Telegram?.WebApp?.initData || sessionStorage.getItem('tg_init_data'));
                console.warn("[Onboarding] No auth available, hasTelegramData:", hasTelegramData);
                // #region agent log
                sendLog('STEP3_NO_TOKEN', {hasTelegramData}, 'H1');
                // #endregion
                
                if (!hasTelegramData) {
                    // Not in Telegram Mini App - redirect to login
                    // #region agent log
                    sendLog('STEP3_REDIRECT_AUTH', {reason: 'no telegram data'}, 'H1');
                    // #endregion
                    window.location.href = '/auth/phone';
                    return;
                }
                
                // In Telegram but auth failed - show error
                setInitError("Не удалось авторизоваться. Попробуйте перезапустить бот командой /start");
                setIsInitializing(false);
                return;
            }
            
            // Step 4: Check profile status
            try {
                // #region agent log
                sendLog('STEP4_PROFILE_CHECK_START', {}, 'H4');
                // #endregion
                const me = await authService.getMe();
                console.log("[Onboarding] Profile check - is_complete:", me.is_complete, "photos:", me.photos?.length, "gender:", me.gender);
                // #region agent log
                sendLog('STEP4_PROFILE_DATA', {is_complete: me.is_complete, photosCount: me.photos?.length, gender: me.gender, name: me.name, id: me.id}, 'H4');
                // #endregion
                
                // Only redirect if profile is TRULY complete (has photos AND real gender)
                const hasPhotos = me.photos && me.photos.length > 0;
                const hasRealGender = me.gender && me.gender !== 'other';
                
                // #region agent log
                sendLog('STEP4_COMPLETE_CHECK', {hasPhotos, hasRealGender, willRedirect: me.is_complete === true && hasPhotos && hasRealGender}, 'H4');
                // #endregion
                
                if (me.is_complete === true && hasPhotos && hasRealGender) {
                    console.log("[Onboarding] Profile complete, redirecting to home");
                    // #region agent log
                    sendLog('STEP4_REDIRECT_HOME', {reason: 'profile complete'}, 'H4');
                    // #endregion
                    window.location.href = '/';
                    return;
                }
                
                // Profile incomplete - start onboarding
                console.log("[Onboarding] Profile incomplete, starting onboarding flow");
                // #region agent log
                sendLog('STEP4_START_ONBOARDING', {reason: 'profile incomplete'}, 'H4');
                // #endregion
                initialMessageSent.current = true;
                setIsInitializing(false);
                addAIMessage(FLOW_STEPS[0].q, FLOW_STEPS[0].type as any, FLOW_STEPS[0].options, (FLOW_STEPS[0] as any).multiSelect, (FLOW_STEPS[0] as any).layoutType);
                
            } catch (e: any) {
                console.error("[Onboarding] Profile check failed:", e);
                
                // On 401, try re-auth via Telegram
                if (e?.status === 401 || e?.message?.includes('Unauthorized')) {
                    if (typeof window !== 'undefined') {
                        const initData = window.Telegram?.WebApp?.initData || sessionStorage.getItem('tg_init_data') || '';
                        if (initData && initData.trim()) {
                            console.log("[Onboarding] Session expired, re-authenticating...");
                            try {
                                await authService.telegramLogin(initData);
                                // Retry - but don't loop infinitely
                                const me = await authService.getMe();
                                const hasPhotos = me.photos && me.photos.length > 0;
                                const hasRealGender = me.gender && me.gender !== 'other';
                                
                                if (me.is_complete === true && hasPhotos && hasRealGender) {
                                    window.location.href = '/';
                                    return;
                                }
                                
                                initialMessageSent.current = true;
                                setIsInitializing(false);
                                addAIMessage(FLOW_STEPS[0].q, FLOW_STEPS[0].type as any, FLOW_STEPS[0].options, (FLOW_STEPS[0] as any).multiSelect, (FLOW_STEPS[0] as any).layoutType);
                                return;
                            } catch (reAuthErr: any) {
                                console.error("[Onboarding] Re-auth failed:", reAuthErr);
                                setInitError(`Ошибка повторной авторизации: ${reAuthErr?.message || 'Unknown'}`);
                                setIsInitializing(false);
                                return;
                            }
                        }
                    }
                    // No Telegram data for re-auth
                    window.location.href = '/auth/phone';
                    return;
                }
                
                // On other errors, still allow onboarding
                console.log("[Onboarding] Starting onboarding despite error");
                initialMessageSent.current = true;
                setIsInitializing(false);
                addAIMessage(FLOW_STEPS[0].q, FLOW_STEPS[0].type as any, FLOW_STEPS[0].options, (FLOW_STEPS[0] as any).multiSelect, (FLOW_STEPS[0] as any).layoutType);
            }
        };
        
        initOnboarding();
    }, []);

    // FIX (MEM): Cleanup Object URLs on unmount to prevent memory leaks
    useEffect(() => {
        return () => {
            userData.photos.forEach(photo => {
                URL.revokeObjectURL(photo.preview);
            });
        };
    }, [userData.photos]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping, userData.photos, tempSelectedOptions]);

    const addAIMessage = (text: string, type: 'text' | 'number' | 'options' | 'photo_upload' = 'text', options?: string[], multiSelect?: boolean, layoutType?: 'chip' | 'card') => {
        setIsTyping(true);
        setTimeout(() => {
            setMessages(prev => [
                ...prev,
                { id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, text, isAI: true, type, options, multiSelect, layoutType }
            ]);
            setTempSelectedOptions([]);
            setIsTyping(false);
            hapticFeedback.notificationOccurred('success');
        }, 800);
    };

    const handleOptionClick = (option: string, multiSelect: boolean = false) => {
        if (!multiSelect) {
            handleUserResponse(option);
        } else {
            setTempSelectedOptions(prev => {
                const exists = prev.includes(option);
                if (option === "Нет" || option === "Не курю") {
                    return [option];
                }
                let newSelection = exists ? prev.filter(o => o !== option) : [...prev, option];
                newSelection = newSelection.filter(o => o !== "Нет" && o !== "Не курю");
                return newSelection;
            });
            hapticFeedback.impactOccurred('light');
        }
    };

    const handleMultiSelectConfirm = () => {
        if (tempSelectedOptions.length === 0) return;
        handleUserResponse(tempSelectedOptions.join(', '));
    };

    const handleUserResponse = (text: string, type: 'text' | 'image' = 'text', content?: string) => {
        const currentStep = FLOW_STEPS[stepIndex];

        // 0. Cyrillic Enforcement (Exceptions for Options)
        // Check Latin only if step type is 'text' (manual input). 
        // This avoids error on 'options' like "IT" or other system defined buttons.
        if (currentStep.type === 'text' && text && /[a-zA-Z]/.test(text)) {
            setMessages(prev => [...prev, { id: `${Date.now()}`, text: text, isAI: false }, { id: `${Date.now()}-err`, text: "Пожалуйста, отвечай на русском языке (кириллицей)! 🇷🇺", isAI: true, type: 'text' }]);
            setInputValue(''); hapticFeedback.notificationOccurred('error'); return;
        }

        if (['name', 'job', 'city', 'bio'].includes(currentStep.id)) {
            if (/^[\d\s]+$/.test(text)) {
                setMessages(prev => [...prev, { id: `${Date.now()}`, text: text, isAI: false }, { id: `${Date.now()}-err`, text: "Напиши словами, пожалуйста!", isAI: true, type: 'text' }]);
                hapticFeedback.notificationOccurred('error'); setInputValue(''); return;
            }
            if (text.length < 2) {
                setMessages(prev => [...prev, { id: `${Date.now()}`, text: text, isAI: false }, { id: `${Date.now()}-err`, text: "Слишком коротко!", isAI: true, type: 'text' }]);
                hapticFeedback.notificationOccurred('warning'); setInputValue(''); return;
            }
        }
        if (currentStep.type === 'number') {
            const num = parseInt(text);
            if (isNaN(num)) {
                setMessages(prev => [...prev, { id: `${Date.now()}`, text: text, isAI: false }, { id: `${Date.now()}-err`, text: "Тут нужны только цифры! 🔢", isAI: true, type: 'text' }]);
                setInputValue(''); return;
            }
            if (currentStep.id === 'age') {
                if (num < 18) {
                    setMessages(prev => [...prev, { id: `${Date.now()}`, text: text, isAI: false }, { id: `${Date.now()}-err`, text: "Извини, но сервис только для взрослых (18+). 🔞", isAI: true, type: 'text' }]);
                    setInputValue(''); return;
                }
                if (num > 100) {
                    setMessages(prev => [...prev, { id: `${Date.now()}`, text: text, isAI: false }, { id: `${Date.now()}-err`, text: "Ого! Долгожитель? Давай укажем реальный возраст до 100 лет. 👴", isAI: true, type: 'text' }]);
                    setInputValue(''); return;
                }
            }
            if (currentStep.id === 'height') {
                if (num < 150 || num > 240) {
                    setMessages(prev => [...prev, { id: `${Date.now()}`, text: text, isAI: false }, { id: `${Date.now()}-err`, text: "Рост должен быть от 150 до 240 см! 📏", isAI: true, type: 'text' }]);
                    setInputValue(''); return;
                }
            }
        }
        setMessages(prev => [...prev, { id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, text, isAI: false, type, content }]);
        setInputValue('');
        processStepData(currentStep.id, text, content);
        if (stepIndex < FLOW_STEPS.length - 1) {
            const nextStep = FLOW_STEPS[stepIndex + 1];
            setStepIndex(prev => prev + 1);
            addAIMessage(nextStep.q, nextStep.type as any, nextStep.options, (nextStep as any).multiSelect, (nextStep as any).layoutType);
        }
    };

    const getEmojiForOption = (option: string) => {
        if (option.includes('Мужчина')) return '👨';
        if (option.includes('Женщина')) return '👩';
        if (option.includes('Отношения')) return '💍';
        if (option.includes('Свидания')) return '🍷';
        if (option.includes('Флирт')) return '🔥';
        if (option.includes('Дружба')) return '🤝';
        if (option.includes('Пока смотрю')) return '👀';
        return '✨';
    };

    const processStepData = (stepId: string, value: string, content?: string) => {
        setUserData(prev => {
            const newData = { ...prev, details: { ...prev.details } };
            switch (stepId) {
                case 'name': newData.name = value; break;
                case 'gender': newData.gender = value.includes('Мужчина') ? 'male' : 'female'; break;
                case 'age': newData.age = parseInt(value) || 18; break;
                case 'interests_1':
                    const interests = value.split(', ').filter(Boolean);
                    newData.interests = Array.from(new Set([...prev.interests, ...interests]));
                    break;
                case 'bio': newData.bio = value; break;
                case 'photos': break;
                default: newData.details[stepId] = value; break;
            }
            return newData;
        });
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        // FIX (MEM): Use Object URL instead of base64 (saves ~8MB per photo in RAM)
        Array.from(files).forEach(file => {
            const preview = URL.createObjectURL(file);
            setUserData(prev => ({
                ...prev,
                photos: [...prev.photos, { file, preview }]
            }));
        });
        e.target.value = '';
    };

    const handleFinishOnboarding = () => {
        if (userData.photos.length === 0) {
            alert("Загрузите хотя бы одно фото!");
            return;
        }
        setShowSummary(true);
    };

    const handleConfirmProfile = async () => {
        if (isSubmitting) return;

        // Check Auth Token
        const token = typeof window !== 'undefined' ? (localStorage.getItem('accessToken') || localStorage.getItem('token')) : null;
        if (!token) {
            window.location.href = '/auth/phone';
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Prepare bio text
            let compositeBio = userData.bio;

            // 2. Submit all profile fields structurally
            const profileData: any = {
                name: userData.name,
                age: userData.age,
                gender: userData.gender,
                interests: userData.interests,
                bio: compositeBio,
            };

            // Map details to structured fields
            const d = userData.details;
            if (d.city) profileData.city = d.city;
            if (d.height) profileData.height = parseInt(d.height) || undefined;
            if (d.education) profileData.education = d.education;
            if (d.job) profileData.job = d.job;
            if (d.children_clean) profileData.children = d.children_clean;
            if (d.smoking) profileData.smoking = d.smoking;
            if (d.alcohol) profileData.drinking = d.alcohol;
            if (d.zodiac) profileData.zodiac = d.zodiac;
            if (d.personality_type) profileData.personality_type = d.personality_type;
            if (d.love_language) profileData.love_language = d.love_language;
            if (d.pets) profileData.pets = d.pets;
            if (d.ideal_date) profileData.ideal_date = d.ideal_date;
            if (d.intent) profileData.intent = d.intent;
            if (d.looking_for) profileData.looking_for = d.looking_for;

            console.log("Submitting Profile Data...", profileData);
            await authService.updateProfile(profileData);

            // 3. Upload Photos (PARALLEL for speed!)
            const uploadPromises = userData.photos.map((photoData, i) => {
                return authService.uploadPhoto(photoData.file).catch(e => {
                    console.error(`Photo upload ${i} failed:`, e);
                    return null;
                });
            });

            await Promise.allSettled(uploadPromises);

            // 4. Success
            hapticFeedback.notificationOccurred('success');
            window.location.href = '/';

        } catch (e: any) {
            console.error("Critical Profile Error:", e);
            const status = e.status || e.response?.status || 'Unknown';
            const msg = e.data?.detail || e.message || 'Unknown error';

            // Handle "User not found" or 404/401 - clear stale token and redirect to login
            if (msg.includes('not found') || msg.includes('Unauthorized') || status === 404 || status === 401) {
                alert('Сессия устарела. Пожалуйста, войдите заново.');
                localStorage.removeItem('token');
                localStorage.removeItem('accessToken');
                window.location.href = '/auth/phone';
                return;
            }

            alert(`Ошибка сохранения (Status: ${status}): ${JSON.stringify(msg)}`);
            setIsSubmitting(false);
        }
    };

    // --- HELPER: get Styles for Info Chips ---
    const getDetailStyle = (key: string) => {
        switch (key) {
            case 'zodiac': return "bg-purple-100 text-purple-700 hover:bg-purple-200";
            case 'height': return "bg-slate-100 text-slate-600 hover:bg-slate-200";
            case 'intent': return "bg-pink-100 text-pink-700 hover:bg-pink-200";
            case 'children_clean': return "bg-amber-100 text-amber-700 hover:bg-amber-200";
            case 'smoking': return "bg-zinc-100 text-zinc-600 hover:bg-zinc-200";
            case 'alcohol': return "bg-orange-50 text-orange-600 hover:bg-orange-100";
            default: return "bg-slate-50 text-slate-700 hover:bg-slate-100";
        }
    }

    // --- HELPER: get Icon for Info Chips ---
    const getDetailIcon = (key: string) => {
        const props = { size: 14, className: "shrink-0" };
        switch (key) {
            case 'height': return <Ruler {...props} />;
            case 'children_clean': return <Baby {...props} />;
            case 'smoking': return <Cigarette {...props} />;
            case 'alcohol': return <Wine {...props} />;
            case 'education': return <BookOpen {...props} />;
            case 'job': return <Briefcase {...props} />;
            case 'intent': return <Heart {...props} />;
            case 'zodiac': return <Moon {...props} />;
            case 'love_language': return <Star {...props} />;
            case 'personality_type': return <Coffee {...props} />;
            default: return <Sparkles {...props} />;
        }
    }

    const currentStepConfig = FLOW_STEPS[stepIndex];
    const isTextInputAllowed = currentStepConfig && (currentStepConfig.type === 'text' || currentStepConfig.type === 'number');
    const isNumberInput = currentStepConfig?.type === 'number';

    return (
        <div className="fixed inset-0 bg-[#0f0f11] flex items-center justify-center z-[100] font-sans text-white">
            <DebugOverlay />
            <div className="w-full h-full sm:h-[90vh] sm:max-w-[420px] bg-black sm:rounded-[3rem] sm:border-[8px] sm:border-[#1c1c1e] sm:shadow-2xl relative flex flex-col overflow-hidden">
                {/* Loading State */}
                {isInitializing && (
                    <div className="absolute inset-0 bg-black z-50 flex flex-col items-center justify-center">
                        <div className="w-16 h-16 border-2 border-[#ff4b91]/30 rounded-full border-t-[#ff4b91] animate-spin mb-4" />
                        <p className="text-gray-400 text-sm">Загрузка...</p>
                    </div>
                )}
                
                {/* Error State */}
                {initError && !isInitializing && (
                    <div className="absolute inset-0 bg-black z-50 flex flex-col items-center justify-center p-6 text-center">
                        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                            <X size={32} className="text-red-500" />
                        </div>
                        <h2 className="text-xl font-bold mb-2">Ошибка</h2>
                        <p className="text-gray-400 text-sm mb-6">{initError}</p>
                        <button 
                            onClick={() => window.location.reload()}
                            className="px-6 py-3 bg-[#ff4b91] rounded-full text-white font-bold"
                        >
                            Попробовать снова
                        </button>
                    </div>
                )}
                
                {showSummary ? (
                    <div className="absolute inset-0 bg-white z-50 animate-in fade-in duration-500 font-sans text-slate-900 flex flex-col">

                        {/* Header Photo Area */}
                        <div className="relative h-[62%] shrink-0 w-full overflow-hidden">
                            {userData.photos[0] ? (
                                <img src={userData.photos[0].preview} className="w-full h-full object-cover" alt="Profile" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-300">
                                    <Camera size={48} className="opacity-50" />
                                </div>
                            )}

                            {/* Gradient Overlay for Text Visibility */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10" />

                            {/* Top Navigation Row (Floating) */}
                            <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-20">
                                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
                                    <ArrowRight className="rotate-180" size={20} />
                                </div>
                                <div className="px-3 py-1 rounded-full bg-white/20 backdrop-blur text-xs font-bold text-white border border-white/20">
                                    Анкета
                                </div>
                            </div>

                            {/* Name & Bio Overlay (Start of Card) */}
                            <div className="absolute bottom-6 left-0 right-0 px-6 z-20 text-white">
                                <h1 className="text-3xl font-bold flex items-center gap-2 drop-shadow-md">
                                    {userData.name}, {userData.age}
                                    <span className="bg-blue-500 text-white rounded-full p-0.5"><Check size={14} strokeWidth={4} /></span>
                                </h1>
                                <p className="text-white/90 text-sm font-medium leading-relaxed mt-2 line-clamp-2 drop-shadow-sm opacity-90">
                                    {userData.bio || 'Привет! Я тут новенький.'}
                                </p>
                            </div>
                        </div>

                        {/* White Sheet / Content Area */}
                        <div className="flex-1 -mt-6 rounded-t-[32px] bg-white relative z-10 px-6 pt-8 pb-32 overflow-y-auto scrollbar-hide shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">

                            {/* Section: Анкета */}
                            <div className="mb-6">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Анкета</h3>
                                <div className="flex flex-wrap gap-2">
                                    {/* Hardcode common items logic or map */}
                                    {Object.entries(userData.details).map(([key, value], idx) => {
                                        if (!value) return null;
                                        return (
                                            <div key={idx} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${getDetailStyle(key)}`}>
                                                {getDetailIcon(key)}
                                                <span>{value}</span>
                                            </div>
                                        )
                                    })}
                                    {/* Gender Chip */}
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold">
                                        <Ruler size={14} className="shrink-0" />
                                        <span>{userData.gender === 'male' ? 'Мужчина' : 'Женщина'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Интересы */}
                            <div className="mb-6">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Интересы</h3>
                                <div className="flex flex-wrap gap-2">
                                    {userData.interests.map((tag, i) => (
                                        <span key={i} className="px-3 py-1.5 bg-pink-50 text-pink-600 rounded-full text-xs font-bold border border-pink-100 flex items-center gap-1">
                                            {tag}
                                        </span>
                                    ))}
                                    {userData.interests.length === 0 && <span className="text-xs text-gray-400">Нет интересов</span>}
                                </div>
                            </div>

                            {/* Section: Музыка (Dummy) */}
                            <div className="mb-6">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Музыка</h3>
                                <div className="flex flex-wrap gap-2">
                                    {['The Weeknd', 'Arctic Monkeys', 'Drake'].map((m) => (
                                        <div key={m} className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs font-bold border border-blue-100 flex items-center gap-1">
                                            <Music size={12} /> {m}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions (Fixed Bottom) */}
                        <div className="absolute bottom-8 left-0 right-0 px-10 flex justify-between items-center z-30 pointer-events-none">
                            {/* Buttons grouping to center but spread */}
                            <div className="w-full flex justify-center gap-8 pointer-events-auto">
                                {/* Edit Button (Red) */}
                                <button onClick={() => setShowSummary(false)} className="w-14 h-14 rounded-full bg-white border border-gray-100 shadow-xl shadow-red-100 flex items-center justify-center text-rose-500 hover:scale-110 active:scale-95 transition-all">
                                    <X size={28} strokeWidth={2.5} />
                                </button>

                                {/* Star Button (Purple - Middle) */}
                                <button className="w-10 h-10 rounded-full bg-white border border-gray-100 shadow-lg shadow-purple-100 flex items-center justify-center text-purple-400 hover:scale-110 transition-all mt-2">
                                    <Star size={20} fill="currentColor" stroke="none" />
                                </button>

                                {/* Confirm Button (Blue) */}
                                <button onClick={handleConfirmProfile} disabled={isSubmitting} className="w-14 h-14 rounded-full bg-blue-500 shadow-xl shadow-blue-200 flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all">
                                    {isSubmitting ? <Loader2 className="animate-spin" /> : <Check size={28} strokeWidth={3} />}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    // CHAT VIEW
                    <>
                        <input type="file" accept="image/*" multiple className="hidden" ref={fileInputRef} onChange={handlePhotoUpload} />
                        <div className="px-4 py-3 border-b border-white/10 bg-black/50 backdrop-blur shrink-0 flex items-center justify-between z-10">
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#ff4b91] to-[#ff9e4a] flex items-center justify-center animate-pulse"><Sparkles className="w-4 h-4 text-white" /></div>
                                <div className="font-bold text-sm tracking-tight text-white">MambaX AI</div>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] text-gray-500 mb-1 font-mono">{stepIndex + 1}/{FLOW_STEPS.length}</span>
                                <div className="h-1 w-16 bg-white/10 rounded-full overflow-hidden"><motion.div className="h-full bg-[#ff4b91]" initial={{ width: 0 }} animate={{ width: `${((stepIndex + 1) / FLOW_STEPS.length) * 100}%` }} /></div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24 scrollbar-hide">
                            {messages.map((msg) => (
                                <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.isAI ? 'justify-start' : 'justify-end'}`}>
                                    <div className={`max-w-[88%] ${msg.isAI ? 'order-2' : ''}`}>
                                        {(msg.type !== 'photo_upload') && (
                                            <div className={`px-5 py-3.5 rounded-2xl text-sm leading-relaxed shadow-lg ${msg.isAI ? 'bg-[#1c1c1e] text-gray-100 rounded-tl-sm border border-white/5' : 'bg-gradient-to-br from-[#ff4b91] to-[#ff9e4a] text-white rounded-tr-sm font-bold'}`}>
                                                <p className="whitespace-pre-wrap">{msg.text}</p>
                                            </div>
                                        )}
                                        {msg.isAI && msg.options && (
                                            <div className="mt-3 flex flex-col items-start gap-3 w-full">
                                                <div className={`flex flex-wrap gap-2 w-full ${msg.layoutType === 'card' ? 'grid grid-cols-2 gap-3' : ''}`}>
                                                    {msg.options.map(opt => (
                                                        <button
                                                            key={opt}
                                                            onClick={() => handleOptionClick(opt, msg.multiSelect)}
                                                            className={`
                                                                transition-all active:scale-95
                                                                ${msg.layoutType === 'card'
                                                                    ? `h-24 rounded-2xl flex flex-col items-center justify-center p-2 font-bold text-sm shadow-md border 
                                                                        ${tempSelectedOptions.includes(opt)
                                                                        ? 'bg-gradient-to-br from-[#ff4b91] to-[#ff9e4a] text-white border-transparent'
                                                                        : 'bg-[#1c1c1e] text-gray-300 border-white/10 hover:bg-white/5'}`
                                                                    : `px-4 py-2.5 rounded-xl text-xs font-medium 
                                                                        ${tempSelectedOptions.includes(opt)
                                                                        ? 'bg-white text-black scale-105 shadow-lg'
                                                                        : 'bg-white/5 border border-white/10 text-gray-200 hover:bg-white/10'}`
                                                                }
                                                            `}
                                                        >
                                                            {msg.layoutType === 'card' && <span className="text-2xl mb-1">{getEmojiForOption(opt)}</span>}
                                                            {opt}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {msg.isAI && msg.type === 'photo_upload' && (
                                            <div className="mt-2 bg-[#1c1c1e] p-5 rounded-2xl border border-white/10 text-center space-y-4 shadow-xl">
                                                <p className="text-gray-400 text-sm mb-2">{msg.text}</p>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {userData.photos.map((photoData, idx) => (
                                                        <motion.div layout key={idx} className="aspect-[3/4] rounded-xl overflow-hidden relative border border-white/10 shadow-sm"><img src={photoData.preview} className="w-full h-full object-cover" alt={`Photo ${idx + 1}`} /></motion.div>
                                                    ))}
                                                    {userData.photos.length < 4 && (
                                                        <button onClick={() => fileInputRef.current?.click()} className="aspect-[3/4] rounded-xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center hover:bg-white/5 hover:border-[#ff4b91]/50 transition-all gap-2 group">
                                                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform"><Camera className="w-5 h-5 text-gray-400 group-hover:text-[#ff4b91]" /></div>
                                                            <span className="text-[9px] uppercase tracking-widest text-gray-500 font-bold group-hover:text-gray-300">Добавить</span>
                                                        </button>
                                                    )}
                                                </div>
                                                {userData.photos.length > 0 && (
                                                    <button onClick={handleFinishOnboarding} className="w-full py-4 bg-gradient-to-r from-[#ff4b91] to-[#ff9e4a] rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-[0_4px_15px_rgba(255,75,145,0.3)] hover:scale-[1.02] transition-transform animate-in slide-in-from-bottom-2">
                                                        <span>Я загрузил всё, продолжить</span> <ArrowRight className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                            {isTyping && <div className="flex justify-start"><div className="bg-[#1c1c1e] px-4 py-3 rounded-2xl rounded-tl-sm flex space-x-1 border border-white/5"><span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" /></div></div>}
                            <div ref={messagesEndRef} />
                        </div>

                        <AnimatePresence>
                            {tempSelectedOptions.length > 0 && currentStepConfig?.multiSelect && (
                                <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="absolute bottom-[84px] right-4 z-20">
                                    <button onClick={handleMultiSelectConfirm} className="px-6 py-3 bg-white text-black rounded-full text-sm font-bold flex items-center space-x-2 shadow-[0_0_20px_rgba(255,255,255,0.4)] hover:scale-105 active:scale-95 transition-all"><span>Готово ({tempSelectedOptions.length})</span> <ArrowRight className="w-4 h-4" /></button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <div className={`p-4 bg-black/80 backdrop-blur border-t border-white/10 transition-all duration-300 ${FLOW_STEPS[stepIndex]?.type === 'photo_upload' ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}>
                            <form onSubmit={(e) => { e.preventDefault(); if (isTextInputAllowed && inputValue.trim() && !isTyping) handleUserResponse(inputValue); }} className="flex items-center space-x-3">
                                <div className="flex-1 relative">
                                    <input
                                        type={isNumberInput ? "number" : "text"}
                                        inputMode={isNumberInput ? "numeric" : "text"}
                                        disabled={!isTextInputAllowed || isTyping}
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        placeholder={isTextInputAllowed ? (isNumberInput ? "Введите число..." : "Напиши ответ...") : "Выберите вариант выше..."}
                                        className={`w-full border-none rounded-2xl px-5 py-3.5 text-white focus:ring-1 focus:ring-[#ff4b91] transition-all text-sm shadow-inner [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${isTextInputAllowed ? 'bg-[#1c1c1e] placeholder-gray-500' : 'bg-[#151517] text-gray-600 placeholder-gray-700 cursor-not-allowed'}`}
                                    />
                                </div>
                                <button type="submit" disabled={!isTextInputAllowed || !inputValue.trim() || isTyping} className={`p-3.5 rounded-full shadow-lg transition-all ${isTextInputAllowed && inputValue.trim() ? 'bg-[#ff4b91] text-white' : 'bg-white/5 text-gray-600 cursor-not-allowed'}`}><Send className="w-5 h-5" /></button>
                            </form>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// Debug overlay component - shows logs on screen
function DebugOverlay() {
    const [logs, setLogs] = React.useState<any[]>([]);
    const [show, setShow] = React.useState(true);
    React.useEffect(() => {
        const interval = setInterval(() => {
            try {
                const raw = localStorage.getItem('__debug_logs__');
                if (raw) setLogs(JSON.parse(raw));
            } catch(e){}
        }, 500);
        return () => clearInterval(interval);
    }, []);
    if (!show) return <button onClick={() => setShow(true)} style={{position:'fixed',bottom:4,right:4,zIndex:99999,background:'red',color:'#fff',border:'none',borderRadius:4,padding:'2px 8px',fontSize:10,opacity:0.7}}>DBG</button>;
    return (
        <div style={{position:'fixed',bottom:0,left:0,right:0,zIndex:99999,background:'rgba(0,0,0,0.9)',color:'#0f0',fontSize:10,fontFamily:'monospace',maxHeight:'40vh',overflowY:'auto',padding:4}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:2}}>
                <span>DEBUG LOGS ({logs.length})</span>
                <button onClick={() => setShow(false)} style={{color:'red',background:'none',border:'none',fontSize:10,cursor:'pointer'}}>X</button>
            </div>
            {logs.length === 0 && <div style={{color:'yellow'}}>No logs yet...</div>}
            {logs.map((l: any, i: number) => (
                <div key={i} style={{borderBottom:'1px solid #333',padding:'1px 0'}}>
                    <span style={{color:'#888'}}>{new Date(l.t).toLocaleTimeString()}</span>{' '}
                    <span style={{color:'#ff0'}}>[{l.hId}]</span>{' '}
                    <span>{l.msg}</span>{' '}
                    <span style={{color:'#aaa'}}>{JSON.stringify(l.data)}</span>
                </div>
            ))}
        </div>
    );
}
