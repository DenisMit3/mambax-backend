"use client";

import { motion } from "framer-motion";
import { Camera, Clock, Eye, ImageOff } from "lucide-react";

interface StoryEmptyStateProps {
  error: boolean;
  creating: boolean;
  onRetry: () => void;
  onCreateClick: () => void;
}

export default function StoryEmptyState({
  error,
  creating,
  onRetry,
  onCreateClick,
}: StoryEmptyStateProps) {
  return (
    <div className="px-4 mt-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-3xl bg-white/5 backdrop-blur-sm border border-white/5 p-6 text-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600/20 to-pink-500/20 flex items-center justify-center mx-auto mb-4">
          {error ? (
            <ImageOff className="w-8 h-8 text-slate-500" />
          ) : (
            <Camera className="w-8 h-8 text-purple-400" />
          )}
        </div>
        <h3 className="text-lg font-bold text-white mb-2">
          {error ? "Не удалось загрузить истории" : "Пока нет историй"}
        </h3>
        <p className="text-sm text-slate-400 leading-relaxed mb-5">
          {error
            ? "Проверь подключение к интернету и попробуй ещё раз."
            : "Будь первым — поделись моментом! Фото и видео исчезают через 24 часа."}
        </p>

        {/* Фичи */}
        {!error && (
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { icon: Camera, label: "Фото и видео", color: "text-pink-400" },
              { icon: Clock, label: "24 часа", color: "text-purple-400" },
              { icon: Eye, label: "Кто смотрел", color: "text-cyan-400" },
            ].map((f) => (
              <div key={f.label} className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/5">
                <f.icon className={`w-5 h-5 ${f.color}`} />
                <span className="text-[11px] text-slate-400 font-medium">{f.label}</span>
              </div>
            ))}
          </div>
        )}

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={error ? onRetry : onCreateClick}
          disabled={creating}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold text-sm"
        >
          {error ? "Попробовать снова" : "Создать первую историю"}
        </motion.button>
      </motion.div>
    </div>
  );
}
