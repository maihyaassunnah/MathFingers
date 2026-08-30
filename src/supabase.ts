import { createClient } from '@supabase/supabase-js';
import { networkMonitor } from './services/networkMonitor';

// Open or upgrade IndexedDB for offline request queue
export function openSyncDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported'));
      return;
    }
    const request = indexedDB.open('supabase-sync-db', 1);
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('sync-requests')) {
        db.createObjectStore('sync-requests', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = (event: any) => resolve(event.target.result);
    request.onerror = (event: any) => reject(event.target.error);
  });
}

// Function to trigger synchronization from service worker or main thread fallback
export function triggerSync() {
  if (typeof navigator !== 'undefined' && navigator.serviceWorker && navigator.serviceWorker.ready) {
    navigator.serviceWorker.ready.then((reg) => {
      // Send a sync message to the Service Worker
      if (reg.active) {
        reg.active.postMessage({ type: 'SYNC_NOW' });
      }
      
      // Also trigger the standard background sync registration if available
      if ('sync' in reg) {
        (reg as any).sync.register('supabase-sync').catch(() => {});
      }
    });
  }
  
  // Fallback to main-thread synchronization
  syncPendingFromMainThread();
}

// Fallback main thread sync logic
export async function syncPendingFromMainThread() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  try {
    const db = await openSyncDb();
    const transaction = db.transaction('sync-requests', 'readonly');
    const store = transaction.objectStore('sync-requests');
    const getRequest = store.getAll();

    getRequest.onsuccess = async () => {
      const requests = getRequest.result;
      if (!requests || requests.length === 0) return;

      console.log(`[Main Thread Sync] Syncing ${requests.length} pending requests to Supabase...`);

      for (const req of requests) {
        try {
          const response = await fetch(req.url, {
            method: req.method,
            headers: req.headers,
            body: req.body
          });

          if (response.ok || response.status === 409) {
            console.log(`[Main Thread Sync] Request ${req.id} synced successfully!`);
            const delTransaction = db.transaction('sync-requests', 'readwrite');
            delTransaction.objectStore('sync-requests').delete(req.id);
          } else {
            console.warn(`[Main Thread Sync] Request ${req.id} failed with status: ${response.status}`);
            if (response.status >= 400 && response.status < 500) {
              const delTransaction = db.transaction('sync-requests', 'readwrite');
              delTransaction.objectStore('sync-requests').delete(req.id);
            }
          }
        } catch (err) {
          console.error(`[Main Thread Sync] Failed to send request ${req.id}:`, err);
          break; // Stop replaying if we hit a network failure
        }
      }
    };
  } catch (err) {
    console.warn('[Main Thread Sync] Sync database failed:', err);
  }
}

// Listen to online events to trigger synchronization
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[App] Network is back online. Triggering synchronization...');
    triggerSync();
  });
  
  // Initial sync attempt when application boots
  window.addEventListener('load', () => {
    setTimeout(triggerSync, 3000);
  });
}

// Helper to convert request body into string for persistence
async function getBodyString(body: any): Promise<string | null> {
  if (!body) return null;
  if (typeof body === 'string') return body;
  if (body instanceof Blob) {
    return body.text();
  }
  return null;
}

// Enqueue a write mutation into the sync queue
async function enqueueRequest(url: string, method: string, init?: RequestInit) {
  try {
    const db = await openSyncDb();
    
    // Extract serializable headers
    const headers: Record<string, string> = {};
    if (init?.headers) {
      if (init.headers instanceof Headers) {
        init.headers.forEach((value, key) => {
          headers[key] = value;
        });
      } else if (Array.isArray(init.headers)) {
        init.headers.forEach(([key, value]) => {
          headers[key] = value;
        });
      } else {
        Object.assign(headers, init.headers);
      }
    }

    const body = init?.body ? await getBodyString(init.body) : null;

    const transaction = db.transaction('sync-requests', 'readwrite');
    const store = transaction.objectStore('sync-requests');
    
    store.add({
      url,
      method,
      headers,
      body,
      timestamp: Date.now()
    });

    console.log(`[Supabase Queue] Successfully queued ${method} request to ${url}`);
    
    // Attempt triggering sync immediately
    triggerSync();
  } catch (err) {
    console.error('[Supabase Queue] Failed to enqueue request:', err);
  }
}

// Intercept queries and mutations to monitor live telemetry payload sizes and queue offline writes
const customFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : input.url);
  const method = (init?.method || 'GET').toUpperCase();
  const startTime = performance.now();
  const tableName = networkMonitor.extractTableName(url);

  // Extract request body string & size
  let requestBodyStr: string | null = null;
  let requestSizeBytes = 0;
  if (init?.body) {
    try {
      requestBodyStr = await getBodyString(init.body);
      if (requestBodyStr) {
        requestSizeBytes = new Blob([requestBodyStr]).size;
      }
    } catch {
      // Ignore conversion error
    }
  }

  // Only intercept write mutations to Supabase PostgREST api for offline queuing
  const isSupabaseWrite = url.includes('supabase.co') && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method);

  // If navigator reports offline, skip network and queue write mutations immediately
  if (isSupabaseWrite && typeof navigator !== 'undefined' && !navigator.onLine) {
    console.log('[Supabase Fetch] Offline detected, intercepting and queueing request:', method, url);
    await enqueueRequest(url, method, init);
    const status = method === 'POST' ? 201 : 204;

    networkMonitor.recordRequest({
      timestamp: Date.now(),
      url,
      endpoint: url.replace(/^https?:\/\/[^/]+/, ''),
      table: tableName,
      method,
      status,
      statusText: 'Queued Offline',
      durationMs: Math.round(performance.now() - startTime),
      requestSizeBytes,
      responseSizeBytes: 42,
      requestBodyPreview: requestBodyStr,
      responseBodyPreview: JSON.stringify({ queued: true }),
      isError: false,
      queued: true
    });

    return new Response(JSON.stringify({ queued: true }), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const response = await fetch(input, init);
    const durationMs = Math.round(performance.now() - startTime);

    // Clone response to compute exact payload size in bytes without consuming original response stream
    let responseSizeBytes = 0;
    let responseBodyPreview: string | null = null;
    let largeFields: Array<{ field: string; sizeBytes: number; preview: string }> = [];

    try {
      const resClone = response.clone();
      const text = await resClone.text();
      responseSizeBytes = new Blob([text]).size;
      responseBodyPreview = text.length > 500 ? `${text.substring(0, 500)}...` : text;

      if (text.startsWith('{') || text.startsWith('[')) {
        try {
          const parsed = JSON.parse(text);
          largeFields = networkMonitor.analyzeLargeFields(parsed);
        } catch {
          // Ignore JSON parse error
        }
      }
    } catch {
      // Fallback to Content-Length header if clone text read fails
      const cl = response.headers.get('content-length');
      if (cl) responseSizeBytes = parseInt(cl, 10) || 0;
    }

    // Record telemetry in Network Monitor
    networkMonitor.recordRequest({
      timestamp: Date.now(),
      url,
      endpoint: url.replace(/^https?:\/\/[^/]+/, ''),
      table: tableName,
      method,
      status: response.status,
      statusText: response.statusText,
      durationMs,
      requestSizeBytes,
      responseSizeBytes,
      requestBodyPreview: requestBodyStr,
      responseBodyPreview,
      detectedLargeFields: largeFields,
      isError: !response.ok
    });

    return response;
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - startTime);

    if (isSupabaseWrite) {
      console.warn('[Supabase Fetch] Network failure or offline transition. Queueing request:', err);
      await enqueueRequest(url, method, init);
      const status = method === 'POST' ? 201 : 204;

      networkMonitor.recordRequest({
        timestamp: Date.now(),
        url,
        endpoint: url.replace(/^https?:\/\/[^/]+/, ''),
        table: tableName,
        method,
        status,
        statusText: 'Failed -> Queued Offline',
        durationMs,
        requestSizeBytes,
        responseSizeBytes: 42,
        requestBodyPreview: requestBodyStr,
        responseBodyPreview: JSON.stringify({ queued: true }),
        isError: true,
        queued: true
      });

      return new Response(JSON.stringify({ queued: true }), {
        status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Record failed fetch
    networkMonitor.recordRequest({
      timestamp: Date.now(),
      url,
      endpoint: url.replace(/^https?:\/\/[^/]+/, ''),
      table: tableName,
      method,
      status: 0,
      statusText: err.message || 'Network Error',
      durationMs,
      requestSizeBytes,
      responseSizeBytes: 0,
      requestBodyPreview: requestBodyStr,
      responseBodyPreview: null,
      isError: true
    });

    throw err;
  }
};

// Read from localStorage if configured dynamically by the user in Settings
const savedUrl = typeof window !== 'undefined' ? localStorage.getItem('MATH_FINGERS_SUPABASE_URL') : null;
const savedKey = typeof window !== 'undefined' ? localStorage.getItem('MATH_FINGERS_SUPABASE_ANON_KEY') : null;

const supabaseUrl = savedUrl || (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = savedKey || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        fetch: customFetch
      }
    })
  : null;
