"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Copy, Share2, Gift, Users, Star, ArrowLeft, Check, Loader2 } from "lucide-react";
import { authService } from "@/services/api";
import { useHaptic } from "@/hooks/useHaptic";

// Типы ответов API
interface ReferralCode {
  code: string;
  link: string;
  reward: string;
}

interface ReferralStats {
  total_referrals: number;
  earned_stars: number;
  pending_rewards: number;
}

// Анимации
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.4, ease: "easeOut" },
  }),
};

export default function ReferralPage() {
  const router = useRouter();
  const haptic = useHaptic();

  const [referral, setReferral] = useState<ReferralCode | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [inputCode, setInputCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<{ success: boolean; message: string } | null>(null);

  // Загрузка данных
  useEffect(() => {
    async function load() {
      try {
        const [codeData, statsData] = await Promise.all([
          authService.getReferralCode(),
          authService.getReferralStats(),
        ]);
        setReferral(codeData);
        setStats(statsData);
      } catch (e) {
        console.error("Ошибка загрузки реферальных данных", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Копирование кода
  const copyCode = useCallback(async () => {
    if (!referral) return;
    try {
      await navigator.clipboard.writeText(referral.code);
      setCopied(true);
      haptic?.light();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard недоступен */
    }
  }, [referral, haptic]);

  // Поделиться ссылкой
  const shareLink = useCallback(async () => {
    if (!referral) return;
    haptic?.light();
    if (navigator.share) {
      try {
        await navigator.share({ title: "Присоединяйся!", url: referral.link });
      } catch { /* отмена */ }
    } else {
      await navigator.clipboard.writeText(referral.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [referral, haptic]);

  // Применение чужого кода
  const applyCode = useCallback(async () => {
    if (!inputCode.trim() || applying) return;
    setApplying(true);
    setApplyResult(null);
    haptic?.medium();
    try {
      const res = await authService.applyReferralCode(inputCode.trim());
      setApplyResult({ success: res.success, message: res.message });
      if (res.success) {
        setInputCode("");
        // Обновляем статистику
        const fresh = await authService.getReferralStats();
        setStats(fresh);
      }
    } catch {
      setApplyResult({ success: false, message: "Не удалось применить код" });
    } finally {
      setApplying(false);
    }
  }, [inputCode, applying, haptic]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Хедер */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-lg border-b border-white/5">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-xl hover:bg-white/5 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">Реферальная программа</h1>
        </div>
      </div>

      <div className="px-4 pt-6 space-y-6 max-w-lg mx-auto">
        {/* Реферальный код */}
        <motion.div
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="bg-gradient-to-br from-purple-900/40 to-pink-900/30 rounded-2xl p-5 border border-purple-500/20"
        >
          <p className="text-sm text-purple-300 mb-2">Твой реферальный код</p>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold tracking-widest flex-1">{referral?.code ?? "—"}</span>
            <button
              onClick={copyCode}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 transition-colors"
              aria-label="Скопировать код"
            >
              {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>

          <button
            onClick={shareLink}
            className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 font-medium text-sm hover:opacity-90 transition-opacity"
          >
            <Share2 className="w-4 h-4" />
            Поделиться ссылкой
          </button>
        </motion.div>

        {/* Статистика */}
        {stats && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Users, label: "Рефералы", value: stats.total_referrals, color: "text-purple-400" },
              { icon: Star, label: "Заработано ⭐", value: stats.earned_stars, color: "text-yellow-400" },
              { icon: Gift, label: "Ожидают", value: stats.pending_rewards, color: "text-pink-400" },
            ].map((card, i) => (
              <motion.div
                key={card.label}
                custom={i + 1}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="bg-slate-950 rounded-2xl p-4 border border-white/5 text-center"
              >
                <card.icon className={`w-5 h-5 mx-auto mb-2 ${card.color}`} />
                <p className="text-xl font-bold">{card.value}</p>
                <p className="text-xs text-gray-500 mt-1">{card.label}</p>
              </motion.div>
            ))}
          </div>
        )}

        {/* Ввод чужого кода */}
        <motion.div
          custom={4}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="bg-slate-950 rounded-2xl p-5 border border-white/5"
        >
          <p className="text-sm font-medium mb-3">Есть код друга?</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder="Введи код"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors"
            />
            <button
              onClick={applyCode}
              disabled={!inputCode.trim() || applying}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            >
              {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Применить"}
            </button>
          </div>
          {applyResult && (
            <p className={`text-xs mt-2 ${applyResult.success ? "text-green-400" : "text-red-400"}`}>
              {applyResult.message}
            </p>
          )}
        </motion.div>

        {/* Как это работает */}
        <motion.div
          custom={5}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="bg-slate-950 rounded-2xl p-5 border border-white/5"
        >
          <p className="text-sm font-medium mb-3">Как это работает</p>
          <ul className="space-y-3 text-sm text-gray-400">
            {[
              "Поделись своим кодом с друзьями",
              "Друг регистрируется и вводит твой код",
              `Вы оба получаете ${referral?.reward ?? "бонус"} ⭐`,
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-600/20 text-purple-400 text-xs flex items-center justify-center font-medium">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </div>
  );
}
