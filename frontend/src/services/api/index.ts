/**
 * API Service — barrel export
 * Backward-compatible: `authService` aggregates all sub-APIs so existing imports keep working.
 */

export * from "./types";

import { authApi } from "./auth";
import { chatApi } from "./chat";
import { discoveryApi } from "./discovery";
import { giftsApi } from "./gifts";
import { monetizationApi } from "./monetization";
import { notificationsApi } from "./notifications";
import { settingsApi } from "./settings";
import { socialApi } from "./social";

/**
 * Unified authService object — full backward compatibility.
 * All methods from the old monolithic api.ts are available here.
 */
export const authService = {
    // Auth & Profile
    ...authApi,
    // Chat & Matches
    ...chatApi,
    // Discovery, Swipes, Likes
    ...discoveryApi,
    // Virtual Gifts
    ...giftsApi,
    // Monetization, Payments, Subscriptions, Boost
    ...monetizationApi,
    // Notifications & Push
    ...notificationsApi,
    // Settings
    ...settingsApi,
    // Social (referrals, rewards, events, stories, feedback, help, analytics, onboarding, interests, prompts, safety)
    ...socialApi,
};

// Named sub-API exports for granular imports
export { authApi, chatApi, discoveryApi, giftsApi, monetizationApi, notificationsApi, settingsApi, socialApi };
