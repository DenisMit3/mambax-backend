import { getApiUrl } from "@/utils/env";

type RequestConfig = RequestInit & {
    skipAuth?: boolean;
    silent?: boolean;
};

class HttpClient {
    private baseUrl: string;
    private customToken: string | null = null;
    
    // Re-auth mutex: prevents multiple parallel 401 handlers from firing
    private reAuthPromise: Promise<boolean> | null = null;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    private get token(): string | null {
        if (this.customToken) return this.customToken;
        if (typeof window !== 'undefined') {
            return localStorage.getItem('accessToken') || localStorage.getItem('token');
        }
        return null;
    }

    private set token(value: string | null) {
        if (typeof window !== 'undefined') {
            if (value) {
                localStorage.setItem('accessToken', value);
                localStorage.removeItem('token');
            } else {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('token');
            }
        }
        this.customToken = value;
    }

    /**
     * Try to re-authenticate using Telegram initData.
     * Uses a mutex so only one re-auth runs at a time.
     */
    private async tryReAuth(): Promise<boolean> {
        // If re-auth is already in progress, wait for it
        if (this.reAuthPromise) {
            return this.reAuthPromise;
        }

        this.reAuthPromise = this._doReAuth();
        try {
            return await this.reAuthPromise;
        } finally {
            this.reAuthPromise = null;
        }
    }

    private async _doReAuth(): Promise<boolean> {
        if (typeof window === 'undefined') return false;

        const initData = window.Telegram?.WebApp?.initData || sessionStorage.getItem('tg_init_data') || '';
        if (!initData || !initData.trim()) return false;

        try {
            console.log('[HTTP] Attempting Telegram re-auth...');
            const res = await fetch(`${this.baseUrl}/api/auth/telegram`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ init_data: initData }),
            });

            if (res.ok) {
                const data = await res.json();
                if (data.access_token) {
                    this.setToken(data.access_token);
                    console.log('[HTTP] Re-auth success');
                    return true;
                }
            }
            console.warn('[HTTP] Re-auth failed, status:', res.status);
            return false;
        } catch (err) {
            console.error('[HTTP] Re-auth error:', err);
            return false;
        }
    }

    public async request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
        const { skipAuth, silent, headers, ...customConfig } = config;
        const url = `${this.baseUrl}${endpoint}`;

        console.log(`[HTTP] ${customConfig.method || 'GET'} ${endpoint} (skipAuth=${!!skipAuth}, hasToken=${!!this.token})`);

        const reqHeaders = new Headers(headers);

        if (!skipAuth) {
            const token = this.token;
            if (token) {
                reqHeaders.set('Authorization', `Bearer ${token}`);
            }
        }

        // Set Content-Type only if not FormData
        if (!(customConfig.body instanceof FormData)) {
            if (!reqHeaders.has('Content-Type')) {
                reqHeaders.set('Content-Type', 'application/json');
            }
        }

        const mergedConfig: RequestInit = {
            ...customConfig,
            headers: reqHeaders,
        };

        try {
            const response = await fetch(url, mergedConfig);

            if (response.status === 401 && !skipAuth && !endpoint.includes('/auth/')) {
                // Try re-auth via Telegram (with mutex)
                const reAuthed = await this.tryReAuth();
                
                if (reAuthed) {
                    // Retry the original request with new token
                    reqHeaders.set('Authorization', `Bearer ${this.token}`);
                    const retryResponse = await fetch(url, { ...mergedConfig, headers: reqHeaders });
                    
                    if (retryResponse.ok) {
                        if (retryResponse.status === 204) return {} as T;
                        return await retryResponse.json();
                    }
                    
                    // Retry also failed — throw with status
                    const retryError = await retryResponse.json().catch(() => ({}));
                    const err = new Error((retryError as Record<string, string>).detail || 'Request failed after re-auth') as Error & { status: number };
                    err.status = retryResponse.status;
                    throw err;
                }
                
                // Re-auth failed — clear token, let React components handle redirect
                this.clearToken();
                const err = new Error('Unauthorized') as Error & { status: number };
                err.status = 401;
                throw err;
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const error = new Error(errorData.detail || errorData.message || 'Request failed') as Error & { status: number; data: Record<string, unknown> };
                error.status = response.status;
                error.data = errorData;
                throw error;
            }

            if (response.status === 204) {
                return {} as T;
            }

            return await response.json();
        } catch (error: unknown) {
            this.handleError(error, silent);
            throw error;
        }
    }

    private handleError(error: unknown, silent?: boolean) {
        if (silent) {
            if (process.env.NODE_ENV === 'development') {
                console.debug('[API Silent Error]', error);
            }
            return;
        }

        const err = error as Error & { status?: number; data?: { detail?: string }; message?: string };

        if (process.env.NODE_ENV === 'development') {
            if (err.status && err.status >= 400 && err.status < 500) {
                console.warn('[API]', err.status, err.message);
            } else {
                console.error('[API Error]', err);
            }
        } else {
            // Log error in production
            console.error('[API Error]', err.status, err.data?.detail);
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
