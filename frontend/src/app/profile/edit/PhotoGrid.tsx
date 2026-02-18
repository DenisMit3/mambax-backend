/* eslint-disable @next/next/no-img-element */
"use client";

import { X, Camera, ChevronLeft, ChevronRight, Plus } from "lucide-react";

interface PhotoGridProps {
    photos: string[];
    onRemove: (index: number) => void;
    onMoveLeft: (index: number) => void;
    onMoveRight: (index: number) => void;
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function PhotoGrid({ photos, onRemove, onMoveLeft, onMoveRight, onUpload }: PhotoGridProps) {
    return (
        <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Camera className="w-3.5 h-3.5" /> Фото ({photos.length}/9)
            </h3>
            <div className="grid grid-cols-3 gap-2.5">
                {photos.map((url, i) => (
                    <div
                        key={url || `slot-${i}`}
                        className={`relative rounded-2xl overflow-hidden border border-white/10 ${i === 0 ? 'col-span-2 row-span-2' : ''}`}
                        style={{ aspectRatio: i === 0 ? '1' : '2/3' }}
                    >
                        <img
                            src={url}
                            alt={`Фото ${i + 1}`}
                            className="w-full h-full object-cover"
                        />
                        {/* Photo number */}
                        <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-[10px] font-bold text-white">
                            {i + 1}
                        </div>
                        {/* Delete button */}
                        <button
                            onClick={() => onRemove(i)}
                            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-red-500/80 transition active:scale-90"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                        {/* Move buttons */}
                        {photos.length > 1 && (
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                                <button
                                    onClick={(e) => { e.stopPropagation(); onMoveLeft(i); }}
                                    disabled={i === 0}
                                    aria-label="Переместить влево"
                                    className="w-7 h-7 rounded-full bg-black/60 flex items-center justify-center disabled:opacity-30 active:scale-90"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5 text-white" />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onMoveRight(i); }}
                                    disabled={i === photos.length - 1}
                                    aria-label="Переместить вправо"
                                    className="w-7 h-7 rounded-full bg-black/60 flex items-center justify-center disabled:opacity-30 active:scale-90"
                                >
                                    <ChevronRight className="w-3.5 h-3.5 text-white" />
                                </button>
                            </div>
                        )}
                    </div>
                ))}
                {/* Add photo button */}
                {photos.length < 9 && (
                    <div
                        className={`relative rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 hover:border-[#ff4b91]/40 hover:bg-white/[0.03] transition cursor-pointer ${photos.length === 0 ? 'col-span-2 row-span-2' : ''}`}
                        style={{ aspectRatio: photos.length === 0 ? '1' : '2/3' }}
                    >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#ff4b91]/20 to-[#ff9e4a]/20 flex items-center justify-center">
                            <Plus className="w-5 h-5 text-[#ff4b91]" />
                        </div>
                        <span className="text-[11px] text-slate-500 font-medium">Добавить</span>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={onUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                    </div>
                )}
            </div>
            <p className="mt-2 text-[11px] text-slate-600 text-center">
                Первое фото - главное. Используйте стрелки для изменения порядка.
            </p>
        </div>
    );
}
