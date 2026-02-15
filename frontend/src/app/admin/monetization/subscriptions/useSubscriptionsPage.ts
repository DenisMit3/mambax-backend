'use client';

import { useState, useEffect } from 'react';
import { adminApi, RevenueMetrics, SubscriptionPlan } from '@/services/admin';
import type { Plan } from './types';

export function useSubscriptionsPage() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [metrics, setMetrics] = useState<RevenueMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
    const [showEditor, setShowEditor] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const loadData = async () => {
        try {
            setLoading(true);
            const [plansRes, metricsRes] = await Promise.all([
                adminApi.monetization.getPlans(true),
                adminApi.monetization.getRevenue()
            ]);
            setMetrics(metricsRes);

            const mappedPlans: Plan[] = plansRes.plans.map((p: SubscriptionPlan) => {
                let subs = 0;
                if (metricsRes.subscription_breakdown) {
                    if (p.tier === 'free') subs = metricsRes.subscription_breakdown.free.count;
                    if (p.tier === 'gold') subs = metricsRes.subscription_breakdown.gold.count;
                    if (p.tier === 'platinum') subs = metricsRes.subscription_breakdown.platinum.count;
                }
                return {
                    id: p.id, name: p.name, tier: p.tier, price: p.price,
                    currency: p.currency, duration: p.duration_days,
                    subscribers: subs, mrr: p.price * subs,
                    isActive: p.is_active, isPopular: p.is_popular,
                    features: {
                        unlimited_swipes: p.unlimited_swipes || false,
                        see_who_likes_you: p.see_who_likes_you || false,
                        incognito_mode: p.incognito_mode || false,
                        boosts_per_month: p.boosts_per_month || 0,
                        super_likes_per_day: p.super_likes_per_day || 0,
                        advanced_filters: p.advanced_filters || false,
                        rewind_unlimited: p.rewind_unlimited || false,
                        priority_listing: p.priority_listing || false,
                        read_receipts: p.read_receipts || false,
                        profile_boost: p.profile_boost || false,
                    }
                };
            });
            setPlans(mappedPlans);
        } catch (error) {
            console.error("Failed to load subs data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleEdit = (plan: Plan) => {
        setEditingPlan(plan);
        setShowEditor(true);
    };

    const handleSave = async (plan: Plan) => {
        try {
            const payload = {
                name: plan.name, tier: plan.tier, price: plan.price,
                currency: plan.currency, duration_days: plan.duration,
                is_active: plan.isActive, is_popular: plan.isPopular,
                features: plan.features
            };
            if (plan.id) {
                await adminApi.monetization.updatePlan(plan.id, payload);
            } else {
                await adminApi.monetization.createPlan(payload);
            }
            await loadData();
            setShowEditor(false);
            setEditingPlan(null);
        } catch (e) {
            console.error("Failed to save plan", e);
            setToast({ message: "Не удалось сохранить план", type: 'error' });
        }
    };

    const handleDelete = async (planId: string) => {
        try {
            await adminApi.monetization.deletePlan(planId);
            await loadData();
            setShowEditor(false);
            setEditingPlan(null);
        } catch (e) {
            console.error("Failed to delete plan", e);
            setToast({ message: "Не удалось удалить план", type: 'error' });
        }
    };

    const openCreate = () => { setEditingPlan(null); setShowEditor(true); };

    return {
        plans, metrics, loading, editingPlan, showEditor, setShowEditor,
        toast, setToast, handleEdit, handleSave, handleDelete, openCreate
    };
}
