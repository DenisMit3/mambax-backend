/**
 * Admin API — barrel export
 *
 * Re-exports everything from submodules for backward compatibility.
 * Usage: import { adminApi, UserListItem } from '@/services/admin';
 */

import { httpClient } from "@/lib/http-client";

// Re-export all types
export * from "./types";

// Re-export all standalone functions
export * from "./dashboard";
export * from "./users";
export * from "./moderation";
export * from "./analytics";
export * from "./monetization";
export * from "./system";
export * from "./marketing";

// Import functions for adminApi object
import { getDashboardMetrics, getLiveActivity } from "./dashboard";
import {
    getUsers, getUserDetails, performUserAction, performBulkUserAction,
    createUser, deleteUser, getVerificationQueue, reviewVerificationRequest,
    getSegments, recalculateFraudScores, getHighRiskUsers,
} from "./users";
import { getModerationQueue, reviewModerationItem, getModerationStats } from "./moderation";
import {
    getAnalyticsOverview, getRetentionCohorts, getFunnelData,
    getRealtimeMetrics, getChurnPrediction, getRevenueBreakdown,
    getGeoHeatmap, getLtvPrediction, exportAnalyticsData,
} from "./analytics";
import {
    getRevenueMetrics, getRevenueTrend, getRevenueByChannel,
    getSubscriptionStats, getTransactions, refundTransaction,
    getGiftCatalog, createGift, updateGift, deleteGift, uploadGiftImage,
    getPlans, createPlan, updatePlan, deletePlan,
} from "./monetization";
import {
    getSystemHealth, getFeatureFlags, updateFeatureFlag,
    getLogs, getAuditLogs,
} from "./system";
import {
    sendPush, getReferrals, getCampaigns, createCampaign,
    updateCampaign, getChannels,
} from "./marketing";
import {
    promoCodes, refunds, payments, pricingTests, promoRedemptions,
    arpuTrends, getChurnAnalysis, getForecast,
    getBoostAnalytics, getSuperlikeAnalytics,
    getAffiliates, getAffiliateStats, getUpsellOpportunities,
} from "./monetization-extra";
import type { AutoBanRulePayload } from "./types";

export const adminApi = {
    dashboard: {
        getMetrics: getDashboardMetrics,
        getActivity: getLiveActivity,
    },
    users: {
        list: getUsers,
        getDetails: getUserDetails,
        action: performUserAction,
        bulkAction: performBulkUserAction,
        create: createUser,
        delete: deleteUser,
        getVerificationQueue: getVerificationQueue,
        reviewVerification: reviewVerificationRequest,
        getSegments: getSegments,
        recalculateFraudScores: recalculateFraudScores,
        getHighRiskUsers: getHighRiskUsers,
    },
    moderation: {
        getQueue: getModerationQueue,
        review: reviewModerationItem,
        getStats: getModerationStats,
    },
    analytics: {
        getOverview: getAnalyticsOverview,
        getRetention: getRetentionCohorts,
        getFunnel: getFunnelData,
        getRealtime: getRealtimeMetrics,
        getChurnPrediction: getChurnPrediction,
        getRevenueBreakdown: getRevenueBreakdown,
        getGeoHeatmap: getGeoHeatmap,
        getLtvPrediction: getLtvPrediction,
        exportData: exportAnalyticsData,
    },
    marketing: {
        sendPush: sendPush,
        getReferrals: getReferrals,
        getCampaigns: getCampaigns,
        createCampaign: createCampaign,
        updateCampaign: updateCampaign,
        getChannels: getChannels,
    },
    monetization: {
        getRevenue: getRevenueMetrics,
        getTrend: getRevenueTrend,
        getChannels: getRevenueByChannel,
        getSubscriptions: getSubscriptionStats,
        getTransactions: getTransactions,
        refundTransaction: refundTransaction,
        getPlans: getPlans,
        createPlan: createPlan,
        updatePlan: updatePlan,
        deletePlan: deletePlan,
        gifts: {
            getCatalog: getGiftCatalog,
            create: createGift,
            update: updateGift,
            delete: deleteGift,
            uploadImage: uploadGiftImage,
        },
        promoCodes,
        refunds,
        payments,
        pricingTests,
        promoRedemptions,
        arpuTrends,
        getChurnAnalysis,
        getForecast,
        getBoostAnalytics,
        getSuperlikeAnalytics,
        getAffiliates,
        getAffiliateStats,
        getUpsellOpportunities,
    },
    system: {
        getHealth: getSystemHealth,
        getFeatureFlags: getFeatureFlags,
        updateFeatureFlag: updateFeatureFlag,
        getLogs: getLogs,
        getAuditLogs: getAuditLogs,
    },
    autoBanRules: {
        list: async () => httpClient.get('/admin/auto-ban-rules'),
        create: async (data: AutoBanRulePayload) => httpClient.post('/admin/auto-ban-rules', data),
        update: async (id: string, data: Partial<AutoBanRulePayload>) => httpClient.put(`/admin/auto-ban-rules/${id}`, data),
        delete: async (id: string) => httpClient.delete(`/admin/auto-ban-rules/${id}`),
        toggle: async (id: string) => httpClient.post(`/admin/auto-ban-rules/${id}/toggle`),
    },
    gdpr: {
        exportUserData: async (userId: string) => httpClient.get(`/admin/users/${userId}/gdpr-export`),
    },
};

export default adminApi;
