'use client';

import { useState, useEffect } from 'react';
import { Camera, Loader2, ImageOff, CheckCircle, Shield } from 'lucide-react';
import { httpClient } from '@/lib/http-client';

interface UserPhotosTabProps {
    userId: string;
}

interface Photo {
    id: string;
    url: string;
    is_primary: boolean;
    is_verified: boolean;
    created_at: string;
}

export default function UserPhotosTab({ userId }: UserPhotosTabProps) {
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

    useEffect(() => {
        let cancelled = false;
        const fetchPhotos = async () => {
            setLoading(true);
            try {
                const data = await httpClient.get<{ photos: Photo[] }>(`/admin/users/${userId}/photos`);
                if (!cancelled) setPhotos(data.photos || []);
            } catch (err) {
                console.error('Failed to load photos:', err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        fetchPhotos();
        return () => { cancelled = true; };
    }, [userId]);

    if (loading) {
        return (
            <div style={{ padding: 40, textAlign: 'center' }} className="text-slate-500">
                <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                Загрузка фото...
            </div>
        );
    }

    if (photos.length === 0) {
        return (
            <div style={{ padding: 40, textAlign: 'center' }} className="text-slate-500">
                <ImageOff size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                <p>Нет загруженных фото</p>
            </div>
        );
    }

    return (
        <>
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: 12,
            }}>
                {photos.map((photo) => (
                    <div
                        key={photo.id}
                        onClick={() => setSelectedPhoto(photo)}
                        style={{
                            position: 'relative', borderRadius: 12, overflow: 'hidden',
                            border: photo.is_primary ? '2px solid #3b82f6' : '1px solid rgba(148,163,184,0.15)',
                            cursor: 'pointer', aspectRatio: '1',
                            background: 'rgba(30,41,59,0.5)',
                        }}
                    >
                        <img
                            src={photo.url}
                            alt="User photo"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                            }}
                        />
                        <div className="hidden" style={{
                            position: 'absolute', inset: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'rgba(30,41,59,0.8)',
                        }}>
                            <Camera size={32} className="text-slate-500" />
                        </div>

                        {/* Бейджи */}
                        <div style={{ position: 'absolute', top: 6, left: 6, display: 'flex', gap: 4 }}>
                            {photo.is_primary && (
                                <span style={{
                                    padding: '2px 6px', borderRadius: 6, fontSize: 10,
                                    fontWeight: 700, background: 'rgba(59,130,246,0.8)', color: '#fff',
                                }}>
                                    Главное
                                </span>
                            )}
                            {photo.is_verified && (
                                <span style={{
                                    padding: '2px 6px', borderRadius: 6, fontSize: 10,
                                    fontWeight: 700, background: 'rgba(16,185,129,0.8)', color: '#fff',
                                    display: 'flex', alignItems: 'center', gap: 2,
                                }}>
                                    <CheckCircle size={10} /> Верифицировано
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Модалка просмотра */}
            {selectedPhoto && (
                <div
                    onClick={() => setSelectedPhoto(null)}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 100,
                        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 20,
                    }}
                >
                    <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600, maxHeight: '80vh', position: 'relative' }}>
                        <img
                            src={selectedPhoto.url}
                            alt="Full photo"
                            style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 12, objectFit: 'contain' }}
                        />
                        <div style={{
                            position: 'absolute', bottom: 12, left: 12, right: 12,
                            padding: '8px 12px', borderRadius: 8,
                            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                {selectedPhoto.is_primary && (
                                    <span className="text-blue-400" style={{ fontSize: 12, fontWeight: 600 }}>Главное фото</span>
                                )}
                                {selectedPhoto.is_verified && (
                                    <span className="text-emerald-400" style={{ fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <Shield size={12} /> Верифицировано
                                    </span>
                                )}
                            </div>
                            <span className="text-slate-400" style={{ fontSize: 11 }}>
                                {new Date(selectedPhoto.created_at).toLocaleDateString('ru-RU')}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
