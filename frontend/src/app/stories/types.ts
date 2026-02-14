// Типы и константы для модуля историй

export interface StorySlide {
  id: string;
  media_url: string;
  media_type: "photo" | "video";
  text?: string;
  created_at: string;
}

export interface Story {
  id: string;
  user_id: string;
  user_name: string;
  user_photo: string;
  slides: StorySlide[];
  is_viewed: boolean;
  created_at: string;
}

// Цвета градиентов для кружков (циклически по индексу)
export const RING_GRADIENTS = [
  "from-pink-500 to-purple-600",
  "from-blue-500 to-cyan-400",
  "from-amber-400 to-pink-500",
  "from-red-500 to-orange-400",
  "from-fuchsia-500 to-rose-400",
  "from-violet-500 to-indigo-500",
  "from-sky-400 to-purple-500",
];

// Реакции
export const REACTIONS = [
  { emoji: "❤️", key: "heart" },
  { emoji: "🔥", key: "fire" },
  { emoji: "😍", key: "love_eyes" },
  { emoji: "😂", key: "laugh" },
  { emoji: "😮", key: "wow" },
  { emoji: "👏", key: "clap" },
];

// Утилита для формирования URL фото
export function resolvePhotoUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  if (url.startsWith("/static/")) return `/api_proxy${url}`;
  return `/api_proxy/${url.replace(/^\//, "")}`;
}

// Градиент кольца для кружка
export function ringGradient(index: number, viewed: boolean): string {
  return viewed
    ? "from-slate-600 to-slate-700"
    : RING_GRADIENTS[index % RING_GRADIENTS.length];
}

// Время назад
export function timeAgo(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "только что";
    if (mins < 60) return `${mins} мин. назад`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ч. назад`;
    return `${Math.floor(hours / 24)} д. назад`;
  } catch {
    return "";
  }
}
