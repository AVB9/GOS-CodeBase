// =================================================================
// SERVICE WORKER - OFFLINE CACHING & PWA SUPPORT
// =================================================================

const CACHE_NAME = 'billu-diary-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/JS/app.js',
    '/JS/db.js',
    '/JS/home.js',
    '/JS/todo.js',
    '/JS/settings.js',
    '/JS/planner.js',
    '/JS/momentum.js',
    '/JS/sanitize.js',
    '/JS/config.js',
    '/JS/manifest.json',
    '/favicon.svg'
];

// Install: Pre-cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching static assets...');
            return cache.addAll(STATIC_ASSETS).catch(err => {
                console.warn('[SW] Some assets failed to cache (may not exist yet)', err);
                // Don't fail install if some assets unavailable
                return Promise.resolve();
            });
        }).then(() => {
            self.skipWaiting(); // Activate immediately
        })
    );
});

// Activate: Clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            self.clients.claim(); // Activate immediately
        })
    );
});

// Fetch: Network-first for dynamic content, cache-first for static
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip cross-origin requests
    if (url.origin !== self.location.origin) {
        return;
    }
    
    // Network-first strategy for API/dynamic content
    if (url.pathname.includes('/api/') || request.method !== 'GET') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    // Cache successful responses
                    if (response.ok && request.method === 'GET') {
                        const cache = caches.open(CACHE_NAME);
                        cache.then((c) => c.put(request, response.clone()));
                    }
                    return response;
                })
                .catch(() => {
                    // Fallback to cache if offline
                    return caches.match(request);
                })
        );
        return;
    }
    
    // Cache-first strategy for static assets
    event.respondWith(
        caches.match(request)
            .then((response) => {
                if (response) {
                    return response;
                }
                
                // Not in cache, try network
                return fetch(request)
                    .then((response) => {
                        // Cache new responses
                        if (response.ok) {
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(request, response.clone());
                            });
                        }
                        return response;
                    })
                    .catch(() => {
                        // Return offline page or error
                        if (request.destination === 'document') {
                            return caches.match('/index.html');
                        }
                        return new Response('Offline - Resource not available', {
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
            })
    );
});

// Handle messages from clients
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        caches.delete(CACHE_NAME).then(() => {
            event.ports[0].postMessage({ cleared: true });
        });
    }
});

console.log('[SW] Service Worker loaded and ready');