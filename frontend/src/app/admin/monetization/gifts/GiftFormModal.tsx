/* eslint-disable @next/next/no-img-element */
"use client";

import {
    Save, X, Upload, Image as ImageIcon, Loader2
} from "lucide-react";
import styles from "../../admin.module.css";
import { GiftCategory } from "@/services/admin";
import { GiftFormData } from "./types";

interface GiftFormModalProps {
    isEditing: boolean;
    formData: GiftFormData;
    setFormData: React.Dispatch<React.SetStateAction<GiftFormData>>;
    categories: GiftCategory[];
    saving: boolean;
    error: string | null;
    onSave: () => void;
    onClose: () => void;
    onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function GiftFormModal({
    isEditing, formData, setFormData, categories,
    saving, error, onSave, onClose, onImageUpload
}: GiftFormModalProps) {
    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modal} style={{ maxWidth: "600px" }}>
                <div className={styles.modalHeader}>
                    <h2>{isEditing ? "Редактировать подарок" : "Добавить подарок"}</h2>
                    <button className={styles.closeButton} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                <div className={styles.modalBody}>
                    {error && <div className={styles.errorMessage}>{error}</div>}
                    <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                            <label>Название *</label>
                            <input type="text" value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Название подарка" />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Цена (Stars) *</label>
                            <input type="number" value={formData.price}
                                onChange={(e) => setFormData(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
                                min="1" />
                        </div>
                        <div className={styles.formGroup} style={{ gridColumn: "1 / -1" }}>
                            <label>Описание</label>
                            <textarea value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Описание подарка" rows={2} />
                        </div>
                        <div className={styles.formGroup} style={{ gridColumn: "1 / -1" }}>
                            <label>Изображение</label>
                            <div className={styles.imageUploadContainer}>
                                {formData.image_url ? (
                                    <img
                                        src={formData.image_url.startsWith("http") ? formData.image_url : `/api_proxy${formData.image_url}`}
                                        alt="Preview" className={styles.imagePreview} />
                                ) : (
                                    <div className={styles.uploadPlaceholder}>
                                        <ImageIcon size={32} /><span>Нет изображения</span>
                                    </div>
                                )}
                                <label className={styles.uploadButton}>
                                    <Upload size={16} /> Загрузить
                                    <input type="file" accept="image/*" onChange={onImageUpload} style={{ display: "none" }} />
                                </label>
                            </div>
                            <input type="text" value={formData.image_url}
                                onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                                placeholder="Или вставьте URL изображения" style={{ marginTop: "8px" }} />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Категория</label>
                            <select value={formData.category_id}
                                onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}>
                                <option value="">Без категории</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className={styles.formGroup}>
                            <label>Порядок сортировки</label>
                            <input type="number" value={formData.sort_order}
                                onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                                min="0" />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.checkboxLabel}>
                                <input type="checkbox" checked={formData.is_active}
                                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))} />
                                Active
                            </label>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.checkboxLabel}>
                                <input type="checkbox" checked={formData.is_premium}
                                    onChange={(e) => setFormData(prev => ({ ...prev, is_premium: e.target.checked }))} />
                                Премиум
                            </label>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.checkboxLabel}>
                                <input type="checkbox" checked={formData.is_animated}
                                    onChange={(e) => setFormData(prev => ({ ...prev, is_animated: e.target.checked }))} />
                                Анимированный
                            </label>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.checkboxLabel}>
                                <input type="checkbox" checked={formData.is_limited}
                                    onChange={(e) => setFormData(prev => ({ ...prev, is_limited: e.target.checked }))} />
                                Лимитированный
                            </label>
                        </div>
                    </div>
                </div>
                <div className={styles.modalFooter}>
                    <button className={styles.secondaryButton} onClick={onClose}>Отмена</button>
                    <button className={styles.primaryButton} onClick={onSave} disabled={saving}>
                        {saving ? (
                            <><Loader2 size={16} className={styles.spinner} /> Сохранение...</>
                        ) : (
                            <><Save size={16} /> Сохранить подарок</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
