"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronDown, ChevronRight, MessageCircle, Mail, Shield, CreditCard, Heart, UserX, Camera, HelpCircle, Send, CheckCircle } from "lucide-react";
import { authService } from "@/services/api";


const FAQ_CATEGORIES = [
    {
        id: "account",
        icon: Shield,
        title: "Аккаунт и безопасность",
        color: "text-cyan-400",
        bg: "bg-cyan-500/20",
        items: [
            { q: "Как верифицировать профиль?", a: "Перейдите в Профиль → Безопасность → Верификация. Сделайте селфи с жестом, который покажет система. Проверка занимает до 24 часов." },
            { q: "Как удалить аккаунт?", a: "Настройки → Прокрутите вниз → Удалить аккаунт. Данные будут удалены в течение 30 дней. Это действие необратимо." },
            { q: "Как изменить номер телефона?", a: "Настройки → Аккаунт → Изменить номер. Потребуется подтверждение через SMS на оба номера." },
        ],
    },
    {
        id: "matches",
        icon: Heart,
        title: "Знакомства и матчи",
        color: "text-pink-400",
        bg: "bg-pink-500/20",
        items: [
            { q: "Как работают свайпы?", a: "Свайп вправо — лайк, влево — пропуск. Если оба поставили лайк — это матч! Бесплатно доступно 10 свайпов в день." },
            { q: "Что такое суперлайк?", a: "Суперлайк показывает человеку, что вы особенно заинтересованы. Ваш профиль будет выделен синей звездой." },
            { q: "Как работает буст?", a: "Буст поднимает ваш профиль в топ ленты на 30 минут. Вы получите в 10 раз больше просмотров." },
        ],
    },
    {
        id: "payments",
        icon: CreditCard,
        title: "Оплата и подписки",
        color: "text-amber-400",
        bg: "bg-amber-500/20",
        items: [
            { q: "Как купить звёзды?", a: "Нажмите на баланс звёзд в верхней части экрана или перейдите в Профиль → Пополнить. Оплата через Telegram Stars." },
            { q: "Как отменить подписку?", a: "Настройки → Подписка → Отменить. Доступ сохранится до конца оплаченного периода." },
            { q: "Возврат средств", a: "Возврат возможен в течение 48 часов после покупки, если услуга не была использована. Напишите в поддержку." },
        ],
    },
    {
        id: "safety",
        icon: UserX,
        title: "Жалобы и блокировки",
        color: "text-red-400",
        bg: "bg-red-500/20",
        items: [
            { q: "Как заблокировать пользователя?", a: "Откройте профиль → нажмите ⋯ → Заблокировать. Пользователь не узнает о блокировке и не сможет вас найти." },
            { q: "Как пожаловаться?", a: "Откройте профиль → нажмите ⋯ → Пожаловаться. Выберите причину. Модерация рассмотрит жалобу в течение 24 часов." },
            { q: "Меня заблокировали по ошибке", a: "Если вы считаете, что блокировка ошибочна, напишите в поддержку с описанием ситуации." },
        ],
    },
    {
        id: "photos",
        icon: Camera,
        title: "Фото и профиль",
        color: "text-purple-400",
        bg: "bg-purple-500/20",
        items: [
            { q: "Требования к фото", a: "Минимум 1 фото. Лицо должно быть чётко видно. Запрещены: групповые фото как главное, фото с детьми, обнажённые фото." },
            { q: "Как добавить больше фото?", a: "Профиль → Редактировать → нажмите + для добавления. Максимум 6 фото." },
        ],
    },
];

const TICKET_CATEGORIES = ["Баг/ошибка", "Оплата", "Блокировка", "Верификация", "Другое"];

export default function HelpPage() {
    const router = useRouter();
    const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
    const [expandedItem, setExpandedItem] = useState<string | null>(null);
    const [showTicket, setShowTicket] = useState(false);
    const [ticketCategory, setTicketCategory] = useState(TICKET_CATEGORIES[0]);
    const [ticketSubject, setTicketSubject] = useState("");
    const [ticketMessage, setTicketMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmitTicket = async () => {
        if (!ticketSubject.trim() || !ticketMessage.trim()) return;
        setSending(true);
        try {
            await authService.createSupportTicket({
                subject: ticketSubject,
                message: ticketMessage,
                category: ticketCategory,
            });
            setSent(true);
            setTimeout(() => {
                setShowTicket(false);
                setSent(false);
                setTicketSubject("");
                setTicketMessage("");
            }, 2000);
        } catch (e) {
            console.error(e);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white pb-24">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5">
                <div className="flex items-center gap-4 px-4 py-4">
                    <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-lg font-bold">Помощь</h1>
                </div>
            </div>

            <div className="px-4 py-6 space-y-6">
                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => setShowTicket(true)}
                        className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-500/20 text-left group hover:border-blue-500/40 transition"
                    >
                        <MessageCircle size={24} className="text-blue-400 mb-2 group-hover:scale-110 transition" />
                        <div className="text-sm font-bold">Написать</div>
                        <div className="text-xs text-slate-500">в поддержку</div>
                    </button>
                    <button
                        onClick={() => router.push("/feedback")}
                        className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/10 border border-purple-500/20 text-left group hover:border-purple-500/40 transition"
                    >
                        <Mail size={24} className="text-purple-400 mb-2 group-hover:scale-110 transition" />
                        <div className="text-sm font-bold">Отзыв</div>
                        <div className="text-xs text-slate-500">о приложении</div>
                    </button>
                </div>

                {/* FAQ */}
                <div>
                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Частые вопросы</h2>
                    <div className="space-y-2">
                        {FAQ_CATEGORIES.map((cat) => {
                            const Icon = cat.icon;
                            const isExpanded = expandedFaq === cat.id;
                            return (
                                <div key={cat.id} className="rounded-2xl bg-white/5 overflow-hidden">
                                    <button
                                        onClick={() => setExpandedFaq(isExpanded ? null : cat.id)}
                                        className="w-full flex items-center gap-3 p-4 hover:bg-white/5 transition"
                                    >
                                        <div className={`w-9 h-9 rounded-full ${cat.bg} flex items-center justify-center flex-shrink-0`}>
                                            <Icon size={16} className={cat.color} />
                                        </div>
                                        <span className="flex-1 text-left text-sm font-semibold">{cat.title}</span>
                                        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                            <ChevronDown size={16} className="text-slate-500" />
                                        </motion.div>
                                    </button>

                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="px-4 pb-3 space-y-1">
                                                    {cat.items.map((item, idx) => {
                                                        const itemKey = `${cat.id}-${idx}`;
                                                        const isItemExpanded = expandedItem === itemKey;
                                                        return (
                                                            <div key={idx}>
                                                                <button
                                                                    onClick={() => setExpandedItem(isItemExpanded ? null : itemKey)}
                                                                    className="w-full flex items-center gap-2 py-2.5 text-left"
                                                                >
                                                                    <HelpCircle size={14} className="text-slate-600 flex-shrink-0" />
                                                                    <span className="flex-1 text-sm text-slate-300">{item.q}</span>
                                                                    <ChevronRight size={14} className={`text-slate-600 transition ${isItemExpanded ? "rotate-90" : ""}`} />
                                                                </button>
                                                                <AnimatePresence>
                                                                    {isItemExpanded && (
                                                                        <motion.p
                                                                            initial={{ height: 0, opacity: 0 }}
                                                                            animate={{ height: "auto", opacity: 1 }}
                                                                            exit={{ height: 0, opacity: 0 }}
                                                                            className="text-xs text-slate-500 pl-6 pb-2 leading-relaxed overflow-hidden"
                                                                        >
                                                                            {item.a}
                                                                        </motion.p>
                                                                    )}
                                                                </AnimatePresence>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Support Ticket Modal */}
            <AnimatePresence>
                {showTicket && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center"
                        onClick={() => !sending && setShowTicket(false)}
                    >
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-md bg-slate-900 rounded-t-3xl p-6 border-t border-white/10 max-h-[80vh] overflow-y-auto"
                        >
                            {sent ? (
                                <div className="flex flex-col items-center py-8">
                                    <CheckCircle size={48} className="text-green-400 mb-4" />
                                    <h3 className="text-lg font-bold mb-1">Отправлено</h3>
                                    <p className="text-sm text-slate-500">Мы ответим в течение 24 часов</p>
                                </div>
                            ) : (
                                <>
                                    <h3 className="text-lg font-bold mb-4">Написать в поддержку</h3>

                                    {/* Category */}
                                    <div className="mb-4">
                                        <label className="text-xs text-slate-500 mb-1.5 block">Категория</label>
                                        <div className="flex flex-wrap gap-2">
                                            {TICKET_CATEGORIES.map((c) => (
                                                <button
                                                    key={c}
                                                    onClick={() => setTicketCategory(c)}
                                                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                                                        ticketCategory === c
                                                            ? "bg-white/20 text-white"
                                                            : "bg-white/5 text-slate-500"
                                                    }`}
                                                >
                                                    {c}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Subject */}
                                    <div className="mb-4">
                                        <label className="text-xs text-slate-500 mb-1.5 block">Тема</label>
                                        <input
                                            value={ticketSubject}
                                            onChange={(e) => setTicketSubject(e.target.value)}
                                            placeholder="Кратко опишите проблему"
                                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-white/20"
                                        />
                                    </div>

                                    {/* Message */}
                                    <div className="mb-6">
                                        <label className="text-xs text-slate-500 mb-1.5 block">Сообщение</label>
                                        <textarea
                                            value={ticketMessage}
                                            onChange={(e) => setTicketMessage(e.target.value)}
                                            placeholder="Подробно опишите что произошло..."
                                            rows={4}
                                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-white/20 resize-none"
                                        />
                                    </div>

                                    <button
                                        onClick={handleSubmitTicket}
                                        disabled={sending || !ticketSubject.trim() || !ticketMessage.trim()}
                                        className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-transform"
                                    >
                                        <Send size={16} />
                                        {sending ? "Отправка..." : "Отправить"}
                                    </button>
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}
