/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import { authService } from "@/services/api";
import { wsService } from "@/services/websocket";
import { Gift, Star, X, Send, MessageSquare, EyeOff, Loader2, Check, Sparkles } from "lucide-react";
import { GiftCatalog } from "./GiftCatalog";
import styles from "./SendGiftModal.module.css";

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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handleWsMessage = (data: any) => {
            if (data.type === "gift_sent_success") {
                // Heuristic match
                if (selectedGift && data.gift_id === selectedGift.id) {
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
            setError((err as Error).message || "Failed to send gift");
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
        <div className={styles.overlay} onClick={handleClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerContent}>
                        <Gift size={20} />
                        <h2>
                            {step === "catalog" && "Send a Gift"}
                            {step === "confirm" && "Confirm Gift"}
                            {step === "success" && "Gift Sent!"}
                        </h2>
                    </div>
                    <button className={styles.closeButton} onClick={handleClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Receiver Info */}
                {step !== "success" && (
                    <div className={styles.receiverInfo}>
                        <div className={styles.receiverAvatar}>
                            {receiverPhoto ? (
                                <img src={receiverPhoto} alt={receiverName} />
                            ) : (
                                <div className={styles.avatarPlaceholder}>
                                    {receiverName.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                        <span>Sending to <strong>{receiverName}</strong></span>
                    </div>
                )}

                {/* Content */}
                <div className={styles.content}>
                    {step === "catalog" && (
                        <GiftCatalog onGiftSelect={handleGiftSelect} receiverId={receiverId} />
                    )}

                    {step === "confirm" && selectedGift && (
                        <div className={styles.confirmContent}>
                            {/* Selected Gift Preview */}
                            <div className={`${styles.giftPreview} ${selectedGift.is_premium ? styles.premium : ""}`}>
                                <div className={styles.giftPreviewEmoji}>
                                    {getGiftEmoji(selectedGift.name)}
                                </div>
                                <div className={styles.giftPreviewInfo}>
                                    <h3>{selectedGift.name}</h3>
                                    {selectedGift.description && (
                                        <p>{selectedGift.description}</p>
                                    )}
                                    <div className={styles.giftPrice}>
                                        <Star size={14} className={styles.starIcon} />
                                        {selectedGift.price} {selectedGift.currency}
                                    </div>
                                </div>
                                {selectedGift.is_premium && (
                                    <div className={styles.premiumTag}>
                                        <Sparkles size={12} />
                                        Premium
                                    </div>
                                )}
                            </div>


                            {/* Payment Method */}
                            <div className={styles.messageSection} style={{ marginBottom: '15px' }}>
                                <label className={styles.label}>
                                    <Star size={16} />
                                    Payment Method
                                </label>
                                <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: 'white' }}>
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            value="balance"
                                            checked={paymentMethod === 'balance'}
                                            onChange={() => setPaymentMethod('balance')}
                                            style={{ accentColor: '#E91E63' }}
                                        />
                                        <span>Use Balance</span>
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: 'white' }}>
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            value="stars"
                                            checked={paymentMethod === 'stars'}
                                            onChange={() => setPaymentMethod('stars')}
                                            style={{ accentColor: '#E91E63' }}
                                        />
                                        <span>Telegram Stars</span>
                                    </label>
                                </div>
                            </div>

                            <div className={styles.messageSection}>
                                <label className={styles.label}>
                                    <MessageSquare size={16} />
                                    Add a message (optional)
                                </label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Write something special..."
                                    maxLength={500}
                                    className={styles.messageInput}
                                />
                                <span className={styles.charCount}>{message.length}/500</span>
                            </div>

                            {/* Anonymous Toggle */}
                            <label className={styles.anonymousToggle}>
                                <input
                                    type="checkbox"
                                    checked={isAnonymous}
                                    onChange={(e) => setIsAnonymous(e.target.checked)}
                                />
                                <div className={styles.toggleTrack}>
                                    <div className={styles.toggleThumb}></div>
                                </div>
                                <EyeOff size={16} />
                                <span>Send anonymously</span>
                            </label>

                            {error && (
                                <div className={styles.errorMessage}>
                                    {error}
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className={styles.actions}>
                                <button
                                    className={styles.backButton}
                                    onClick={() => setStep("catalog")}
                                    disabled={sending}
                                >
                                    Back
                                </button>
                                <button
                                    className={styles.sendButton}
                                    onClick={handleSendGift}
                                    disabled={sending}
                                >
                                    {sending ? (
                                        <>
                                            <Loader2 size={18} className={styles.spinner} />
                                            {paymentMethod === 'balance' ? 'Sending...' : 'Creating Invoice...'}
                                        </>
                                    ) : (
                                        <>
                                            <Send size={18} />
                                            {paymentMethod === 'balance' ? (
                                                `Send Gift • ${selectedGift.price}`
                                            ) : (
                                                `Pay ${selectedGift.price} Stars`
                                            )}
                                            <Star size={12} />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === "success" && selectedGift && (
                        <div className={styles.successContent}>
                            <div className={styles.successAnimation}>
                                <div className={styles.successIcon}>
                                    <Check size={48} />
                                </div>
                                <div className={styles.confetti}></div>
                            </div>
                            <div className={styles.successGift}>
                                {getGiftEmoji(selectedGift.name)}
                            </div>
                            <h3>Gift Sent Successfully!</h3>
                            <p>
                                Your <strong>{selectedGift.name}</strong> has been sent to{" "}
                                <strong>{receiverName}</strong>
                                {isAnonymous && " anonymously"}
                            </p>
                            <button className={styles.doneButton} onClick={handleClose}>
                                Done
                            </button>
                        </div>
                    )}

                    {step === "waiting_payment" && (
                        <div className={styles.successContent}>
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                                <Loader2 size={48} className={styles.spinner} color="#E91E63" />
                            </div>
                            <h3>Waiting for Payment...</h3>
                            <p>Please complete the payment in the Telegram window.</p>
                            <p style={{ fontSize: 13, opacity: 0.7, marginTop: 15, background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '8px' }}>
                                Do not close this window. We will update it automatically once payment is confirmed.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
