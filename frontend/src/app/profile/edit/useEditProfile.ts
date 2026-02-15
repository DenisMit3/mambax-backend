'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/api";
import { useUser } from "@/context/UserContext";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export function useEditProfile() {
    const router = useRouter();
    const { isAuthed, isChecking } = useRequireAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const [name, setName] = useState("");
    const [bio, setBio] = useState("");
    const [gender, setGender] = useState("male");
    const [interests, setInterests] = useState<string[]>([]);
    const [photos, setPhotos] = useState<string[]>([]);
    const [newInterest, setNewInterest] = useState("");

    const { user, updateUXPreferences } = useUser();
    const [uxPreferences, setUxPreferences] = useState({
        sounds_enabled: true,
        haptic_enabled: true,
        reduced_motion: false
    });

    useEffect(() => {
        if (user?.ux_preferences) {
            setUxPreferences(user.ux_preferences);
        }
    }, [user]);

    const updateUXPref = async (key: string, value: boolean) => {
        const newPrefs = { ...uxPreferences, [key]: value };
        setUxPreferences(newPrefs);
        try {
            await updateUXPreferences(newPrefs);
        } catch (e) {
            console.warn('Failed to update UX preferences:', e);
        }
    };

    const loadProfile = () => {
        setError(false);
        authService.getMe()
            .then((data) => {
                setName(data.name);
                setBio(data.bio || "");
                setGender(data.gender || "male");
                setInterests(data.interests || []);
                setPhotos(data.photos || []);
            })
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        if (isAuthed) loadProfile();
    }, [isAuthed]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await authService.updateProfile({ name, bio, gender, interests, photos });
            setToast({ message: "Профиль обновлён!", type: 'success' });
            setTimeout(() => router.push("/profile"), 1500);
        } catch (err) {
            setToast({ message: "Не удалось обновить профиль", type: 'error' });
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        try {
            const res = await authService.uploadPhoto(file);
            setPhotos(prev => [...prev, res.url]);
        } catch (err) {
            setToast({ message: "Ошибка загрузки", type: 'error' });
            console.error(err);
        }
    };

    const removePhoto = (index: number) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const movePhotoLeft = (index: number) => {
        if (index <= 0) return;
        setPhotos(prev => {
            const next = [...prev];
            [next[index - 1], next[index]] = [next[index], next[index - 1]];
            return next;
        });
    };

    const movePhotoRight = (index: number) => {
        if (index >= photos.length - 1) return;
        setPhotos(prev => {
            const next = [...prev];
            [next[index], next[index + 1]] = [next[index + 1], next[index]];
            return next;
        });
    };

    const addInterest = () => {
        if (!newInterest.trim()) return;
        if (interests.includes(newInterest.trim())) return;
        setInterests([...interests, newInterest.trim()]);
        setNewInterest("");
    };

    return {
        isChecking, loading, error, saving, toast, setToast,
        name, setName, bio, setBio, gender, setGender,
        interests, setInterests, photos,
        newInterest, setNewInterest,
        uxPreferences, updateUXPref,
        loadProfile, handleSave, handlePhotoUpload,
        removePhoto, movePhotoLeft, movePhotoRight, addInterest
    };
}
