'use client';

import { AnimatePresence } from 'framer-motion';
import { Plus, Loader2 } from 'lucide-react';
import styles from '../../../admin.module.css';
import { Toast } from '@/components/ui/Toast';
import { useSubscriptionsPage } from './useSubscriptionsPage';
import { SubscriptionStats } from './SubscriptionStats';
import { PlanCard } from './PlanCard';
import { PlanEditor } from './PlanEditor';

export default function SubscriptionsPage() {
    const {
        plans, metrics, loading, editingPlan, showEditor, setShowEditor,
        toast, setToast, handleEdit, handleSave, handleDelete, openCreate
    } = useSubscriptionsPage();

    if (loading) return <div className="p-8"><Loader2 className="animate-spin" /> Загрузка...</div>;

    return (
        <div className={styles.pageContainer}>
            <div className={styles.headerSection}>
                <div className={styles.headerContent}>
                    <h1 className={styles.headerTitle}>Управление подписками</h1>
                    <p className={styles.headerDescription}>Управление планами подписок и ценами</p>
                </div>
                <button className={styles.primaryButton} onClick={openCreate}>
                    <Plus size={16} /> Создать план
                </button>
            </div>

            <SubscriptionStats metrics={metrics} />

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {plans.map((plan) => (
                    <PlanCard key={plan.id} plan={plan} onEdit={handleEdit} />
                ))}
            </div>

            <AnimatePresence>
                {showEditor && (
                    <PlanEditor
                        plan={editingPlan}
                        onClose={() => setShowEditor(false)}
                        onSave={handleSave}
                        onDelete={handleDelete}
                    />
                )}
            </AnimatePresence>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
