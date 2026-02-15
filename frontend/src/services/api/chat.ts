/**
 * Chat & Matches API
 */

import { httpClient } from "@/lib/http-client";
import type { Match, MatchesResponse } from "./types";

export const chatApi = {
    async startChat(userId: string): Promise<{ match_id: string; is_new: boolean }> {
        return httpClient.post<{ match_id: string; is_new: boolean }>(`/api/chat/start/${userId}`);
    },

    async getMatches() {
        const data = await httpClient.get<MatchesResponse | { matches: Match[] }>("/api/matches");
        if ('matches' in data) {
            return data.matches;
        }
        return data as unknown as Match[];
    },

    async getMatch(matchId: string): Promise<Match> {
        return httpClient.get<Match>(`/api/matches/${matchId}`);
    },

    async getMessages(matchId: string) {
        return httpClient.get(`/api/matches/${matchId}/messages`);
    },

    async sendMessage(matchId: string, text: string, type: string = "text", audio_url: string | null = null, duration: string | null = null) {
        return httpClient.post("/api/chat/send", {
            match_id: matchId,
            text,
            type,
            media_url: audio_url,
            duration: duration ? parseInt(duration as string) : undefined
        });
    },

    async uploadChatMedia(file: File) {
        const formData = new FormData();
        formData.append("file", file);
        return httpClient.post("/api/chat/upload", formData);
    },

    async getIcebreakers(matchId: string, refresh = false) {
        const params = new URLSearchParams({ match_id: matchId });
        if (refresh) params.set("refresh", "true");
        return httpClient.get<{ icebreakers: string[] }>(`/api/chat/icebreakers?${params}`);
    },

    async recordIcebreakerUsed(matchId: string) {
        return httpClient.post(`/api/chat/icebreakers/used?match_id=${encodeURIComponent(matchId)}`);
    },

    async getConversationPrompts(matchId: string) {
        return httpClient.get<{ prompts: string[]; stalled: boolean }>(`/api/chat/conversation-prompts?match_id=${encodeURIComponent(matchId)}`);
    },

    async getQuestionOfDay() {
        return httpClient.get<{ question: string; date: string }>("/api/chat/question-of-day");
    },

    async postQuestionOfDayAnswer(matchId: string, answer: string) {
        return httpClient.post<{ status: string; partner_answered: boolean }>("/api/chat/question-of-day/answer", { match_id: matchId, answer });
    },
};
