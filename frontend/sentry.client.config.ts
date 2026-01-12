import * as Sentry from "@sentry/nextjs";

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Only enable in production
    enabled: process.env.NODE_ENV === "production",

    // Performance Monitoring
    tracesSampleRate: 0.1, // 10% of transactions for performance monitoring

    // Session Replay (optional)
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Environments
    environment: process.env.NODE_ENV,

    // Additional settings
    debug: false,

    // Ignore certain errors
    ignoreErrors: [
        // Random plugins/extensions
        "top.GLOBALS",
        // Facebook borance error
        "fb_xd_fragment",
        // Network errors
        "NetworkError",
        "ChunkLoadError",
    ],
});
