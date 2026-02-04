/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Gift, Plus, Pencil, Trash2, Save, X, Upload,
    Sparkles, Crown, Image as ImageIcon, Loader2
} from "lucide-react";
import styles from "../../admin.module.css";
import { adminApi, GiftCategory, VirtualGift } from "@/services/adminApi";

interface GiftFormData {
    name: string;
    description: string;
    image_url: string;
    animation_url: string;
    price: number;
    currency: string;
    is_animated: boolean;
    is_premium: boolean;
    is_limited: boolean;
    is_active: boolean;
    category_id: string;
    sort_order: number;
    available_until: string;
    max_quantity: number | null;
}

const defaultGiftForm: GiftFormData = {
    name: "",
    description: "",
    image_url: "",
    animation_url: "",
    price: 10,
    currency: "XTR",
    is_animated: false,
    is_premium: false,
    is_limited: false,
    is_active: true,
    category_id: "",
    sort_order: 0,
    available_until: "",
    max_quantity: null
};

export default function GiftsAdminPage() {
    const [gifts, setGifts] = useState<VirtualGift[]>([]);
    const [categories, setCategories] = useState<GiftCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingGift, setEditingGift] = useState<VirtualGift | null>(null);
    const [formData, setFormData] = useState<GiftFormData>(defaultGiftForm);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            // Use adminApi to fetch catalog
            const catalog = await adminApi.monetization.gifts.getCatalog(true);
            setGifts(catalog.gifts || []);
            setCategories(catalog.categories || []);
        } catch (err) {
            console.error("Failed to load gifts:", err);
            setError("Failed to load gifts data");
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
            alert("Failed to delete gift");
        }
    };

    const handleSave = async () => {
        if (!formData.name || !formData.price) {
            setError("Name and price are required");
            return;
        }

        setSaving(true);
        setError(null);

        try {
            // Prepare payload
            const payload: any = {
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
            alert("Failed to upload image");
        }
    };

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <Loader2 size={40} className={styles.spinner} />
                <p>Loading gifts...</p>
            </div>
        );
    }

    return (
        <div className={styles.pageContainer}>
            {/* Header */}
            <div className={styles.pageHeader}>
                <div className={styles.headerLeft}>
                    <Gift size={28} className={styles.headerIcon} />
                    <div>
                        <h1>Virtual Gifts</h1>
                        <p className={styles.subtitle}>Manage gift catalog and categories</p>
                    </div>
                </div>
                <button className={styles.primaryButton} onClick={handleAddNew}>
                    <Plus size={18} />
                    Add Gift
                </button>
            </div>

            {/* Stats */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <span className={styles.statValue}>{gifts.length}</span>
                    <span className={styles.statLabel}>Total Gifts</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statValue}>{gifts.filter(g => g.is_active).length}</span>
                    <span className={styles.statLabel}>Active</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statValue}>{gifts.filter(g => g.is_premium).length}</span>
                    <span className={styles.statLabel}>Premium</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statValue}>{gifts.reduce((acc, g) => acc + g.times_sent, 0)}</span>
                    <span className={styles.statLabel}>Total Sent</span>
                </div>
            </div>

            {/* Gifts Grid */}
            <div className={styles.cardsGrid}>
                {gifts.map(gift => (
                    <div key={gift.id} className={`${styles.card} ${!gift.is_active ? styles.inactive : ""}`}>
                        <div className={styles.cardHeader}>
                            <div className={styles.giftImageContainer}>
                                {gift.image_url ? (
                                    <img
                                        src={gift.image_url.startsWith("http") ? gift.image_url : `/api_proxy${gift.image_url}`}
                                        alt={gift.name}
                                        className={styles.giftImage}
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = "https://placehold.co/80x80/png?text=🎁";
                                        }}
                                    />
                                ) : (
                                    <div className={styles.giftPlaceholder}>🎁</div>
                                )}
                                {gift.is_premium && (
                                    <span className={styles.premiumBadge}>
                                        <Crown size={12} />
                                    </span>
                                )}
                                {gift.is_animated && (
                                    <span className={styles.animatedBadge}>
                                        <Sparkles size={12} />
                                    </span>
                                )}
                            </div>
                            <div className={styles.cardActions}>
                                <button
                                    className={styles.iconButton}
                                    onClick={() => handleEdit(gift)}
                                    title="Edit"
                                >
                                    <Pencil size={16} />
                                </button>
                                <button
                                    className={`${styles.iconButton} ${styles.danger}`}
                                    onClick={() => handleDelete(gift.id)}
                                    title="Delete"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                        <div className={styles.cardBody}>
                            <h3 className={styles.giftName}>{gift.name}</h3>
                            <p className={styles.giftDescription}>{gift.description}</p>
                            <div className={styles.giftMeta}>
                                <span className={styles.giftPrice}>⭐ {gift.price} {gift.currency}</span>
                                <span className={styles.giftSent}>{gift.times_sent} sent</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Categories Section */}
            <div className={styles.sectionHeader} style={{ marginTop: "40px" }}>
                <h2>Categories</h2>
            </div>
            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Icon</th>
                            <th>Name</th>
                            <th>Description</th>
                            <th>Order</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories.map(cat => (
                            <tr key={cat.id}>
                                <td><span style={{ fontSize: "24px" }}>{cat.icon}</span></td>
                                <td>{cat.name}</td>
                                <td>{cat.description}</td>
                                <td>{cat.sort_order}</td>
                                <td>
                                    <span className={cat.is_active ? styles.statusActive : styles.statusInactive}>
                                        {cat.is_active ? "Active" : "Inactive"}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal} style={{ maxWidth: "600px" }}>
                        <div className={styles.modalHeader}>
                            <h2>{editingGift ? "Edit Gift" : "Add New Gift"}</h2>
                            <button className={styles.closeButton} onClick={() => setShowModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            {error && (
                                <div className={styles.errorMessage}>{error}</div>
                            )}

                            <div className={styles.formGrid}>
                                {/* Name */}
                                <div className={styles.formGroup}>
                                    <label>Name *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="Gift name"
                                    />
                                </div>

                                {/* Price */}
                                <div className={styles.formGroup}>
                                    <label>Price (Stars) *</label>
                                    <input
                                        type="number"
                                        value={formData.price}
                                        onChange={(e) => setFormData(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
                                        min="1"
                                    />
                                </div>

                                {/* Description */}
                                <div className={styles.formGroup} style={{ gridColumn: "1 / -1" }}>
                                    <label>Description</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="Gift description"
                                        rows={2}
                                    />
                                </div>

                                {/* Image Upload */}
                                <div className={styles.formGroup} style={{ gridColumn: "1 / -1" }}>
                                    <label>Image</label>
                                    <div className={styles.imageUploadContainer}>
                                        {formData.image_url ? (
                                            <img
                                                src={formData.image_url.startsWith("http") ? formData.image_url : `/api_proxy${formData.image_url}`}
                                                alt="Preview"
                                                className={styles.imagePreview}
                                            />
                                        ) : (
                                            <div className={styles.uploadPlaceholder}>
                                                <ImageIcon size={32} />
                                                <span>No image</span>
                                            </div>
                                        )}
                                        <label className={styles.uploadButton}>
                                            <Upload size={16} />
                                            Upload
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                style={{ display: "none" }}
                                            />
                                        </label>
                                    </div>
                                    <input
                                        type="text"
                                        value={formData.image_url}
                                        onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                                        placeholder="Or paste image URL"
                                        style={{ marginTop: "8px" }}
                                    />
                                </div>

                                {/* Category */}
                                <div className={styles.formGroup}>
                                    <label>Category</label>
                                    <select
                                        value={formData.category_id}
                                        onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
                                    >
                                        <option value="">No category</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Sort Order */}
                                <div className={styles.formGroup}>
                                    <label>Sort Order</label>
                                    <input
                                        type="number"
                                        value={formData.sort_order}
                                        onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                                        min="0"
                                    />
                                </div>

                                {/* Toggles */}
                                <div className={styles.formGroup}>
                                    <label className={styles.checkboxLabel}>
                                        <input
                                            type="checkbox"
                                            checked={formData.is_active}
                                            onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                                        />
                                        Active
                                    </label>
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.checkboxLabel}>
                                        <input
                                            type="checkbox"
                                            checked={formData.is_premium}
                                            onChange={(e) => setFormData(prev => ({ ...prev, is_premium: e.target.checked }))}
                                        />
                                        Premium
                                    </label>
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.checkboxLabel}>
                                        <input
                                            type="checkbox"
                                            checked={formData.is_animated}
                                            onChange={(e) => setFormData(prev => ({ ...prev, is_animated: e.target.checked }))}
                                        />
                                        Animated
                                    </label>
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.checkboxLabel}>
                                        <input
                                            type="checkbox"
                                            checked={formData.is_limited}
                                            onChange={(e) => setFormData(prev => ({ ...prev, is_limited: e.target.checked }))}
                                        />
                                        Limited Edition
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <button
                                className={styles.secondaryButton}
                                onClick={() => setShowModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className={styles.primaryButton}
                                onClick={handleSave}
                                disabled={saving}
                            >
                                {saving ? (
                                    <><Loader2 size={16} className={styles.spinner} /> Saving...</>
                                ) : (
                                    <><Save size={16} /> Save Gift</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
