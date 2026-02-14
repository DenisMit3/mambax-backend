"use client";

import { Loader2 } from "lucide-react";

interface StoryHeaderProps {
  creating: boolean;
}

export function StoryHeader({ creating }: StoryHeaderProps) {
  return (
    <div className="px-4 pt-6 pb-2">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-black text-white">Истории</h1>
        {creating && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 backdrop-blur-sm">
            <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin" />
            <span className="text-[11px] font-semibold text-purple-300 uppercase tracking-widest">
              Загрузка...
            </span>
          </div>
        )}
      </div>
      <p className="text-sm text-slate-500">Делись моментами, находи людей рядом</p>
    </div>
  );
}

export function StorySkeleton() {
  return (
    <div className="min-h-screen bg-black pb-24">
      <div className="px-4 pt-6 pb-2">
        <h1 className="text-2xl font-black text-white">Истории</h1>
        <p className="text-sm text-slate-500 mt-1">Делись моментами, находи людей рядом</p>
      </div>
      <div className="px-4 py-3">
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
          <div className="flex-shrink-0 flex flex-col items-center gap-1.5">
            <div className="w-[68px] h-[68px] rounded-full bg-white/10 animate-pulse" />
            <div className="w-10 h-2 rounded bg-white/10 animate-pulse" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 flex flex-col items-center gap-1.5">
              <div className="w-[68px] h-[68px] rounded-full bg-white/10 animate-pulse" />
              <div className="w-10 h-2 rounded bg-white/10 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-center pt-20">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    </div>
  );
}
