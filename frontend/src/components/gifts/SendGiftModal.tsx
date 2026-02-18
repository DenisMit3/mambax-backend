"use client";

import Image from 'next/image';
import { useState, useEffect } from "react";
import { authService } from "@/services/api";
import { wsService } from "@/services/websocket";
import { Gift, Star, X, Send, MessageSquare, EyeOff, Loader2, Check, Sparkles } from "lucide-react";
import { useHaptic } from "@/hooks/useHaptic";
import { ToggleSwitch } from "../ui/ToggleSwitch";
import dynamic from 'next/dynamic';

const GiftCatalog = dynamic(() => import("./GiftCatalog").then(mod => mod.GiftCatalog), {
    loading: () => <div className="h-[400px] flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>
});

interface VirtualGift {
    id: string;
    name: string;
    description: string | null;
    image_url: string;
    price: number;
    currency: string;
    is_animated: boolean;
    is_premium: boolean;
}

interface SendGiftModalProps {
    isOpen: boolean;
    onClose: () => void;
    receiverId: string;
    receiverName?: string;
    receiverPhoto?: string;
    onGiftSent?: (transaction: unknown) => void;
}

type ModalStep = "catalog" | "confirm" | "success" | "waiting_payment";

export function SendGiftModal({
    isOpen,
    onClose,
    receiverId,
    receiverName = "User",
    receiverPhoto,
    onGiftSent
}: SendGiftModalProps) {
    const haptic = useHaptic();
    const [step, setStep] = useState<ModalStep>("catalog");
    const [selectedGift, setSelectedGift] = useState<VirtualGift | null>(null);
    const [message, setMessage] = useState("");
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'balance' | 'stars'>('balance');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");

    const handleGiftSelect = (gift: VirtualGift) => {
        setSelectedGift(gift);
        setStep("confirm");
    };

    useEffect(() => {
        if (step !== "waiting_payment") return;

        const handleWsMessage = (data: { type?: string; gift_id?: string; [key: string]: unknown }) => {
            if (data.type === "gift_sent_success") {
                // Heuristic match
                if (selectedGift && data.gift_id === selectedGift.id) {
                    haptic.success();
                    setStep("success");
                    if (onGiftSent) onGiftSent(data);
                }
            }
        };

        wsService.on("message", handleWsMessage);
        return () => wsService.off("message", handleWsMessage);
    }, [step, selectedGift, onGiftSent]);

    if (!isOpen) return null;

    const handleSendGift = async () => {
        if (!selectedGift) return;

        try {
            setSending(true);
            setError("");

            if (paymentMethod === 'balance') {
                const result = await authService.sendGift(
                    selectedGift.id,
                    receiverId,
                    message || undefined,
                    isAnonymous
                );

                haptic.success();
                setStep("success");

                if (onGiftSent) {
                    onGiftSent(result);
                }
            } else {
                const result = await authService.sendGiftDirectPurchase(
                    selectedGift.id,
                    receiverId,
                    message || undefined,
                    isAnonymous
                );

                if (result.invoice_link) {
                    window.open(result.invoice_link, '_blank');
                    setStep('waiting_payment');
                }
            }
        } catch (err) {
            haptic.error();
            setError("Не удалось отправить подарок");
        } finally {
            setSending(false);
        }
    };

    const handleClose = () => {
        setStep("catalog");
        setSelectedGift(null);
        setMessage("");
        setIsAnonymous(false);
        setError("");
        onClose();
    };

    const getGiftEmoji = (name: string) => {
        const emojiMap: { [key: string]: string } = {
            "Red Rose": "🌹",
            "Heart Balloon": "🎈",
            "Teddy Bear": "🧸",
            "Diamond Ring": "💍",
            "Party Popper": "🎉",
            "Star": "⭐",
            "Champagne": "🍾",
            "Chocolate Box": "🍫",
        };
        return emojiMap[name] || "🎁";
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-5 z-[100]" onClick={handleClose}>
            <div className="w-full max-w-[480px] max-h-[90dvh] bg-background rounded-[24px] overflow-hidden flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-gradient-to-br from-primary/10 to-accent/5">
                    <div className="flex items-center gap-2.5">
                        <Gift size={20} className="text-primary" />
                        <h2 className="m-0 text-lg font-semibold text-foreground">
                            {step === "catalog" && "Отправить подарок"}
                            {step === "confirm" && "Подтвердить подарок"}
                            {step === "success" && "Подарок отправлен!"}
                        </h2>
                    </div>
                    <button className="w-9 h-9 rounded-full border-none bg-surface text-muted-foreground flex items-center justify-center cursor-pointer transition-all hover:bg-border hover:text-foreground" onClick={handleClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Receiver Info */}
                {step !== "success" && (
                    <div className="flex items-center gap-3 px-5 py-3 bg-surface text-sm text-muted-foreground">
                        <div className="w-9 h-9 rounded-full overflow-hidden">
                            {receiverPhoto ? (
                                <Image src={receiverPhoto} alt={receiverName} loading="lazy" className="w-full h-full object-cover" width={48} height={48} />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-accent text-white font-semibold">
                                    {receiverName.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                        <span>Отправка для <strong className="text-foreground">{receiverName}</strong></span>
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto max-h-[60vh]">
                    {step === "catalog" && (
                        <GiftCatalog onGiftSelect={handleGiftSelect} receiverId={receiverId} />
                    )}

                    {step === "confirm" && selectedGift && (
                        <div className="p-5 flex flex-col gap-5">
                            {/* Selected Gift Preview */}
                            <div className={`relative flex items-center gap-4 p-5 rounded-2xl bg-surface overflow-hidden ${selectedGift.is_premium ? "bg-gradient-to-br from-yellow-500/15 to-orange-500/8 border border-yellow-500/30" : ""}`}>
                                <div className="text-[56px] leading-none">
                                    {getGiftEmoji(selectedGift.name)}
                                </div>
                                <div className="flex-1">
                                    <h3 className="m-0 mb-1.5 text-lg font-semibold text-foreground">{selectedGift.name}</h3>
                                    {selectedGift.description && (
                                        <p className="m-0 mb-2 text-[13px] text-muted-foreground">{selectedGift.description}</p>
                                    )}
                                    <div className="flex items-center gap-1 text-base font-bold text-primary">
                                        <Star size={14} className="text-[#FFD700]" />
                                        {selectedGift.price} {selectedGift.currency}
                                    </div>
                                </div>
                                {selectedGift.is_premium && (
                                    <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 text-black text-[11px] font-semibold">
                                        <Sparkles size={12} />
                                        Премиум
                                    </div>
                                )}
                            </div>


                            {/* Payment Method */}
                            <div className="flex flex-col gap-2 mb-4">
                                <label className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
                                    <Star size={16} />
                                    Способ оплаты
                                </label>
                                <div className="flex gap-4 mt-2.5">
                                    <label className="flex items-center gap-2 cursor-pointer text-sm text-foreground">
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            value="balance"
                                            checked={paymentMethod === 'balance'}
                                            onChange={() => setPaymentMethod('balance')}
                                            className="accent-primary"
                                        />
                                        <span>С баланса</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer text-sm text-foreground">
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            value="stars"
                                            checked={paymentMethod === 'stars'}
                                            onChange={() => setPaymentMethod('stars')}
                                            className="accent-primary"
                                        />
                                        <span>Telegram Stars</span>
                                    </label>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
                                    <MessageSquare size={16} />
                                    Добавить сообщение (необязательно)
                                </label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Напишите что-нибудь особенное..."
                                    maxLength={500}
                                    className="w-full min-h-[80px] p-3 rounded-xl border border-border bg-surface text-foreground text-sm resize-y outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
                                />
                                <span className="self-end text-[11px] text-muted-foreground">{message.length}/500</span>
                            </div>

                            {/* Anonymous Toggle */}
                            <div className="bg-surface rounded-xl px-2">
                                <ToggleSwitch
                                    label="Отправить анонимно"
                                    checked={isAnonymous}
                                    onChange={setIsAnonymous}
                                    description="Получатель не увидит, кто отправил подарок"
                                />
                            </div>

                            {error && (
                                <div className="p-3 px-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-[13px]">
                                    {error}
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-3 mt-2">
                                <button
                                    className="flex-1 py-3.5 px-5 rounded-xl border border-border bg-transparent text-muted-foreground text-sm font-medium cursor-pointer transition-all hover:bg-surface hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={() => setStep("catalog")}
                                    disabled={sending}
                                >
                                    Назад
                                </button>
                                <button
                                    className="flex-[2] flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl border-none bg-gradient-to-br from-primary to-accent text-white text-sm font-semibold cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(233,30,99,0.4)] disabled:opacity-70 disabled:cursor-not-allowed"
                                    onClick={handleSendGift}
                                    disabled={sending}
                                >
                                    {sending ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            {paymentMethod === 'balance' ? 'Отправка...' : 'Создание счёта...'}
                                        </>
                                    ) : (
                                        <>
                                            <Send size={18} />
                                            {paymentMethod === 'balance' ? (
                                                `Отправить • ${selectedGift.price}`
                                            ) : (
                                                `Оплатить ${selectedGift.price} Stars`
                                            )}
                                            <Star size={12} />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === "success" && selectedGift && (
                        <div className="flex flex-col items-center text-center p-10 px-5">
                            <div className="relative mb-5">
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white animate-in zoom-in duration-500">
                                    <Check size={48} />
                                </div>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120px] h-[120px] bg-radial-gradient-yellow animate-confetti pointer-events-none opacity-0"></div>
                            </div>
                            <div className="text-[64px] mb-5 animate-bounce">
                                {getGiftEmoji(selectedGift.name)}
                            </div>
                            <h3 className="m-0 mb-3 text-[22px] font-semibold text-foreground">Подарок успешно отправлен!</h3>
                            <p className="m-0 mb-6 text-sm text-muted-foreground leading-relaxed">
                                Ваш подарок <strong className="text-foreground">{selectedGift.name}</strong> отправлен для{" "}
                                <strong className="text-foreground">{receiverName}</strong>
                                {isAnonymous && " анонимно"}
                            </p>
                            <button className="w-full max-w-[200px] py-3.5 px-7 rounded-xl border-none bg-gradient-to-br from-primary to-accent text-white text-[15px] font-semibold cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(233,30,99,0.4)]" onClick={handleClose}>
                                Готово
                            </button>
                        </div>
                    )}

                    {step === "waiting_payment" && (
                        <div className="flex flex-col items-center text-center p-10 px-5">
                            <div className="flex justify-center mb-5">
                                <Loader2 size={48} className="animate-spin text-primary" />
                            </div>
                            <h3 className="m-0 mb-3 text-[22px] font-semibold text-foreground">Ожидание оплаты...</h3>
                            <p className="m-0 mb-6 text-sm text-muted-foreground leading-relaxed">Пожалуйста, завершите оплату в окне Telegram.</p>
                            <p className="text-[13px] opacity-70 mt-4 bg-white/10 p-2.5 rounded-lg">
                                Не закрывайте это окно. Мы обновим его автоматически после подтверждения оплаты.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
