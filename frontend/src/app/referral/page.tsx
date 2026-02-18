"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Share2, Gift, Users, Star, ArrowLeft, Check, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { authService } from "@/services/api";
import { useHaptic } from "@/hooks/useHaptic";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { ErrorState } from "@/components/ui/ErrorState";
import { useTelegram } from "@/lib/telegram";

const TELEGRAM_BOT_NAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME || "YouMeMeet_bot";

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

interface InvitedUser {
  name: string;
  username: string | null;
  status: string;
  reward_stars: number;
  reward_paid: boolean;
  joined_at: string | null;
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
  const { isAuthed, isChecking } = useRequireAuth();
  const { webApp } = useTelegram();

  const [referral, setReferral] = useState<ReferralCode | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [invited, setInvited] = useState<InvitedUser[]>([]);
  const [inputCode, setInputCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showInvited, setShowInvited] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Toast helper
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  // Загрузка данных
  const loadData = useCallback(async () => {
    try {
      setError(false);
      const [codeData, statsData] = await Promise.all([
        authService.getReferralCode(),
        authService.getReferralStats(),
      ]);
      setReferral(codeData);
      setStats(statsData);

      // Load invited list
      try {
        const invitedData = await authService.getReferralInvited();
        setInvited(invitedData.invited || []);
      } catch {
        /* invited list is optional */
      }
    } catch (e) {
      console.error("Ошибка загрузки реферальных данных", e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthed) loadData();
  }, [isAuthed, loadData]);

  // Auto-apply referral code from Telegram start_param
  useEffect(() => {
    if (!isAuthed || !webApp) return;
    const startParam = webApp.initDataUnsafe?.start_param;
    if (startParam && startParam.startsWith("REF-")) {
      setInputCode(startParam);
    }
  }, [isAuthed, webApp]);

  // Копирование кода
  const copyCode = useCallback(async () => {
    if (!referral) return;
    try {
      await navigator.clipboard.writeText(referral.code);
      setCopied(true);
      haptic?.light();
      showToast("Код скопирован!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard недоступен */
    }
  }, [referral, haptic, showToast]);

  // Поделиться ссылкой через Telegram
  const shareLink = useCallback(() => {
    if (!referral) return;
    haptic?.light();

    const shareText = `Присоединяйся к YouMe! Используй мой код ${referral.code} и получи ${referral.reward} ⭐`;
    const shareUrl = referral.link || `https://t.me/${TELEGRAM_BOT_NAME}?start=${referral.code}`;
    const tgShareUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;

    // Доступ к Telegram WebApp напрямую через window (не через React state)
    const tg = typeof window !== "undefined" ? window.Telegram?.WebApp : null;

    let opened = false;

    // Способ 1: openTelegramLink (нативный Telegram)
    if (tg?.openTelegramLink) {
      try {
        tg.openTelegramLink(tgShareUrl);
        opened = true;
      } catch {
        // fallback ниже
      }
    }

    // Способ 2: openLink (внешний браузер)
    if (!opened && tg?.openLink) {
      try {
        tg.openLink(tgShareUrl);
        opened = true;
      } catch {
        // fallback ниже
      }
    }

    // Способ 3: window.open fallback
    if (!opened) {
      try {
        window.open(tgShareUrl, "_blank");
        opened = true;
      } catch {
        // fallback ниже
      }
    }

    // Способ 4: location.href как последний вариант
    if (!opened) {
      window.location.href = tgShareUrl;
    }
  }, [referral, haptic]);

  // Применение чужого кода
  const applyCode = useCallback(async () => {
    const trimmed = inputCode.trim().toUpperCase();
    if (!trimmed || applying) return;

    // Client-side validation
    if (trimmed.length < 5) {
      setApplyResult({ success: false, message: "Код слишком короткий" });
      return;
    }

    setApplying(true);
    setApplyResult(null);
    haptic?.medium();
    try {
      const res = await authService.applyReferralCode(trimmed);
      setApplyResult({ success: res.success, message: res.message });
      if (res.success) {
        setInputCode("");
        haptic?.success?.();
        showToast(`+${res.bonus} ⭐ получено!`);
        // Refresh stats
        const [fresh, invitedData] = await Promise.all([
          authService.getReferralStats(),
          authService.getReferralInvited().catch(() => ({ invited: [] })),
        ]);
        setStats(fresh);
        setInvited(invitedData.invited || []);
      } else {
        haptic?.error?.();
      }
    } catch {
      setApplyResult({ success: false, message: "Не удалось применить код" });
      haptic?.error?.();
    } finally {
      setApplying(false);
    }
  }, [inputCode, applying, haptic, showToast]);

  // Handle Enter key
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      applyCode();
    }
  }, [applyCode]);

  if (isChecking || loading) {
    return (
      <div className="min-h-dvh bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return <ErrorState onRetry={loadData} />;
  }

  return (
    <div className="min-h-dvh bg-black text-white pb-24 overflow-x-hidden">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-lg"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Хедер */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-lg border-b border-white/5">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-xl hover:bg-white/5 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">Реферальная программа</h1>
        </div>
      </div>

      <div className="px-4 pt-6 space-y-5 max-w-lg mx-auto w-full overflow-hidden box-border">
        {/* Debug viewport info */}
        <div className="text-[10px] text-slate-500 break-all">
          [VIEWPORT] w={typeof window !== "undefined" ? window.innerWidth : "?"} | tg_ver={webApp?.version || "no_tg"} | expanded={webApp?.isExpanded ? "Y" : "N"}
        </div>
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
            <span className="text-xl font-bold tracking-wider flex-1 break-all min-w-0">{referral?.code ?? "—"}</span>
            <button
              onClick={copyCode}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 transition-colors flex-shrink-0"
              aria-label="Скопировать код"
            >
              {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>

          <button
            onClick={shareLink}
            className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#ff4b91] to-[#ff9e4a] font-medium text-sm hover:opacity-90 transition-opacity active:scale-[0.98] box-border"
          >
            <Share2 className="w-4 h-4" />
            Поделиться ссылкой
          </button>
        </motion.div>

        {/* Статистика */}
        {stats && (
          <div className="grid grid-cols-3 gap-2 w-full">
            {[
              { icon: Users, label: "Рефералы", value: stats.total_referrals, color: "text-purple-400" },
              { icon: Star, label: "Заработано", value: stats.earned_stars, suffix: " ⭐", color: "text-yellow-400" },
              { icon: Gift, label: "Ожидают", value: stats.pending_rewards, color: "text-pink-400" },
            ].map((card, i) => (
              <motion.div
                key={card.label}
                custom={i + 1}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="bg-[#0f0f11] rounded-2xl p-2.5 border border-white/5 text-center overflow-hidden"
              >
                <card.icon className={`w-4 h-4 mx-auto mb-1 ${card.color}`} />
                <p className="text-lg font-bold truncate">{card.value}{card.suffix || ""}</p>
                <p className="text-[10px] text-slate-500 mt-0.5 truncate">{card.label}</p>
              </motion.div>
            ))}
          </div>
        )}

        {/* Список приглашённых */}
        {stats && stats.total_referrals > 0 && (
          <motion.div
            custom={4}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="bg-[#0f0f11] rounded-2xl border border-white/5 overflow-hidden"
          >
            <button
              onClick={() => setShowInvited(!showInvited)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium"
            >
              <span>Приглашённые ({stats.total_referrals})</span>
              {showInvited ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>
            <AnimatePresence>
              {showInvited && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-3 space-y-2">
                    {invited.length === 0 ? (
                      <p className="text-xs text-slate-500 py-2">Загрузка...</p>
                    ) : (
                      invited.map((u, i) => (
                        <div key={i} className="flex items-center justify-between py-2 border-t border-white/5">
                          <div>
                            <p className="text-sm">{u.name}</p>
                            {u.username && <p className="text-xs text-slate-500">@{u.username}</p>}
                          </div>
                          <div className="text-right">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              u.status === "converted" ? "bg-green-500/20 text-green-400" :
                              u.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                              "bg-gray-500/20 text-slate-400"
                            }`}>
                              {u.status === "converted" ? "Активен" : u.status === "pending" ? "Ожидание" : u.status}
                            </span>
                            {u.reward_paid && <p className="text-xs text-yellow-400 mt-0.5">+{u.reward_stars} ⭐</p>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Ввод чужого кода */}
        <motion.div
          custom={5}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="bg-[#0f0f11] rounded-2xl p-4 border border-white/5"
        >
          <p className="text-sm font-medium mb-3">Есть код друга?</p>
          <div className="flex gap-2 w-full overflow-hidden">
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              placeholder="Введи код"
              autoComplete="off"
              autoCapitalize="characters"
              enterKeyHint="send"
              spellCheck={false}
              maxLength={20}
              className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50 transition-colors box-border"
            />
            <button
              onClick={applyCode}
              disabled={!inputCode.trim() || applying}
              className="px-3 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 box-border"
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
          custom={6}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="bg-[#0f0f11] rounded-2xl p-4 border border-white/5"
        >
          <p className="text-sm font-medium mb-3">Как это работает</p>
          <ul className="space-y-3 text-sm text-slate-400">
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
