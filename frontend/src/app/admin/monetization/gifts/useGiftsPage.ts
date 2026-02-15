'use client';

import { useState, useEffect, useCallback } from "react";
import { adminApi, GiftCategory, VirtualGift } from "@/services/admin";
import { GiftFormData, defaultGiftForm } from "./types";

export function useGiftsPage() {
    const [gifts, setGifts] = useState<VirtualGift[]>([]);
    const [categories, setCategories] = useState<GiftCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingGift, setEditingGift] = useState<VirtualGift | null>(null);
    const [formData, setFormData] = useState<GiftFormData>(defaultGiftForm);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const catalog = await adminApi.monetization.gifts.getCatalog(true);
            setGifts(catalog.gifts || []);
            setCategories(catalog.categories || []);
        } catch (err) {
            console.error("Failed to load gifts:", err);
            setError("Не удалось загрузить данные подарков");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleAddNew = () => {
        setEditingGift(null);
        setFormData(defaultGiftForm);
        setShowModal(true);
    };

    const handleEdit = (gift: VirtualGift) => {
        setEditingGift(gift);
        setFormData({
            name: gift.name,
            description: gift.description || "",
            image_url: gift.image_url || "",
            animation_url: gift.animation_url || "",
            price: gift.price,
            currency: gift.currency || "XTR",
            is_animated: gift.is_animated,
            is_premium: gift.is_premium,
            is_limited: gift.is_limited,
            is_active: gift.is_active,
            category_id: gift.category_id || "",
            sort_order: gift.sort_order || 0,
            available_until: gift.available_until || "",
            max_quantity: gift.max_quantity || null
        });
        setShowModal(true);
    };

    const handleDelete = async (giftId: string) => {
        if (!confirm("Are you sure you want to delete this gift?")) return;
        try {
            await adminApi.monetization.gifts.delete(giftId);
            setGifts(prev => prev.filter(g => g.id !== giftId));
        } catch (err) {
            console.error("Delete error:", err);
            setToast({ message: "Failed to delete gift", type: 'error' });
        }
    };

    const handleSave = async () => {
        if (!formData.name || !formData.price) {
            setError("Название и цена обязательны");
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const payload: Record<string, unknown> = {
                ...formData,
                max_quantity: formData.max_quantity || null,
                available_until: formData.available_until || null,
                category_id: formData.category_id || null
            };
            let savedGift: VirtualGift;
            if (editingGift) {
                savedGift = await adminApi.monetization.gifts.update(editingGift.id, payload);
                setGifts(prev => prev.map(g => g.id === editingGift.id ? savedGift : g));
            } else {
                savedGift = await adminApi.monetization.gifts.create(payload);
                setGifts(prev => [...prev, savedGift]);
            }
            setShowModal(false);
        } catch (err) {
            console.error("Save error:", err);
            setError(err instanceof Error ? err.message : "Failed to save gift");
        } finally {
            setSaving(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const { url } = await adminApi.monetization.gifts.uploadImage(file);
            setFormData(prev => ({ ...prev, image_url: url }));
        } catch (err) {
            console.error("Upload error:", err);
            setToast({ message: "Failed to upload image", type: 'error' });
        }
    };

    return {
        gifts, categories, loading, showModal, setShowModal,
        editingGift, formData, setFormData, saving, error,
        toast, setToast,
        handleAddNew, handleEdit, handleDelete, handleSave, handleImageUpload
    };
}
