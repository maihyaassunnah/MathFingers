const CACHE_NAME = 'math-finggers-cache-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.png',
  '/icon.svg',
  '/logo.png',
  '/src/main.tsx',
  '/src/index.css',
  '/src/App.tsx'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell and static assets');
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('[Service Worker] Static assets cache pre-fill skipped or failed', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event with dynamic network-falling-back-to-cache and runtime caching
self.addEventListener('fetch', (event) => {
  // Only handle GET requests and skip Supabase/Firebase/External API requests to prevent cache issues
  if (event.request.method !== 'GET' || 
      event.request.url.includes('supabase.co') || 
      event.request.url.includes('firestore.googleapis.com') ||
      event.request.url.includes('chrome-extension://')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch fresh copy in the background (stale-while-revalidate pattern)
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => { /* Ignore background fetch failures */ });
          
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          // Cache newly requested site resource dynamically
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch(() => {
          // If network is down and request is for page navigation, return index.html from cache
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
    })
  );
});

// --- BACKGROUND SYNC MECHANISMS ---

// Helper to open IndexedDB
function openSyncDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('supabase-sync-db', 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('sync-requests')) {
        db.createObjectStore('sync-requests', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

// Get all pending sync requests
function getSyncRequests() {
  return openSyncDb().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('sync-requests', 'readonly');
      const store = transaction.objectStore('sync-requests');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = (event) => reject(event.target.error);
    });
  });
}

// Delete a single sync request from queue
function deleteSyncRequest(id) {
  return openSyncDb().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('sync-requests', 'readwrite');
      const store = transaction.objectStore('sync-requests');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = (event) => reject(event.target.error);
    });
  });
}

// Synchronize all pending requests to Supabase
async function syncPendingRequests() {
  try {
    const requests = await getSyncRequests();
    if (!requests || requests.length === 0) return;

    console.log(`[Service Worker Sync] Processing ${requests.length} pending mutations...`);

    for (const req of requests) {
      try {
        const response = await fetch(req.url, {
          method: req.method,
          headers: req.headers,
          body: req.body
        });

        // 409 means Conflict (already added or modified, treat as success so we don't block the queue)
        if (response.ok || response.status === 409) {
          console.log(`[Service Worker Sync] Request ${req.id} synchronized successfully!`);
          await deleteSyncRequest(req.id);
        } else {
          console.warn(`[Service Worker Sync] Request ${req.id} failed with status ${response.status}`);
          // If it's a client error (4xx except 409), discard it to avoid clogging the queue.
          // Keep server errors (5xx) or transient issues to retry later.
          if (response.status >= 400 && response.status < 500) {
            console.log(`[Service Worker Sync] Discarding invalid request ${req.id}`);
            await deleteSyncRequest(req.id);
          }
        }
      } catch (err) {
        console.error(`[Service Worker Sync] Network error during request ${req.id} dispatch:`, err);
        break; // Break the queue replay loop as we are likely still offline
      }
    }
  } catch (err) {
    console.error('[Service Worker Sync] Synchronization task failed:', err);
  }
}

// Listen for the background sync event from browser
self.addEventListener('sync', (event) => {
  if (event.tag === 'supabase-sync') {
    console.log('[Service Worker Sync] Sync event fired!');
    event.waitUntil(syncPendingRequests());
  }
});

// Listen for message events (like manual synchronization triggers)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SYNC_NOW') {
    console.log('[Service Worker Sync] Manual SYNC_NOW message received!');
    event.waitUntil(syncPendingRequests());
  }
});
