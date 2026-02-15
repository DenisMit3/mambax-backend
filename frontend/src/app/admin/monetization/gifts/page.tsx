/* eslint-disable @next/next/no-img-element */
"use client";

import { Gift, Plus, Loader2 } from "lucide-react";
import styles from "../../admin.module.css";
import { Toast } from '@/components/ui/Toast';
import { useGiftsPage } from "./useGiftsPage";
import { GiftCard } from "./GiftCard";
import { GiftFormModal } from "./GiftFormModal";

export default function GiftsAdminPage() {
    const {
        gifts, categories, loading, showModal, setShowModal,
        editingGift, formData, setFormData, saving, error,
        toast, setToast,
        handleAddNew, handleEdit, handleDelete, handleSave, handleImageUpload
    } = useGiftsPage();

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <Loader2 size={40} className={styles.spinner} />
                <p>Загрузка подарков...</p>
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
                        <h1>Виртуальные подарки</h1>
                        <p className={styles.subtitle}>Управление каталогом подарков и категориями</p>
                    </div>
                </div>
                <button className={styles.primaryButton} onClick={handleAddNew}>
                    <Plus size={18} /> Добавить подарок
                </button>
            </div>

            {/* Stats */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <span className={styles.statValue}>{gifts.length}</span>
                    <span className={styles.statLabel}>Всего подарков</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statValue}>{gifts.filter(g => g.is_active).length}</span>
                    <span className={styles.statLabel}>Активных</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statValue}>{gifts.filter(g => g.is_premium).length}</span>
                    <span className={styles.statLabel}>Премиум</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statValue}>{gifts.reduce((acc, g) => acc + g.times_sent, 0)}</span>
                    <span className={styles.statLabel}>Всего отправлено</span>
                </div>
            </div>

            {/* Gifts Grid */}
            <div className={styles.cardsGrid}>
                {gifts.map(gift => (
                    <GiftCard key={gift.id} gift={gift} onEdit={handleEdit} onDelete={handleDelete} />
                ))}
            </div>

            {/* Categories Section */}
            <div className={styles.sectionHeader} style={{ marginTop: "40px" }}>
                <h2>Категории</h2>
            </div>
            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Иконка</th>
                            <th>Название</th>
                            <th>Описание</th>
                            <th>Порядок</th>
                            <th>Статус</th>
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
                                        {cat.is_active ? "Активен" : "Неактивен"}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <GiftFormModal
                    isEditing={!!editingGift}
                    formData={formData}
                    setFormData={setFormData}
                    categories={categories}
                    saving={saving}
                    error={error}
                    onSave={handleSave}
                    onClose={() => setShowModal(false)}
                    onImageUpload={handleImageUpload}
                />
            )}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
