'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Heart, Brain } from 'lucide-react';

import { useTelegram } from '@/lib/telegram';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { GlassCard } from '@/components/ui/GlassCard';

interface Message {
    id: string;
    text: string;
    isAI: boolean;
    timestamp: Date;
    typing?: boolean;
}

interface PersonalityTrait {
    id: string;
    name: string;
    description: string;
    icon: string;
    score: number;
}

interface AIPersonalityChatProps {
    onComplete: (personality: PersonalityTrait[]) => void;
}

const AI_QUESTIONS = [
    {
        id: 1,
        text: "Привет! Я ваш AI-помощник в поиске идеального партнера. Давайте узнаем друг друга лучше! Что для вас важнее всего в отношениях?",
        options: ["Честность и доверие", "Общие интересы", "Физическая привлекательность", "Чувство юмора"]
    },
    {
        id: 2,
        text: "Отлично! А как вы предпочитаете проводить идеальный вечер?",
        options: ["Дома с фильмом", "В ресторане", "На природе", "В клубе или на вечеринке"]
    },
    {
        id: 3,
        text: "Интересно! Что вас больше всего привлекает в людях?",
        options: ["Интеллект", "Доброта", "Амбициозность", "Спонтанность"]
    },
    {
        id: 4,
        text: "Понятно! А как вы относитесь к долгосрочным отношениям?",
        options: ["Ищу серьезные отношения", "Открыт к возможностям", "Предпочитаю легкое общение", "Пока не определился"]
    }
];

export const AIPersonalityChat = ({ onComplete }: AIPersonalityChatProps) => {
    const { hapticFeedback } = useTelegram();
    const [messages, setMessages] = useState<Message[]>([]);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [isTyping, setIsTyping] = useState(false);
    const [answers, setAnswers] = useState<string[]>([]);
    const [showOptions, setShowOptions] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const initialMessageSent = useRef(false);

    useEffect(() => {
        // Start with AI introduction (only once)
        if (initialMessageSent.current) return;
        initialMessageSent.current = true;

        setTimeout(() => {
            addAIMessage(AI_QUESTIONS[0].text);
        }, 1000);
    }, []);

    const addAIMessage = (text: string) => {
        setIsTyping(true);

        setTimeout(() => {
            const newMessage: Message = {
                id: Date.now().toString(),
                text,
                isAI: true,
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, newMessage]);
            setIsTyping(false);
            setShowOptions(true);
            hapticFeedback.light();
        }, 1500);
    };

    const addUserMessage = (text: string) => {
        const newMessage: Message = {
            id: Date.now().toString(),
            text,
            isAI: false,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, newMessage]);
        setAnswers(prev => [...prev, text]);
        setShowOptions(false);
        hapticFeedback.medium();

        // Move to next question or complete
        setTimeout(() => {
            if (currentQuestion < AI_QUESTIONS.length - 1) {
                setCurrentQuestion(prev => prev + 1);
                addAIMessage(AI_QUESTIONS[currentQuestion + 1].text);
            } else {
                completePersonalityAnalysis();
            }
        }, 1000);
    };

    const completePersonalityAnalysis = () => {
        setIsTyping(true);

        setTimeout(() => {
            const analysisMessage = "Отлично! Анализирую ваши ответы... Готово! Ваш персональный профиль создан. Теперь я смогу находить для вас наиболее совместимых людей! ✨";

            const newMessage: Message = {
                id: Date.now().toString(),
                text: analysisMessage,
                isAI: true,
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, newMessage]);
            setIsTyping(false);

            // Generate personality traits based on answers
            const personality = generatePersonality(answers);

            setTimeout(() => {
                onComplete(personality);
            }, 2000);
        }, 2000);
    };

    const generatePersonality = (userAnswers: string[]): PersonalityTrait[] => {
        // Simple personality generation based on answers
        return [
            {
                id: 'romantic',
                name: 'Романтичность',
                description: 'Вы цените романтические жесты и глубокие эмоциональные связи',
                icon: '💕',
                score: Math.floor(Math.random() * 30) + 70
            },
            {
                id: 'adventurous',
                name: 'Ава��тюризм',
                description: 'Вы открыты новым приключениям и спонтанным решениям',
                icon: '🌟',
                score: Math.floor(Math.random() * 40) + 60
            },
            {
                id: 'intellectual',
                name: 'Интеллектуальность',
                description: 'Вы цените глубокие разговоры и интеллектуальную совместимость',
                icon: '🧠',
                score: Math.floor(Math.random() * 35) + 65
            },
            {
                id: 'social',
                name: 'Социальность',
                description: 'Вы легко находите общий язык с людьми и любите общение',
                icon: '🎭',
                score: Math.floor(Math.random() * 25) + 75
            }
        ];
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Messages - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                <AnimatePresence>
                    {messages.map((message, index) => (
                        <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{
                                duration: 0.4,
                                delay: index * 0.1,
                                ease: 'easeOut'
                            }}
                            className={`flex ${message.isAI ? 'justify-start' : 'justify-end'}`}
                        >
                            <div className={`max-w-[80%] ${message.isAI ? 'order-2' : 'order-1'}`}>
                                <GlassCard
                                    className={`p-4 ${message.isAI
                                        ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20'
                                        : 'bg-gradient-to-r from-orange-500/20 to-red-500/20'
                                        }`}
                                    hover={false}
                                >
                                    <p className="text-white text-sm leading-relaxed">
                                        {message.text}
                                    </p>
                                </GlassCard>
                            </div>

                            {message.isAI && (
                                <motion.div
                                    className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center order-1 mr-3 mt-auto"
                                    animate={{ rotate: [0, 360] }}
                                    transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                                >
                                    <Sparkles className="w-4 h-4 text-white" />
                                </motion.div>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Typing Indicator */}
                <AnimatePresence>
                    {isTyping && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="flex justify-start"
                        >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center mr-3">
                                <Sparkles className="w-4 h-4 text-white" />
                            </div>
                            <GlassCard className="p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20" hover={false}>
                                <div className="flex space-x-1">
                                    {[0, 1, 2].map((i) => (
                                        <motion.div
                                            key={i}
                                            className="w-2 h-2 bg-white rounded-full"
                                            animate={{
                                                scale: [1, 1.5, 1],
                                                opacity: [0.5, 1, 0.5]
                                            }}
                                            transition={{
                                                duration: 1,
                                                repeat: Infinity,
                                                delay: i * 0.2
                                            }}
                                        />
                                    ))}
                                </div>
                            </GlassCard>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div ref={messagesEndRef} />
            </div>

            {/* Options */}
            <AnimatePresence>
                {showOptions && currentQuestion < AI_QUESTIONS.length && (
                    <motion.div
                        className="p-3 pb-6 border-t border-white/10 shrink-0"
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                    >
                        <div className="grid grid-cols-1 gap-2">
                            {AI_QUESTIONS[currentQuestion].options.map((option, index) => (
                                <motion.div
                                    key={option}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1, duration: 0.3 }}
                                >
                                    <AnimatedButton
                                        variant="secondary"
                                        className="w-full text-left justify-start py-3 px-4 whitespace-normal"
                                        onClick={() => addUserMessage(option)}
                                    >
                                        <span className="mr-2 shrink-0">💭</span>
                                        <span className="text-sm leading-tight">{option}</span>
                                    </AnimatedButton>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
