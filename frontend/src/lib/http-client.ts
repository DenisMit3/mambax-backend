import { getApiUrl } from "@/utils/env";
import * as Sentry from "@sentry/nextjs";

type RequestConfig = RequestInit & {
    skipAuth?: boolean;
    silent?: boolean;
};

class HttpClient {
    private baseUrl: string;
    private customToken: string | null = null;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    private get token(): string | null {
        if (this.customToken) return this.customToken;
        if (typeof window !== 'undefined') {
            // FIX: Standardize on 'accessToken' to match other components
            return localStorage.getItem('accessToken') || localStorage.getItem('token');
        }
        return null;
    }

    private set token(value: string | null) {
        if (typeof window !== 'undefined') {
            if (value) {
                localStorage.setItem('accessToken', value);
                // remove legacy key to avoid confusion
                localStorage.removeItem('token');
            } else {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('token');
            }
        }
        // Also set internal state for potential server-side persistence in same lifecycle (rare case)
        this.customToken = value;
    }
    public async request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
        const { skipAuth, silent, headers, ...customConfig } = config;
        const url = `${this.baseUrl}${endpoint}`;

        // Use Headers object to manage headers robustly
        const reqHeaders = new Headers(headers);

        if (!skipAuth) {
            const token = this.token;
            if (token) {
                reqHeaders.set('Authorization', `Bearer ${token}`);
            }
        }

        // Set Content-Type only if not FormData (browser sets boundary automatically)
        if (!(customConfig.body instanceof FormData)) {
            if (!reqHeaders.has('Content-Type')) {
                reqHeaders.set('Content-Type', 'application/json');
            }
        }

        // Create the final config object
        const mergedConfig: RequestInit = {
            ...customConfig,
            headers: reqHeaders,
        };

        try {
            const response = await fetch(url, mergedConfig);

            if (response.status === 401) {
                this.handleUnauthorized();
                throw new Error('Unauthorized');
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const error: any = new Error(errorData.detail || errorData.message || 'Request failed');
                error.status = response.status;
                error.data = errorData;
                throw error;
            }

            // Handle empty responses (like 204 No Content)
            if (response.status === 204) {
                return {} as T;
            }

            return await response.json();
        } catch (error: any) {
            this.handleError(error, silent);
            throw error;
        }
    }

    private handleUnauthorized() {
        // Only clear token in browser context to avoid side effects on server
        if (typeof window !== 'undefined') {
            console.warn('Unauthorized access detected. Clearing token and redirecting.');
            localStorage.removeItem('token');
            localStorage.removeItem('accessToken'); // Clear both just in case
            window.location.href = '/auth/phone';
        }
        this.customToken = null;
    }

    private handleError(error: any, silent?: boolean) {
        if (silent) {
            // FIX: Don't completely swallow silent errors, log them at debug level
            if (process.env.NODE_ENV === 'development') {
                console.debug('[API Silent Error]', error);
            }
            return;
        }

        // Отправлять критические ошибки аутентификации Telegram в Sentry
        if (error.status === 401 && typeof window !== 'undefined') {
            const hasTelegramData = !!window.Telegram?.WebApp?.initData;
            const isTelegramAuthError = error.message?.toLowerCase().includes('telegram') || 
                                        error.data?.detail?.toLowerCase().includes('telegram') ||
                                        hasTelegramData;
            
            if (isTelegramAuthError) {
                Sentry.captureException(error, {
                    tags: {
                        error_type: 'telegram_auth_failure',
                        initData_present: hasTelegramData,
                        error_message: error.message || 'Unknown'
                    },
                    extra: {
                        url: error.url,
                        status: error.status,
                        detail: error.data?.detail
                    }
                });
            }
        }

        if (process.env.NODE_ENV === 'development') {
            // Use warn for typical API errors to reduce console noise, error for unexpected
            if (error.status && error.status >= 400 && error.status < 500) {
                console.warn('[API Warn]', error.message);
            } else {
                console.error('[API Error]', error);
            }
        } else {
            Sentry.captureException(error);
        }
    }

    // Public API
    public get<T>(endpoint: string, config?: RequestConfig) {
        return this.request<T>(endpoint, { ...config, method: 'GET' });
    }

    public post<T>(endpoint: string, body?: any, config?: RequestConfig) {
        return this.request<T>(endpoint, {
            ...config,
            method: 'POST',
            body: body instanceof FormData ? body : JSON.stringify(body),
        });
    }

    public put<T>(endpoint: string, body?: any, config?: RequestConfig) {
        return this.request<T>(endpoint, {
            ...config,
            method: 'PUT',
            body: body instanceof FormData ? body : JSON.stringify(body),
        });
    }

    public patch<T>(endpoint: string, body?: any, config?: RequestConfig) {
        return this.request<T>(endpoint, {
            ...config,
            method: 'PATCH',
            body: body instanceof FormData ? body : JSON.stringify(body),
        });
    }

    public delete<T>(endpoint: string, config?: RequestConfig) {
        return this.request<T>(endpoint, { ...config, method: 'DELETE' });
    }

    // Auth Helpers
    public setToken(token: string) {
        this.token = token;
    }

    public clearToken() {
        this.token = null;
    }

    public logout() {
        this.clearToken();
        if (typeof window !== 'undefined') {
            window.location.href = '/auth/phone';
        }
    }

    public isAuthenticated(): boolean {
        return !!this.token;
    }
}

export const httpClient = new HttpClient(getApiUrl());
