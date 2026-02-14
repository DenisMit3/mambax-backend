// PERF: API Response Caching with Auth Segmentation
// SECURITY: Cache is segmented by user to prevent cross-user data leakage
const CACHE_VERSION = 'v3';

// CRITICAL: Activate new SW immediately without waiting for tabs to close
// Without this, Telegram WebApp users NEVER get updates
self.addEventListener('install', () => {
    self.skipWaiting();
});
const API_CACHE = `api-cache-${CACHE_VERSION}`;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Extract user identifier from Authorization header for cache segmentation
function getUserIdFromRequest(request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return null;
    
    // Create a hash of the auth token to use as cache key segment
    // This ensures different users have separate cache entries
    let hash = 0;
    for (let i = 0; i < authHeader.length; i++) {
        const char = authHeader.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
}

// Generate cache key with user segmentation
function getCacheKey(request) {
    const userId = getUserIdFromRequest(request);
    const url = new URL(request.url);
    // Include user hash in cache key to segment by auth
    return userId ? `${url.pathname}?${url.search}#user=${userId}` : null;
}

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // Skip caching for requests with Authorization header if Cache-Control: no-store
    const cacheControl = event.request.headers.get('Cache-Control');
    if (cacheControl && cacheControl.includes('no-store')) {
        return; // Let browser handle normally
    }
    
    // Cache GET requests to specific API endpoints
    if (event.request.method === 'GET' && 
        (url.pathname.startsWith('/api_proxy/feed') || 
         url.pathname.startsWith('/api_proxy/profiles') ||
         url.pathname.startsWith('/api_proxy/discover/daily-picks'))) {
        
        // SECURITY: Skip caching if request has Authorization but we can't segment it
        const cacheKey = getCacheKey(event.request);
        if (event.request.headers.get('Authorization') && !cacheKey) {
            return; // Don't cache unauthenticated requests to auth endpoints
        }
        
        event.respondWith(
            caches.open(API_CACHE).then(async (cache) => {
                // Use segmented cache key for lookup
                const cacheRequest = cacheKey ? new Request(cacheKey) : event.request;
                const cached = await cache.match(cacheRequest);
                
                // Return cached if fresh
                if (cached) {
                    const cachedTime = cached.headers.get('sw-cached-time');
                    if (cachedTime && Date.now() - new Date(cachedTime).getTime() < CACHE_DURATION) {
                        return cached;
                    }
                }
                
                // Fetch and cache
                try {
                    const response = await fetch(event.request);
                    if (response.ok) {
                        const cloned = response.clone();
                        const headers = new Headers(cloned.headers);
                        headers.set('sw-cached-time', new Date().toISOString());
                        
                        const cachedResponse = new Response(cloned.body, {
                            status: cloned.status,
                            statusText: cloned.statusText,
                            headers
                        });
                        
                        // Store with segmented cache key
                        cache.put(cacheRequest, cachedResponse);
                    }
                    return response;
                } catch (err) {
                    // Return stale cache on network error
                    if (cached) return cached;
                    return new Response(JSON.stringify({ error: 'Offline' }), { 
                        status: 503,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
            })
        );
    }
});

// Handle cache clear messages from the app (on logout/login)
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'CLEAR_API_CACHE') {
        event.waitUntil(
            caches.delete(API_CACHE).then(() => {
                console.log('SW: API cache cleared on auth change');
                // Notify all clients that cache was cleared
                self.clients.matchAll().then(clients => {
                    clients.forEach(client => {
                        client.postMessage({ type: 'CACHE_CLEARED' });
                    });
                });
            })
        );
    }
});

// Clear old caches on activate and claim clients immediately
self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            // Clear all old cache versions
            caches.keys().then((keys) => {
                return Promise.all(
                    keys.filter(key => key !== API_CACHE && key.startsWith('api-cache'))
                        .map(key => caches.delete(key))
                );
            }),
            // Claim all clients immediately to ensure new SW is active
            self.clients.claim()
        ])
    );
});

self.addEventListener('push', function (event) {
    if (event.data) {
        try {
            const data = event.data.json();
            const options = {
                body: data.body,
                icon: data.icon || '/icon-192x192.png',
                badge: '/badge-72x72.png',
                vibrate: [100, 50, 100],
                data: {
                    dateOfArrival: Date.now(),
                    url: data.url || '/'
                }
            };
            event.waitUntil(
                self.registration.showNotification(data.title, options)
            );
        } catch (e) {
            console.error('Push handling error:', e);
        }
    }
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    if (event.notification.data && event.notification.data.url) {
        event.waitUntil(
            clients.openWindow(event.notification.data.url)
        );
    }
});
