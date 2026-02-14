/**
 * PERF: Performance Monitoring Utilities
 * Tracks FCP, TTI, and other Core Web Vitals
 */

interface PerformanceMetrics {
    fcp?: number;
    lcp?: number;
    tti?: number;
    loadTime?: number;
    cls?: number;
}

let _perfInitialized = false;

export function measurePerformance(): void {
    if (typeof window === 'undefined') return;
    if (_perfInitialized) return;
    _perfInitialized = true;
    
    window.addEventListener('load', () => {
        // Wait for all metrics to be available
        setTimeout(() => {
            const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
            const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
            
            const metrics: PerformanceMetrics = {
                fcp: fcpEntry?.startTime,
                tti: perfData ? perfData.domInteractive - perfData.fetchStart : undefined,
                loadTime: perfData ? perfData.loadEventEnd - perfData.fetchStart : undefined
            };
            
            // Send to analytics if available
            if (typeof window !== 'undefined' && window.posthog) {
                window.posthog.capture('performance_metrics', metrics);
            }
        }, 0);
    });
}

/**
 * Observe Largest Contentful Paint
 */
export function observeLCP(callback: (lcp: number) => void): void {
    if (typeof window === 'undefined') return;
    
    const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        callback(lastEntry.startTime);
    });
    
    observer.observe({ type: 'largest-contentful-paint', buffered: true });
}

/**
 * Observe Cumulative Layout Shift
 */
export function observeCLS(callback: (cls: number) => void): void {
    if (typeof window === 'undefined') return;
    
    let clsValue = 0;
    
    const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
            const layoutShift = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
            if (!layoutShift.hadRecentInput) {
                clsValue += layoutShift.value ?? 0;
            }
        }
        callback(clsValue);
    });
    
    observer.observe({ type: 'layout-shift', buffered: true });
}
