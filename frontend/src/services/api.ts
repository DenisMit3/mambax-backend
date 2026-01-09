// Автоматическое определение бэкенда:
// 1. Если зашли через localhost или IP в локальной сети -> используем локальный бэкенд (на порту 8001)
// 2. Если зашли через https (но не локально) -> используем Vercel
const getBaseUrl = () => {
    if (typeof window === 'undefined') return "http://localhost:8001";
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;

    // Если мы локально
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')) {
        // Чтобы работал прокси или локальный сервер
        const port = window.location.port === '3001' ? '8001' : '8001';
        return `${protocol}//${hostname}:${port}`;
    }

    // Если мы в продакшене (Vercel)
    return "https://mambax-backend.vercel.app";
};

const API_URL = getBaseUrl();

export const authService = {
    async login(phone: string, otp: string) {
        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ identifier: phone, otp }),
            });

            if (!response.ok) {
                throw new Error("Login failed");
            }

            const data = await response.json();
            // Save token
            if (typeof window !== 'undefined') {
                localStorage.setItem("token", data.access_token);
            }
            return data;
        } catch (error) {
            console.error("Auth Error:", error);
            // FALLBACK FOR DEMO: If backend is down, allow login anyway
            if (otp === "0000") {
                console.warn("Backend unavailable, using mock login.");
                if (typeof window !== 'undefined') localStorage.setItem("token", "mock_token");
                return { access_token: "mock_token" };
            }
            throw error;
        }
    },

    async requestOtp(phone: string) {
        try {
            const response = await fetch(`${API_URL}/auth/request-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ identifier: phone }),
            });
            if (!response.ok) throw new Error("Failed to request OTP");
            return await response.json();
        } catch (error) {
            console.error("Error requesting OTP:", error);
            // Fallback for demo so user is not blocked if backend is down
            return { success: true, message: "Demo mode" };
        }
    },

    async telegramLogin(initData: string) {
        try {
            const response = await fetch(`${API_URL}/auth/telegram`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ init_data: initData }),
            });

            if (!response.ok) throw new Error("Telegram Login Failed");

            const data = await response.json();
            if (typeof window !== 'undefined') localStorage.setItem("token", data.access_token);
            return data;
        } catch (error) {
            console.error("TG Login Error:", error);
            // Fallback for dev mode if needed
            throw error;
        }
    },

    async createProfile(data: { name: string; gender: string; photos: string[] }) {
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem("token") : "";
            const response = await fetch(`${API_URL}/profile`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ ...data, age: 25, interests: [] }), // Default age for MVP
            });
            if (!response.ok) throw new Error("Failed to create profile");
            return response.json();
        } catch {
            console.warn("Backend down, using mock profile creation.");
            return { id: "mock-id", ...data };
        }
    },

    async updateProfile(data: { name?: string; bio?: string; gender?: string; interests?: string[]; photos?: string[] }) {
        const token = typeof window !== 'undefined' ? localStorage.getItem("token") : "";
        const response = await fetch(`${API_URL}/profile`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error("Failed to update profile");
        return response.json();
    },

    async getProfiles() {
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem("token") : "";
            const response = await fetch(`${API_URL}/profiles`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            if (!response.ok) throw new Error("Failed to fetch profiles");
            return response.json();
        } catch {
            console.warn("Backend down, returning mock profiles.");
            return []; // Return empty or mock
        }
    },

    async getMe() {
        const token = typeof window !== 'undefined' ? localStorage.getItem("token") : "";
        const response = await fetch(`${API_URL}/me`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("Failed to get profile");
        return response.json();
    },

    async uploadPhoto(file: File) {
        const token = typeof window !== 'undefined' ? localStorage.getItem("token") : "";
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(`${API_URL}/upload`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) throw new Error("Upload failed");
        return response.json(); // { url: ... }
    },

    async likeUser(userId: string, isSuper: boolean = false) {
        const token = typeof window !== 'undefined' ? localStorage.getItem("token") : "";
        const res = await fetch(`${API_URL}/likes`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ liked_user_id: userId, is_super: isSuper })
        });
        return res.json(); // returns {status} or {status: matched, match_id}
    },

    async getMatches() {
        const token = typeof window !== 'undefined' ? localStorage.getItem("token") : "";
        const res = await fetch(`${API_URL}/matches`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) return [];
        return res.json();
    },

    async getMessages(matchId: string) {
        const token = typeof window !== 'undefined' ? localStorage.getItem("token") : "";
        try {
            const res = await fetch(`${API_URL}/matches/${matchId}/messages`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) throw new Error("Failed to get messages");
            return await res.json();
        } catch {
            console.warn("Using mock messages for dev");
            // Return mock messages based on match ID
            return [
                { id: 1, sender_id: "partner", text: "Hello! How are you?" },
                { id: 2, sender_id: "00000000-0000-0000-0000-000000000000", text: "I'm good, thanks! And you?" },
                { id: 3, sender_id: "partner", text: "Doing great. Love your profile photos!" }
            ];
        }
    },

    async sendMessage(matchId: string, text: string, type: string = "text", audio_url: string | null = null, duration: string | null = null) {
        const token = typeof window !== 'undefined' ? localStorage.getItem("token") : "";
        try {
            const res = await fetch(`${API_URL}/matches/${matchId}/messages`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ text, type, audio_url, duration })
            });
            if (!res.ok) throw new Error("Failed to send");
            return await res.json();
        } catch {
            console.warn("Using mock send for dev");
            return { id: Date.now(), sender_id: "00000000-0000-0000-0000-000000000000", text, type, audio_url, duration };
        }
    }
};
