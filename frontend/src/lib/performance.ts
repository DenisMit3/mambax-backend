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

export function measurePerformance(): void {
    if (typeof window === 'undefined') return;
    
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
            
            // Log metrics
            console.log('📊 Performance Metrics:', metrics);
            
            // Check against targets
            if (metrics.fcp !== undefined) {
                if (metrics.fcp < 1500) {
                    console.log('✅ FCP < 1.5s:', Math.round(metrics.fcp), 'ms');
                } else {
                    console.warn('⚠️ FCP > 1.5s:', Math.round(metrics.fcp), 'ms');
                }
            }
            
            if (metrics.tti !== undefined) {
                if (metrics.tti < 3000) {
                    console.log('✅ TTI < 3s:', Math.round(metrics.tti), 'ms');
                } else {
                    console.warn('⚠️ TTI > 3s:', Math.round(metrics.tti), 'ms');
                }
            }
            
            // Send to analytics if available
            if (typeof window !== 'undefined' && (window as any).posthog) {
                (window as any).posthog.capture('performance_metrics', metrics);
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
            if (!(entry as any).hadRecentInput) {
                clsValue += (entry as any).value;
            }
        }
        callback(clsValue);
    });
    
    observer.observe({ type: 'layout-shift', buffered: true });
}
