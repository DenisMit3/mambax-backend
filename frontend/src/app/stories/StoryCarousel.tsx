"use client";

import { motion } from "framer-motion";
import { Plus, Camera, Loader2 } from "lucide-react";
import { Story, resolvePhotoUrl, ringGradient } from "./types";

interface StoryCarouselProps {
  stories: Story[];
  creating: boolean;
  onCreateClick: () => void;
  onOpenStory: (index: number) => void;
}

export default function StoryCarousel({
  stories,
  creating,
  onCreateClick,
  onOpenStory,
}: StoryCarouselProps) {
  return (
    <div className="px-4 py-3">
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
        {/* Кнопка создания */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onCreateClick}
          disabled={creating}
          className="flex-shrink-0 flex flex-col items-center gap-1.5"
        >
          <div className="relative w-[68px] h-[68px] rounded-full bg-gradient-to-br from-[#ff4b91] to-[#ff9e4a] p-[2px]">
            <div className="w-full h-full rounded-full bg-[#0f0f11] flex items-center justify-center">
              {creating ? (
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              ) : (
                <Plus className="w-6 h-6 text-white" />
              )}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center border-2 border-slate-950">
              <Camera className="w-2.5 h-2.5 text-white" />
            </div>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Создать</span>
        </motion.button>

        {/* Кружки историй */}
        {stories.map((story, i) => (
          <motion.button
            key={story.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onOpenStory(i)}
            className="flex-shrink-0 flex flex-col items-center gap-1.5"
          >
            <div
              className={`w-[68px] h-[68px] rounded-full p-[2.5px] bg-gradient-to-br ${ringGradient(i, story.is_viewed)}`}
            >
              <div className="w-full h-full rounded-full bg-slate-900 overflow-hidden flex items-center justify-center">
                {story.user_photo ? (
                  <img
                    src={resolvePhotoUrl(story.user_photo)}
                    alt={story.user_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl">👤</span>
                )}
              </div>
            </div>
            <span
              className={`text-[11px] font-medium truncate max-w-[68px] ${
                story.is_viewed ? "text-slate-600" : "text-white"
              }`}
            >
              {story.user_name}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
