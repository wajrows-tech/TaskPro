// Service Worker for TaskPro
// Caches static assets and provides offline fallback routes

const CACHE_NAME = 'taskpro-os-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    // In Vite, JS/CSS bundles are hashed, so we'll rely on fetch events to cache them dynamically
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Precaching static assets');
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Network-first for API, Cache-first for static assets
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Completely bypass caching for SSE / Event streams
    if (url.pathname.startsWith('/api/events')) {
        return;
    }

    // API Requests: Network First, fallback to Cache
    if (url.pathname.startsWith('/api/')) {
        if (event.request.method !== 'GET') {
            // Don't cache POST/PUT/DELETE, let the application handle offline queueing
            return;
        }

        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    const clonedResponse = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, clonedResponse);
                    });
                    return response;
                })
                .catch(() => {
                    return caches.match(event.request).then((response) => {
                        if (response) {
                            return response;
                        }
                        // If offline and no cache, return appropriate JSON error
                        return new Response(
                            JSON.stringify({ error: 'You are offline and no cached data is available for this route.' }),
                            { status: 503, headers: { 'Content-Type': 'application/json' } }
                        );
                    });
                })
        );
        return;
    }

    // Static Assets: Cache First, fallback to Network
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request).then((networkResponse) => {
                // Only cache successful GET requests for http/https
                if (event.request.method === 'GET' && networkResponse.ok && event.request.url.startsWith('http')) {
                    const clonedResponse = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, clonedResponse);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // If offline and trying to navigate to a new page, return index.html for SPA routing
                if (event.request.mode === 'navigate') {
                    return caches.match('/index.html');
                }
            });
        })
    );
});

// Background Sync (if supported by browser) for offline pending mutations
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-mutations') {
        console.log('[Service Worker] Background sync triggered');
        // The actual sync logic resides in the application code (SyncService),
        // we just notify all clients to attempt a flush.
        event.waitUntil(
            self.clients.matchAll().then(clients => {
                clients.forEach(client => client.postMessage({ type: 'FLUSH_SYNC_QUEUE' }));
            })
        );
    }
});
