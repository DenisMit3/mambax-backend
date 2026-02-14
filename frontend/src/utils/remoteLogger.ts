/**
 * Remote Logger - sends all console logs to backend for debugging
 * Logs are saved to a file that can be monitored
 */

const API_BASE = '/api_proxy'; // Use relative path with proxy prefix
const LOG_ENDPOINT = `${API_BASE}/debug/logs`;

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
    level: LogLevel;
    message: string;
    args: unknown[];
    timestamp: string;
    url: string;
    userAgent: string;
}

// Store original console methods
const originalConsole = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug.bind(console),
};

// Queue to batch logs
let logQueue: LogEntry[] = [];
let flushTimeout: NodeJS.Timeout | null = null;

// Send logs to backend
async function sendLogs(logs: LogEntry[]) {
    try {
        await fetch(LOG_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ logs }),
        });
    } catch (e) {
        // Silently fail - don't want to cause infinite loop
        originalConsole.warn('[RemoteLogger] Failed to send logs:', e);
    }
}

// Flush queued logs
function flushLogs() {
    if (logQueue.length > 0) {
        const logsToSend = [...logQueue];
        logQueue = [];
        sendLogs(logsToSend);
    }
    flushTimeout = null;
}

// Schedule flush (batches logs for efficiency)
function scheduleFlush() {
    if (!flushTimeout) {
        flushTimeout = setTimeout(flushLogs, 500); // Send every 500ms
    }
}

// Serialize arguments to string
function serializeArgs(args: unknown[]): string {
    return args.map(arg => {
        if (arg === undefined) return 'undefined';
        if (arg === null) return 'null';
        if (typeof arg === 'object') {
            try {
                return JSON.stringify(arg, null, 2);
            } catch {
                return String(arg);
            }
        }
        return String(arg);
    }).join(' ');
}

// Create log interceptor
function createInterceptor(level: LogLevel) {
    return (...args: unknown[]) => {
        // Call original console method
        originalConsole[level](...args);

        // Add to queue
        const entry: LogEntry = {
            level,
            message: serializeArgs(args),
            args: args.map(a => {
                try {
                    return JSON.parse(JSON.stringify(a));
                } catch {
                    return String(a);
                }
            }),
            timestamp: new Date().toISOString(),
            url: typeof window !== 'undefined' ? window.location.href : 'SSR',
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'SSR',
        };

        logQueue.push(entry);
        scheduleFlush();
    };
}

// Global error handler
function setupErrorHandler() {
    if (typeof window !== 'undefined') {
        window.addEventListener('error', (event) => {
            const entry: LogEntry = {
                level: 'error',
                message: `[Uncaught Error] ${event.message} at ${event.filename}:${event.lineno}:${event.colno}`,
                args: [{ message: event.message, filename: event.filename, lineno: event.lineno }],
                timestamp: new Date().toISOString(),
                url: window.location.href,
                userAgent: navigator.userAgent,
            };
            logQueue.push(entry);
            flushLogs(); // Immediately flush errors
        });

        window.addEventListener('unhandledrejection', (event) => {
            const entry: LogEntry = {
                level: 'error',
                message: `[Unhandled Promise Rejection] ${event.reason}`,
                args: [{ reason: String(event.reason) }],
                timestamp: new Date().toISOString(),
                url: window.location.href,
                userAgent: navigator.userAgent,
            };
            logQueue.push(entry);
            flushLogs(); // Immediately flush errors
        });
    }
}

// Initialize remote logging
export function initRemoteLogger() {
    if (typeof window === 'undefined') return; // Only in browser

    // Check if already initialized
    if (window.__remoteLoggerInitialized) return;
    window.__remoteLoggerInitialized = true;

    // Override console methods
    console.log = createInterceptor('log');
    console.info = createInterceptor('info');
    console.warn = createInterceptor('warn');
    console.error = createInterceptor('error');
    console.debug = createInterceptor('debug');

    // Setup global error handlers
    setupErrorHandler();

    // Send init message
    console.debug('[RemoteLogger] 📱 Remote logging initialized from:', navigator.userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop');

    // Flush on page unload
    window.addEventListener('beforeunload', flushLogs);
}

// Utility to manually send a log
export function remoteLog(level: LogLevel, ...args: unknown[]) {
    createInterceptor(level)(...args);
}
