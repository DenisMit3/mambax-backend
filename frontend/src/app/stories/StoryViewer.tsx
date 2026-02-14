"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Heart,
  Send,
} from "lucide-react";
import { authService } from "@/services/api";
import { useHaptic } from "@/hooks/useHaptic";
import {
  Story,
  StorySlide,
  REACTIONS,
  resolvePhotoUrl,
  ringGradient,
  timeAgo,
} from "./types";

interface StoryViewerProps {
  stories: Story[];
  initialStoryIdx: number;
  onClose: () => void;
  onMarkViewed: (storyIdx: number) => void;
  onShowToast: (msg: string) => void;
}

export default function StoryViewer({
  stories,
  initialStoryIdx,
  onClose,
  onMarkViewed,
  onShowToast,
}: StoryViewerProps) {
  const haptic = useHaptic();

  const [activeStoryIdx, setActiveStoryIdx] = useState(initialStoryIdx);
  const [activeSlide, setActiveSlide] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showReactions, setShowReactions] = useState(false);

  const currentStory: Story | null = stories[activeStoryIdx] ?? null;
  const currentSlides: StorySlide[] = currentStory?.slides ?? [];

  // Сброс при смене начального индекса (переоткрытие)
  useEffect(() => {
    setActiveStoryIdx(initialStoryIdx);
    setActiveSlide(0);
    setProgress(0);
    setShowReactions(false);
  }, [initialStoryIdx]);

  // Закрыть просмотр
  const closeViewer = useCallback(() => {
    haptic.light();
    onClose();
  }, [haptic, onClose]);

  // Следующий слайд / история
  const nextSlide = useCallback(() => {
    if (activeSlide < currentSlides.length - 1) {
      setActiveSlide((p) => p + 1);
      setProgress(0);
    } else if (activeStoryIdx < stories.length - 1) {
      const nextIdx = activeStoryIdx + 1;
      setActiveStoryIdx(nextIdx);
      setActiveSlide(0);
      setProgress(0);
      setShowReactions(false);
      onMarkViewed(nextIdx);
    } else {
      closeViewer();
    }
  }, [activeSlide, currentSlides.length, activeStoryIdx, stories.length, closeViewer, onMarkViewed]);

  // Предыдущий слайд
  const prevSlide = useCallback(() => {
    if (activeSlide > 0) {
      setActiveSlide((p) => p - 1);
      setProgress(0);
    } else if (activeStoryIdx > 0) {
      const prevIdx = activeStoryIdx - 1;
      const prevStory = stories[prevIdx];
      setActiveStoryIdx(prevIdx);
      setActiveSlide((prevStory?.slides.length ?? 1) - 1);
      setProgress(0);
      setShowReactions(false);
    }
  }, [activeSlide, activeStoryIdx, stories]);

  // Реакция
  const handleReaction = useCallback(async (reaction: string) => {
    haptic.medium();
    setShowReactions(false);
    if (!currentStory) return;
    try {
      await authService.reactToStory(currentStory.id, reaction);
      onShowToast("Реакция отправлена 💜");
    } catch (e) {
      console.warn("Failed to send reaction:", e);
      onShowToast("Не удалось отправить реакцию");
    }
  }, [haptic, currentStory, onShowToast]);

  // Автопрогресс (5 секунд на слайд)
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          nextSlide();
          return 0;
        }
        return p + 2;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isPaused, nextSlide]);

  if (!currentStory || currentSlides.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black"
    >
      {/* Фон слайда */}
      <motion.div
        key={`slide-${currentStory.id}-${activeSlide}`}
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0"
      >
        {currentSlides[activeSlide]?.media_type === "video" ? (
          <video
            src={resolvePhotoUrl(currentSlides[activeSlide].media_url)}
            className="w-full h-full object-cover"
            autoPlay
            muted
            playsInline
            loop
          />
        ) : (
          <img
            src={resolvePhotoUrl(currentSlides[activeSlide]?.media_url ?? "")}
            alt={currentStory?.user_name ? `История ${currentStory.user_name}` : "Фото истории"}
            className="w-full h-full object-cover"
          />
        )}
        {/* Затемнение для читаемости */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/60" />
      </motion.div>

      {/* Прогресс-бары */}
      <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 px-3 pt-3">
        {currentSlides.map((_, i) => (
          <div key={i} className="flex-1 h-[3px] rounded-full bg-white/20 overflow-hidden">
            <motion.div
              className="h-full bg-white rounded-full"
              style={{
                width:
                  i < activeSlide
                    ? "100%"
                    : i === activeSlide
                    ? `${progress}%`
                    : "0%",
              }}
            />
          </div>
        ))}
      </div>

      {/* Шапка */}
      <div className="absolute top-8 left-0 right-0 z-20 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-full bg-gradient-to-br ${ringGradient(activeStoryIdx, false)} p-[2px]`}
          >
            <div className="w-full h-full rounded-full bg-black/40 backdrop-blur overflow-hidden flex items-center justify-center">
              {currentStory.user_photo ? (
                <img
                  src={resolvePhotoUrl(currentStory.user_photo)}
                  alt={currentStory.user_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-lg">👤</span>
              )}
            </div>
          </div>
          <div>
            <p className="text-sm font-bold text-white">{currentStory.user_name}</p>
            <p className="text-[11px] text-white/60">
              {timeAgo(currentSlides[activeSlide]?.created_at ?? currentStory.created_at)}
            </p>
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={closeViewer}
          className="w-9 h-9 rounded-full bg-black/30 backdrop-blur flex items-center justify-center"
        >
          <X className="w-5 h-5 text-white" />
        </motion.button>
      </div>

      {/* Текст слайда */}
      {currentSlides[activeSlide]?.text && (
        <div className="absolute inset-x-0 bottom-32 z-10 flex items-center justify-center px-8">
          <motion.p
            key={`text-${currentStory.id}-${activeSlide}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-xl font-bold text-white text-center leading-snug drop-shadow-lg"
          >
            {currentSlides[activeSlide].text}
          </motion.p>
        </div>
      )}

      {/* Зоны тапа: лево / право */}
      <div
        className="absolute inset-y-0 left-0 w-1/3 z-30"
        onClick={prevSlide}
        onPointerDown={() => setIsPaused(true)}
        onPointerUp={() => setIsPaused(false)}
      />
      <div
        className="absolute inset-y-0 right-0 w-2/3 z-30"
        onClick={nextSlide}
        onPointerDown={() => setIsPaused(true)}
        onPointerUp={() => setIsPaused(false)}
      />

      {/* Панель реакций */}
      <AnimatePresence>
        {showReactions && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-24 left-0 right-0 z-40 flex items-center justify-center gap-3 px-6"
          >
            <div className="flex gap-2 bg-black/60 backdrop-blur-xl rounded-full px-4 py-2">
              {REACTIONS.map((r) => (
                <motion.button
                  key={r.key}
                  whileTap={{ scale: 0.8 }}
                  whileHover={{ scale: 1.2 }}
                  onClick={() => handleReaction(r.key)}
                  className="text-2xl p-1"
                >
                  {r.emoji}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Нижняя панель */}
      <div className="absolute bottom-8 left-0 right-0 z-20 flex items-center justify-center gap-4 px-6">
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => {
            haptic.medium();
            setShowReactions((prev) => !prev);
            setIsPaused((prev) => !prev);
          }}
          className="w-12 h-12 rounded-full bg-white/10 backdrop-blur flex items-center justify-center"
        >
          <Heart className="w-5 h-5 text-white" />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => {
            haptic.light();
            onShowToast("Ответы скоро будут доступны 💬");
          }}
          className="flex-1 h-12 rounded-full bg-white/10 backdrop-blur flex items-center justify-center gap-2"
        >
          <span className="text-sm text-white/60 font-medium">Ответить...</span>
          <Send className="w-4 h-4 text-white/40" />
        </motion.button>
      </div>

      {/* Навигационные стрелки (десктоп) */}
      {(activeSlide > 0 || activeStoryIdx > 0) && (
        <button
          onClick={prevSlide}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-40 w-8 h-8 rounded-full bg-black/20 backdrop-blur hidden md:flex items-center justify-center"
        >
          <ChevronLeft className="w-4 h-4 text-white/70" />
        </button>
      )}
      {(activeSlide < currentSlides.length - 1 || activeStoryIdx < stories.length - 1) && (
        <button
          onClick={nextSlide}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-40 w-8 h-8 rounded-full bg-black/20 backdrop-blur hidden md:flex items-center justify-center"
        >
          <ChevronRight className="w-4 h-4 text-white/70" />
        </button>
      )}
    </motion.div>
  );
}
