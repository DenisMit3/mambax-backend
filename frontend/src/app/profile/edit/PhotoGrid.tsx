/* eslint-disable @next/next/no-img-element */
"use client";

import { X, Camera, ChevronLeft, ChevronRight } from "lucide-react";

interface PhotoGridProps {
    photos: string[];
    onRemove: (index: number) => void;
    onMoveLeft: (index: number) => void;
    onMoveRight: (index: number) => void;
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function PhotoGrid({ photos, onRemove, onMoveLeft, onMoveRight, onUpload }: PhotoGridProps) {
    return (
        <section style={{ padding: '20px 16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {photos.map((url, i) => (
                    <div key={url || `slot-${i}`} style={{
                        position: 'relative', aspectRatio: '2/3', borderRadius: '12px',
                        overflow: 'hidden', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)'
                    }}>
                        <img src={url} alt={`Фото ${i + 1}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button onClick={() => onRemove(i)} style={{
                            position: 'absolute', top: '6px', right: '6px',
                            background: 'rgba(255, 255, 255, 0.9)', width: '24px', height: '24px',
                            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)', border: 'none', cursor: 'pointer',
                        }}>
                            <X size={14} color="#000" />
                        </button>
                        <div style={{
                            position: 'absolute', top: '6px', left: '6px',
                            background: 'rgba(0,0,0,0.6)', color: '#fff', width: '22px', height: '22px',
                            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '11px', fontWeight: 700,
                        }}>
                            {i + 1}
                        </div>
                        {photos.length > 1 && (
                            <div style={{
                                position: 'absolute', bottom: '6px', left: '50%',
                                transform: 'translateX(-50%)', display: 'flex', gap: '4px',
                            }}>
                                <button onClick={(e) => { e.stopPropagation(); onMoveLeft(i); }}
                                    disabled={i === 0} aria-label="Переместить влево"
                                    style={{
                                        width: '28px', height: '28px', borderRadius: '50%',
                                        background: i === 0 ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.6)',
                                        border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: i === 0 ? 'default' : 'pointer', opacity: i === 0 ? 0.4 : 1,
                                    }}>
                                    <ChevronLeft size={16} color="#fff" />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); onMoveRight(i); }}
                                    disabled={i === photos.length - 1} aria-label="Переместить вправо"
                                    style={{
                                        width: '28px', height: '28px', borderRadius: '50%',
                                        background: i === photos.length - 1 ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.6)',
                                        border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: i === photos.length - 1 ? 'default' : 'pointer',
                                        opacity: i === photos.length - 1 ? 0.4 : 1,
                                    }}>
                                    <ChevronRight size={16} color="#fff" />
                                </button>
                            </div>
                        )}
                    </div>
                ))}
                <div style={{
                    aspectRatio: '2/3', borderRadius: '12px', background: 'var(--surface-hover)',
                    border: '2px dashed var(--border)', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative'
                }}>
                    <div style={{
                        width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px'
                    }}>
                        <Camera size={20} color="white" />
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Добавить фото</span>
                    <input type="file" accept="image/*" onChange={onUpload}
                        style={{ position: 'absolute', opacity: 0, inset: 0, cursor: 'pointer' }} />
                </div>
            </div>
            <p style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                Используйте стрелки для изменения порядка фото
            </p>
        </section>
    );
}
