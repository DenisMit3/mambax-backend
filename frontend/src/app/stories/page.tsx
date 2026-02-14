"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { authService } from "@/services/api";
import { useHaptic } from "@/hooks/useHaptic";
import { Story } from "./types";
import { StoryHeader, StorySkeleton } from "./StoryHeader";
import StoryCarousel from "./StoryCarousel";
import StoryEmptyState from "./StoryEmptyState";
import StoryViewer from "./StoryViewer";

export default function StoriesPage() {
  const haptic = useHaptic();

  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeStoryIdx, setActiveStoryIdx] = useState(0);
  const [creating, setCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<string | null>(null);

  // ─── Загрузка историй ───
  useEffect(() => {
    let cancelled = false;
    const fetchStories = async () => {
      setLoading(true);
      setError(false);
      try {
        const data = await authService.getStories();
        if (!cancelled) setStories(data.stories ?? []);
      } catch (e) {
        console.warn("Failed to fetch stories:", e);
        if (!cancelled) { setError(true); setStories([]); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchStories();
    return () => { cancelled = true; };
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const handleCreateClick = useCallback(() => {
    haptic.medium();
    fileInputRef.current?.click();
  }, [haptic]);

  const handleFileSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";
      setCreating(true);
      try {
        const result = await authService.createStory(file);
        if (result.success) {
          showToast("История опубликована ✨");
          const data = await authService.getStories();
          setStories(data.stories ?? []);
        } else {
          showToast("Не удалось опубликовать историю");
        }
      } catch (e) {
        console.warn("Failed to create story:", e);
        showToast("Ошибка при создании истории");
      } finally {
        setCreating(false);
      }
    },
    [showToast]
  );

  const openStory = useCallback(
    (storyIndex: number) => {
      haptic.light();
      setActiveStoryIdx(storyIndex);
      setViewerOpen(true);
      const story = stories[storyIndex];
      if (story && !story.is_viewed) {
        authService.viewStory(story.id).catch((e) => console.warn("Operation failed:", e));
        setStories((prev) =>
          prev.map((s, i) => (i === storyIndex ? { ...s, is_viewed: true } : s))
        );
      }
    },
    [haptic, stories]
  );

  const markViewed = useCallback(
    (storyIdx: number) => {
      const story = stories[storyIdx];
      if (story && !story.is_viewed) {
        authService.viewStory(story.id).catch((e) => console.warn("Operation failed:", e));
        setStories((prev) =>
          prev.map((s, i) => (i === storyIdx ? { ...s, is_viewed: true } : s))
        );
      }
    },
    [stories]
  );

  const handleRetry = useCallback(() => {
    setError(false);
    setLoading(true);
    authService
      .getStories()
      .then((data) => { setStories(data.stories ?? []); setError(false); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <StorySkeleton />;

  return (
    <div className="min-h-screen bg-black pb-24">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileSelected}
      />

      <StoryHeader creating={creating} />

      <StoryCarousel
        stories={stories}
        creating={creating}
        onCreateClick={handleCreateClick}
        onOpenStory={openStory}
      />

      {stories.length === 0 && (
        <StoryEmptyState
          error={error}
          creating={creating}
          onRetry={handleRetry}
          onCreateClick={handleCreateClick}
        />
      )}

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-28 left-4 right-4 z-50"
          >
            <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-3 text-center">
              <p className="text-sm text-white font-medium">{toast}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewerOpen && (
          <StoryViewer
            stories={stories}
            initialStoryIdx={activeStoryIdx}
            onClose={() => setViewerOpen(false)}
            onMarkViewed={markViewed}
            onShowToast={showToast}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
