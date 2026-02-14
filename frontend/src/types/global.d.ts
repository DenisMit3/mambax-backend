// Глобальные расширения Window для сторонних SDK и внутренних флагов

export {};

declare global {
  interface Window {
    /** Telegram WebApp SDK */
    Telegram?: {
      WebApp?: {
        initData?: string;
        initDataUnsafe?: Record<string, unknown>;
        version?: string;
        openInvoice?: (url: string, callback: (status: string) => void) => void;
        close?: () => void;
        expand?: () => void;
        ready?: () => void;
        MainButton?: {
          text: string;
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
        };
        HapticFeedback?: {
          impactOccurred: (style: string) => void;
          notificationOccurred: (type: string) => void;
          selectionChanged: () => void;
        };
      };
    };
    /** Sentry error tracking */
    Sentry?: {
      captureException: (error: unknown, context?: Record<string, unknown>) => void;
    };
    /** PostHog analytics */
    posthog?: {
      capture: (event: string, properties?: Record<string, unknown>) => void;
    };
    /** Флаг инициализации remote logger */
    __remoteLoggerInitialized?: boolean;
  }
}
