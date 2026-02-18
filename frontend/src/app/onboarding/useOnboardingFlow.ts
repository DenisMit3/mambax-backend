'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useTelegram } from '@/lib/telegram';
import { authService } from '@/services/api';
import { FLOW_STEPS, type Message, type UserData } from './onboardingTypes';

// --- Хук: вся логика онбординг-флоу ---
export function useOnboardingFlow() {
    const { hapticFeedback } = useTelegram();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [messages, setMessages] = useState<Message[]>([]);
    const [stepIndex, setStepIndex] = useState(0);
    const [inputValue, setInputValue] = useState('');
    const [showSummary, setShowSummary] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);
    const [initError, setInitError] = useState<string | null>(null);
    const [userData, setUserData] = useState<UserData>({
        name: '', gender: 'male', age: 18, interests: [], bio: '', photos: [], details: {}
    });
    const [isTyping, setIsTyping] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [tempSelectedOptions, setTempSelectedOptions] = useState<string[]>([]);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const initialMessageSent = useRef(false);

    // --- Инициализация онбординга (авторизация + проверка профиля) ---
    useEffect(() => {
        if (initialMessageSent.current) return;

        const initOnboarding = async () => {
            setIsInitializing(true);
            setInitError(null);

            let token = typeof window !== 'undefined' ? (localStorage.getItem('accessToken') || localStorage.getItem('token')) : null;

            if (!token) {
                const initData = window.Telegram?.WebApp?.initData || sessionStorage.getItem('tg_init_data') || '';
                if (initData && initData.trim()) {
                    try {
                        await authService.telegramLogin(initData);
                        token = localStorage.getItem('accessToken');
                    } catch (err: unknown) {
                        const error = err as Error & { data?: { detail?: string } };
                        const errorMsg = error?.message || error?.data?.detail || 'Unknown error';
                        setInitError(`Ошибка авторизации: ${errorMsg}`);
                        setIsInitializing(false);
                        return;
                    }
                }
            }

            if (!token) {
                const hasTelegramData = typeof window !== 'undefined' && !!(window.Telegram?.WebApp?.initData || sessionStorage.getItem('tg_init_data'));
                if (!hasTelegramData) {
                    router.push('/auth/phone');
                    return;
                }
                setInitError("Не удалось авторизоваться. Попробуйте перезапустить бот командой /start");
                setIsInitializing(false);
                return;
            }

            try {
                const me = await authService.getMe();

                if (me.is_complete === true) {
                    router.push('/');
                    return;
                }
                initialMessageSent.current = true;
                setIsInitializing(false);
                addAIMessage(FLOW_STEPS[0].q, FLOW_STEPS[0].type, FLOW_STEPS[0].options, FLOW_STEPS[0].multiSelect, FLOW_STEPS[0].layoutType);
            } catch (e: unknown) {
                const err = e as Error & { status?: number; message?: string };
                if (err?.status === 401 || err?.message?.includes('Unauthorized')) {
                    if (typeof window !== 'undefined') {
                        const initData = window.Telegram?.WebApp?.initData || sessionStorage.getItem('tg_init_data') || '';
                        if (initData && initData.trim()) {
                            try {
                                await authService.telegramLogin(initData);
                                const me = await authService.getMe();

                                if (me.is_complete === true) {
                                    router.push('/');
                                    return;
                                }

                                initialMessageSent.current = true;
                                setIsInitializing(false);
                                addAIMessage(FLOW_STEPS[0].q, FLOW_STEPS[0].type, FLOW_STEPS[0].options, FLOW_STEPS[0].multiSelect, FLOW_STEPS[0].layoutType);
                                return;
                            } catch (reAuthErr: unknown) {
                                const reAuthError = reAuthErr as Error;
                                setInitError(`Ошибка повторной авторизации: ${reAuthError?.message || 'Unknown'}`);
                                setIsInitializing(false);
                                return;
                            }
                        }
                    }
                    router.push('/auth/phone');
                    return;
                }

                initialMessageSent.current = true;
                setIsInitializing(false);
                addAIMessage(FLOW_STEPS[0].q, FLOW_STEPS[0].type, FLOW_STEPS[0].options, FLOW_STEPS[0].multiSelect, FLOW_STEPS[0].layoutType);
            }
        };

        initOnboarding();
    }, []);

    // Очистка Object URL при размонтировании
    useEffect(() => {
        return () => {
            userData.photos.forEach(photo => {
                URL.revokeObjectURL(photo.preview);
            });
        };
    }, [userData.photos]);

    // Автоскролл к последнему сообщению
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping, userData.photos, tempSelectedOptions]);

    // --- Добавить AI-сообщение с задержкой (имитация набора) ---
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

    // --- Клик по опции (single / multi) ---
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

    // --- Подтверждение мультиселекта ---
    const handleMultiSelectConfirm = () => {
        if (tempSelectedOptions.length === 0) return;
        handleUserResponse(tempSelectedOptions.join(', '));
    };

    // --- Обработка ответа пользователя (валидация + переход) ---
    const handleUserResponse = (text: string, type: 'text' | 'image' = 'text', content?: string) => {
        const currentStep = FLOW_STEPS[stepIndex];

        // Проверка кириллицы для текстовых полей
        if (currentStep.type === 'text' && text && /[a-zA-Z]/.test(text)) {
            setMessages(prev => [...prev, { id: `${Date.now()}`, text, isAI: false }, { id: `${Date.now()}-err`, text: "Пожалуйста, отвечай на русском языке (кириллицей)! 🇷🇺", isAI: true, type: 'text' }]);
            setInputValue(''); hapticFeedback.notificationOccurred('error'); return;
        }

        if (['name', 'job', 'city', 'bio'].includes(currentStep.id)) {
            if (/^[\d\s]+$/.test(text)) {
                setMessages(prev => [...prev, { id: `${Date.now()}`, text, isAI: false }, { id: `${Date.now()}-err`, text: "Напиши словами, пожалуйста!", isAI: true, type: 'text' }]);
                hapticFeedback.notificationOccurred('error'); setInputValue(''); return;
            }
            if (text.length < 2) {
                setMessages(prev => [...prev, { id: `${Date.now()}`, text, isAI: false }, { id: `${Date.now()}-err`, text: "Слишком коротко!", isAI: true, type: 'text' }]);
                hapticFeedback.notificationOccurred('warning'); setInputValue(''); return;
            }
        }
        if (currentStep.type === 'number') {
            const num = parseInt(text);
            if (isNaN(num)) {
                setMessages(prev => [...prev, { id: `${Date.now()}`, text, isAI: false }, { id: `${Date.now()}-err`, text: "Тут нужны только цифры! 🔢", isAI: true, type: 'text' }]);
                setInputValue(''); return;
            }
            if (currentStep.id === 'age') {
                if (num < 18) {
                    setMessages(prev => [...prev, { id: `${Date.now()}`, text, isAI: false }, { id: `${Date.now()}-err`, text: "Извини, но сервис только для взрослых (18+). 🔞", isAI: true, type: 'text' }]);
                    setInputValue(''); return;
                }
                if (num > 100) {
                    setMessages(prev => [...prev, { id: `${Date.now()}`, text, isAI: false }, { id: `${Date.now()}-err`, text: "Ого! Долгожитель? Давай укажем реальный возраст до 100 лет. 👴", isAI: true, type: 'text' }]);
                    setInputValue(''); return;
                }
            }
            if (currentStep.id === 'height') {
                if (num < 150 || num > 240) {
                    setMessages(prev => [...prev, { id: `${Date.now()}`, text, isAI: false }, { id: `${Date.now()}-err`, text: "Рост должен быть от 150 до 240 см! 📏", isAI: true, type: 'text' }]);
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
            addAIMessage(nextStep.q, nextStep.type, nextStep.options, nextStep.multiSelect, nextStep.layoutType);
        }
    };

    // --- Маппинг ответа в userData ---
    const processStepData = (stepId: string, value: string, _content?: string) => {
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

    // --- Загрузка фото (Object URL вместо base64) ---
    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        Array.from(files).forEach(file => {
            const preview = URL.createObjectURL(file);
            setUserData(prev => ({
                ...prev,
                photos: [...prev.photos, { file, preview }]
            }));
        });
        e.target.value = '';
    };

    // --- Завершение онбординга (переход к summary) ---
    const handleFinishOnboarding = () => {
        if (userData.photos.length === 0) {
            setToast({ message: "Загрузите хотя бы одно фото!", type: 'error' });
            return;
        }
        setShowSummary(true);
    };

    // --- Подтверждение профиля (отправка на сервер) ---
    const handleConfirmProfile = async () => {
        if (isSubmitting) return;

        const token = typeof window !== 'undefined' ? (localStorage.getItem('accessToken') || localStorage.getItem('token')) : null;
        if (!token) {
            router.push('/auth/phone');
            return;
        }

        setIsSubmitting(true);
        try {
            const compositeBio = userData.bio;
            const profileData: Record<string, string | number | string[] | undefined> = {
                name: userData.name,
                age: userData.age,
                gender: userData.gender,
                interests: userData.interests,
                bio: compositeBio,
            };

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

            // 1. Загружаем фото последовательно, чтобы гарантировать сохранение
            for (let i = 0; i < userData.photos.length; i++) {
                try {
                    await authService.uploadPhoto(userData.photos[i].file);
                } catch (e) {
                    console.error(`Photo upload ${i} failed:`, e);
                }
            }

            // 2. Обновляем профиль - бэкенд увидит фото и выставит is_complete = true
            await authService.updateProfile(profileData);

            // 3. Проверяем что is_complete стал true
            const me = await authService.getMe();
            
            // 4. Обновляем кэш напрямую свежими данными (не invalidate, а setQueryData)
            queryClient.setQueryData(['user', 'me'], me);

            if (me.is_complete === true) {
                hapticFeedback.notificationOccurred('success');
                sessionStorage.setItem('onboarding_completed', 'true');
                router.push('/');
            } else {
                // Если бэкенд не выставил is_complete, пробуем ещё раз обновить профиль
                console.warn('[Onboarding] is_complete still false after save, retrying...');
                await authService.updateProfile(profileData);
                const me2 = await authService.getMe();
                queryClient.setQueryData(['user', 'me'], me2);
                hapticFeedback.notificationOccurred('success');
                sessionStorage.setItem('onboarding_completed', 'true');
                router.push('/');
            }
        } catch (e: unknown) {
            console.error("Critical Profile Error:", e);
            const err = e as Error & { status?: number; response?: { status?: number }; data?: { detail?: string } };
            const status = err.status || err.response?.status || 'Unknown';
            const msg = err.data?.detail || err.message || 'Unknown error';

            if (msg.includes('not found') || msg.includes('Unauthorized') || status === 404 || status === 401) {
                setToast({ message: 'Сессия устарела. Пожалуйста, войдите заново.', type: 'error' });
                setTimeout(() => {
                    localStorage.removeItem('token');
                    localStorage.removeItem('accessToken');
                    router.push('/auth/phone');
                }, 2000);
                return;
            }

            setToast({ message: `Ошибка сохранения (Status: ${status}): ${JSON.stringify(msg)}`, type: 'error' });
            setIsSubmitting(false);
        }
    };

    const currentStepConfig = FLOW_STEPS[stepIndex];
    const isTextInputAllowed = currentStepConfig && (currentStepConfig.type === 'text' || currentStepConfig.type === 'number');
    const isNumberInput = currentStepConfig?.type === 'number';

    return {
        // Состояние
        messages,
        stepIndex,
        inputValue,
        setInputValue,
        showSummary,
        setShowSummary,
        isInitializing,
        initError,
        userData,
        isTyping,
        isSubmitting,
        tempSelectedOptions,
        toast,
        setToast,
        // Рефы
        messagesEndRef,
        fileInputRef,
        // Вычисляемые
        currentStepConfig,
        isTextInputAllowed,
        isNumberInput,
        // Экшены
        handleOptionClick,
        handleMultiSelectConfirm,
        handleUserResponse,
        handlePhotoUpload,
        handleFinishOnboarding,
        handleConfirmProfile,
        router,
    };
}
