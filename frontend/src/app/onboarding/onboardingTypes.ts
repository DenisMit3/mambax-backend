// --- Типы и константы онбординга ---

export interface Message {
    id: string;
    text: string;
    isAI: boolean;
    type?: 'text' | 'number' | 'image' | 'options' | 'photo_upload';
    options?: string[];
    content?: string;
    multiSelect?: boolean;
    layoutType?: 'chip' | 'card';
}

export interface PhotoData {
    file: File;
    preview: string; // Object URL для отображения
}

export interface UserData {
    name: string;
    gender: 'male' | 'female';
    age: number;
    interests: string[];
    bio: string;
    photos: PhotoData[];
    details: Record<string, string>;
}

export type FlowStepType = 'text' | 'number' | 'options' | 'photo_upload' | 'image';

export interface FlowStep {
    id: string;
    label: string;
    q: string;
    type: FlowStepType;
    options?: string[];
    multiSelect?: boolean;
    layoutType?: 'chip' | 'card';
}

// --- Шаги онбординга ---
export const FLOW_STEPS: FlowStep[] = [
    { id: 'name', label: "Имя", q: "Привет! 👋 Я MambaX AI. Как тебя зовут?", type: 'text' },
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

// --- Хелпер: эмодзи для опций ---
export const getEmojiForOption = (option: string): string => {
    if (option.includes('Мужчина')) return '👨';
    if (option.includes('Женщина')) return '👩';
    if (option.includes('Отношения')) return '💍';
    if (option.includes('Свидания')) return '🍷';
    if (option.includes('Флирт')) return '🔥';
    if (option.includes('Дружба')) return '🤝';
    if (option.includes('Пока смотрю')) return '👀';
    return '✨';
};
