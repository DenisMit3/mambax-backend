"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Bug,
  Lightbulb,
  Star,
  Send,
  ArrowLeft,
  Check,
  AlertCircle,
} from "lucide-react";
import { authService } from "@/services/api";
import { useHaptic } from "@/hooks/useHaptic";
import { useRequireAuth } from "@/hooks/useRequireAuth";

// Типы обратной связи
const feedbackTypes = [
  { id: "bug", label: "Баг-репорт", icon: Bug, color: "text-red-400" },
  { id: "feature", label: "Предложение", icon: Lightbulb, color: "text-yellow-400" },
  { id: "general", label: "Отзыв", icon: MessageSquare, color: "text-purple-400" },
  { id: "complaint", label: "Жалоба", icon: AlertCircle, color: "text-orange-400" },
];

export default function FeedbackPage() {
  const router = useRouter();
  const haptic = useHaptic();
  const { isAuthed, isChecking } = useRequireAuth();

  const [type, setType] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const isValid = type && message.trim().length >= 10;

  const handleSubmit = async () => {
    if (!isValid || loading) return;
    setLoading(true);
    setError("");
    haptic.medium();

    try {
      const res = await authService.submitFeedback({
        type,
        message: message.trim(),
        ...(rating > 0 && { rating }),
      });

      if (res.success) {
        haptic.success();
        setSubmitted(true);
      } else {
        setError(res.message || "Не удалось отправить");
        haptic.error();
      }
    } catch {
      setError("Ошибка сети. Попробуйте позже.");
      haptic.error();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-black text-white">
      {/* Шапка */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => { haptic.light(); router.back(); }}
            className="p-2 -ml-2 rounded-xl hover:bg-white/5 transition-colors"
            aria-label="Назад"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">Обратная связь</h1>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {submitted ? (
          /* Экран успеха */
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center px-6 pt-32 gap-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"
            >
              <Check className="w-10 h-10 text-white" />
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xl font-semibold text-center"
            >
              Спасибо за отзыв!
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-sm text-slate-400 text-center"
            >
              Мы обязательно его рассмотрим
            </motion.p>
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              onClick={() => router.back()}
              className="mt-4 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 transition-colors text-sm font-medium"
            >
              Вернуться
            </motion.button>
          </motion.div>
        ) : (
          /* Форма */
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="px-4 py-6 space-y-6 max-w-lg mx-auto"
          >
            {/* Тип обращения */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-300">Тип обращения</label>
              <div className="grid grid-cols-2 gap-2">
                {feedbackTypes.map((ft) => {
                  const Icon = ft.icon;
                  const selected = type === ft.id;
                  return (
                    <motion.button
                      key={ft.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => { setType(ft.id); haptic.selection(); }}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all text-left text-sm font-medium ${
                        selected
                          ? "border-purple-500/60 bg-purple-500/10 text-white"
                          : "border-white/10 bg-slate-950 text-slate-400 hover:border-white/20"
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${selected ? ft.color : ""}`} />
                      {ft.label}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Рейтинг */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-300">
                Оценка <span className="text-slate-500">(необязательно)</span>
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <motion.button
                    key={star}
                    whileTap={{ scale: 0.8 }}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => {
                      setRating(star === rating ? 0 : star);
                      haptic.light();
                    }}
                    className="p-1"
                    aria-label={`${star} звёзд`}
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        star <= (hoverRating || rating)
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-slate-700"
                      }`}
                    />
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Сообщение */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-300">Сообщение</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                    placeholder="Опишите подробнее (мин. 10 символов)..."
                    autoCapitalize="sentences"
                    enterKeyHint="send"
                rows={5}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/30 resize-none transition-all"
              />
              <p className={`text-xs ${message.trim().length >= 10 ? "text-slate-500" : "text-slate-600"}`}>
                {message.trim().length}/10 мин. символов
              </p>
            </div>

            {/* Ошибка */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 rounded-xl px-4 py-3"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Кнопка отправки */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSubmit}
              disabled={!isValid || loading}
              className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-all ${
                isValid && !loading
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90"
                  : "bg-white/5 text-slate-600 cursor-not-allowed"
              }`}
            >
              {loading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Отправить
                </>
              )}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
