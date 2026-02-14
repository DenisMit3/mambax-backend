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
                console.error('[HTTP] 401 on', endpoint, '- token present:', !!this.token);
                
                // If inside Telegram WebApp, try to re-authenticate before giving up
                const initData = typeof window !== 'undefined' 
                    ? (window.Telegram?.WebApp?.initData || sessionStorage.getItem('tg_init_data') || '')
                    : '';
                
                if (initData && initData.trim() && !endpoint.includes('/auth/')) {
                    console.log('[HTTP] 401 but have Telegram initData, attempting re-auth...');
                    try {
                        const reAuthRes = await fetch(`${this.baseUrl}/api/auth/telegram`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ init_data: initData }),
                        });
                        if (reAuthRes.ok) {
                            const reAuthData = await reAuthRes.json();
                            if (reAuthData.access_token) {
                                this.setToken(reAuthData.access_token);
                                console.log('[HTTP] Re-auth success, retrying original request');
                                // Retry original request with new token
                                reqHeaders.set('Authorization', `Bearer ${reAuthData.access_token}`);
                                const retryResponse = await fetch(url, { ...mergedConfig, headers: reqHeaders });
                                if (retryResponse.ok) {
                                    if (retryResponse.status === 204) return {} as T;
                                    return await retryResponse.json();
                                }
                                // Re-auth worked but retry failed with non-401 — don't clear the new valid token
                                if (retryResponse.status !== 401) {
                                    const retryError = await retryResponse.json().catch(() => ({}));
                                    const err = new Error((retryError as Record<string, string>).detail || 'Retry failed') as Error & { status: number };
                                    err.status = retryResponse.status;
                                    throw err;
                                }
                            }
                        }
                    } catch (reAuthErr) {
                        // If it's a rethrown retry error (not a network error), propagate it
                        if (reAuthErr instanceof Error && (reAuthErr as Error & { status?: number }).status) {
                            throw reAuthErr;
                        }
                        console.error('[HTTP] Re-auth failed:', reAuthErr);
                    }
                }
                
                this.handleUnauthorized();
                throw new Error('Unauthorized');
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const error = new Error(errorData.detail || errorData.message || 'Request failed') as Error & { status: number; data: Record<string, unknown> };
                error.status = response.status;
                error.data = errorData;
                throw error;
            }

            // Handle empty responses (like 204 No Content)
            if (response.status === 204) {
                return {} as T;
            }

            return await response.json();
        } catch (error: unknown) {
            this.handleError(error, silent);
            throw error;
        }
    }

    private handleUnauthorized() {
        // Only clear token in browser context to avoid side effects on server
        if (typeof window !== 'undefined') {
            console.warn('[HTTP] handleUnauthorized: clearing token (no redirect — let React handle it)');
            localStorage.removeItem('token');
            localStorage.removeItem('accessToken');
        }
        this.customToken = null;
    }

    private handleError(error: unknown, silent?: boolean) {
        if (silent) {
            // FIX: Don't completely swallow silent errors, log them at debug level
            if (process.env.NODE_ENV === 'development') {
                console.debug('[API Silent Error]', error);
            }
            return;
        }

        const err = error as Error & { status?: number; data?: { detail?: string }; url?: string; message?: string };
        // Отправлять критические ошибки аутентификации Telegram в Sentry
        if (err.status === 401 && typeof window !== 'undefined') {
            const hasTelegramData = !!window.Telegram?.WebApp?.initData;
            const isTelegramAuthError = err.message?.toLowerCase().includes('telegram') || 
                                        err.data?.detail?.toLowerCase().includes('telegram') ||
                                        hasTelegramData;
            
            if (isTelegramAuthError) {
                Sentry.captureException(err, {
                    tags: {
                        error_type: 'telegram_auth_failure',
                        initData_present: hasTelegramData,
                        error_message: err.message || 'Unknown'
                    },
                    extra: {
                        url: err.url,
                        status: err.status,
                        detail: err.data?.detail
                    }
                });
            }
        }

        if (process.env.NODE_ENV === 'development') {
            // Use warn for typical API errors to reduce console noise, error for unexpected
            if (err.status && err.status >= 400 && err.status < 500) {
                console.warn('[API Warn]', err.message);
            } else {
                console.error('[API Error]', err);
            }
        } else {
            Sentry.captureException(err);
        }
    }

    // Public API
    public get<T>(endpoint: string, config?: RequestConfig) {
        return this.request<T>(endpoint, { ...config, method: 'GET' });
    }

    public post<T>(endpoint: string, body?: unknown, config?: RequestConfig) {
        return this.request<T>(endpoint, {
            ...config,
            method: 'POST',
            body: body instanceof FormData ? body : JSON.stringify(body),
        });
    }

    public put<T>(endpoint: string, body?: unknown, config?: RequestConfig) {
        return this.request<T>(endpoint, {
            ...config,
            method: 'PUT',
            body: body instanceof FormData ? body : JSON.stringify(body),
        });
    }

    public patch<T>(endpoint: string, body?: unknown, config?: RequestConfig) {
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
