/**
 * Access Nature - Service Worker
 * Handles offline caching, background sync, and push notifications
 * 
 * Cache Strategy:
 * - App Shell: Cache First (HTML, CSS, JS)
 * - API/Firebase: Network First with Cache Fallback
 * - Map Tiles: Cache First with Network Fallback
 * - Images: Cache First
 */

const CACHE_VERSION = 'v2.3.1-ghpages';
const APP_CACHE = `access-nature-app-${CACHE_VERSION}`;
const DATA_CACHE = `access-nature-data-${CACHE_VERSION}`;
const MAP_CACHE = `access-nature-maps-${CACHE_VERSION}`;
const IMAGE_CACHE = `access-nature-images-${CACHE_VERSION}`;

// App Shell - files to cache immediately (relative paths for GitHub Pages compatibility)
const APP_SHELL = [
  './',
  './index.html',
  './tracker.html',
  './reports.html',
  './manifest.json',
  
  // CSS
  './src/css/base.css',
  './src/css/layout.css',
  './src/css/components.css',
  './src/css/accessibility.css',
  './src/css/themes.css',
  './src/css/auth.css',
  './src/css/landing.css',
  './src/css/high-contrast.css',
  './src/css/ui-utilities.css',
  
  // Core JS
  './firebase-setup.js',
  './src/main.js',
  './src/landing.js',
  
  // Features
  './src/features/auth.js',
  './src/core/tracking.js',
  './src/features/accessibility.js',
  './src/features/export.js',
  './src/features/media.js',
  './src/features/safetyFeatures.js',
  './src/features/trailConditions.js',
  './src/features/trailAlerts.js',
  './src/features/offlineSync.js',
  './src/features/trailSearch.js',
  './src/features/accessibilityRating.js',
  './src/features/accessibilityFormV2Quick.js',
  './src/features/trailGuideGeneratorV2.js',
  
  // Utils
  './src/utils/modal.js',
  './src/utils/toast.js',
  './src/utils/errorMessages.js',
  
  // UI
  './src/ui/offlineIndicator.js',
  './src/ui/loadingStates.js',
  './src/ui/gamificationUI.js',
  './src/ui/displayPreferences.js',
  './src/ui/mobilityProfileUI.js',
  
  // PWA
  './src/pwa/pwaManager.js',
  './src/pwa/offlineMapsUI.js',
  
  // Services & Config
  './src/services/userService.js',
  './src/config/featureFlags.js',
  
  // External Libraries (CDN - will be cached on first use)
  'https://unpkg.com/leaflet@1.9.3/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.3/dist/leaflet.js'
];

// Tile server patterns to cache
const TILE_PATTERNS = [
  /^https:\/\/[abc]\.tile\.openstreetmap\.org/,
  /^https:\/\/tiles\.stadiamaps\.com/,
  /^https:\/\/[abc]\.basemaps\.cartocdn\.com/
];

// Firebase patterns (network first)
const FIREBASE_PATTERNS = [
  /^https:\/\/firestore\.googleapis\.com/,
  /^https:\/\/www\.gstatic\.com\/firebasejs/,
  /^https:\/\/identitytoolkit\.googleapis\.com/,
  /^https:\/\/securetoken\.googleapis\.com/
];

// ==================== Install Event ====================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  
  // Get the base URL from the service worker's location
  // This handles subdirectory deployments like GitHub Pages
  const swUrl = new URL(self.location);
  const baseUrl = swUrl.href.replace(/sw\.js$/, '');
  
  console.log('[SW] Base URL:', baseUrl);
  
  event.waitUntil(
    caches.open(APP_CACHE)
      .then((cache) => {
        console.log('[SW] Caching App Shell');
        // Cache what we can, don't fail on missing files
        return Promise.allSettled(
          APP_SHELL.map(url => {
            // Resolve relative URLs against the SW's base URL
            // External URLs (https://) are kept as-is
            const fullUrl = url.startsWith('http') ? url : new URL(url, baseUrl).href;
            
            return cache.add(fullUrl).catch(err => {
              console.warn(`[SW] Failed to cache: ${fullUrl}`, err.message || err);
            });
          })
        );
      })
      .then(() => {
        console.log('[SW] App Shell cached - waiting for activation');
        // DON'T call skipWaiting() here - this was causing infinite update loops
        // The SW will wait until all tabs are closed, or user explicitly triggers update
      })
  );
});

// ==================== Activate Event ====================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  
  event.waitUntil(
    // Clean up old caches
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return name.startsWith('access-nature-') && 
                     name !== APP_CACHE && 
                     name !== DATA_CACHE && 
                     name !== MAP_CACHE &&
                     name !== IMAGE_CACHE;
            })
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service Worker activated');
        return self.clients.claim(); // Take control immediately
      })
  );
});

// ==================== Fetch Event ====================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Determine caching strategy based on request type
  if (isMapTile(url)) {
    event.respondWith(cacheFirstWithNetwork(request, MAP_CACHE));
  } else if (isFirebaseRequest(url)) {
    event.respondWith(networkFirstWithCache(request, DATA_CACHE));
  } else if (isImageRequest(request)) {
    event.respondWith(cacheFirstWithNetwork(request, IMAGE_CACHE));
  } else if (isAppShellRequest(url)) {
    event.respondWith(cacheFirstWithNetwork(request, APP_CACHE));
  } else {
    // Default: Network first with cache fallback
    event.respondWith(networkFirstWithCache(request, DATA_CACHE));
  }
});

// ==================== Caching Strategies ====================

/**
 * Cache First with Network Fallback
 * Best for: App shell, static assets, map tiles
 */
async function cacheFirstWithNetwork(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Return cached version, but update cache in background
    updateCacheInBackground(request, cache);
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Clone and cache the response
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.warn('[SW] Network request failed:', request.url);
    
    // Return offline fallback for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline.html') || createOfflineResponse();
    }
    
    return createOfflineResponse();
  }
}

/**
 * Network First with Cache Fallback
 * Best for: API requests, dynamic data
 */
async function networkFirstWithCache(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const networkResponse = await fetch(request);
    
    // Only cache successful, cacheable responses (not streaming, not opaque)
    if (networkResponse.ok && 
        networkResponse.type !== 'opaque' && 
        !request.url.includes('firestore.googleapis.com') &&
        !request.url.includes('/Listen/channel')) {
      try {
        cache.put(request, networkResponse.clone());
      } catch (cacheError) {
        // Silently fail for non-cacheable responses
        console.debug('[SW] Could not cache:', request.url.slice(0, 60));
      }
    }
    
    return networkResponse;
  } catch (error) {
    console.warn('[SW] Network failed, trying cache:', request.url);
    
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response
    return createOfflineResponse();
  }
}

/**
 * Update cache in background (stale-while-revalidate)
 */
async function updateCacheInBackground(request, cache) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
  } catch (error) {
    // Silently fail - we already have cached version
  }
}

/**
 * Create offline response
 */
function createOfflineResponse() {
  return new Response(
    JSON.stringify({ 
      error: 'offline', 
      message: 'You are currently offline' 
    }),
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

// ==================== Request Type Detection ====================

function isMapTile(url) {
  return TILE_PATTERNS.some(pattern => pattern.test(url.href));
}

function isFirebaseRequest(url) {
  return FIREBASE_PATTERNS.some(pattern => pattern.test(url.href));
}

function isImageRequest(request) {
  const acceptHeader = request.headers.get('Accept') || '';
  return acceptHeader.includes('image') || 
         /\.(png|jpg|jpeg|gif|webp|svg|ico)$/i.test(request.url);
}

function isAppShellRequest(url) {
  // Check if it's a local request (same origin)
  if (url.origin !== self.location.origin) {
    return false;
  }
  
  // Get the base path of the service worker
  const swBasePath = self.location.pathname.replace(/sw\.js$/, '');
  
  // Check if the request path is within our app's scope
  return APP_SHELL.some(path => {
    // Remove ./ prefix if present
    const cleanPath = path.replace(/^\.\//, '');
    const fullPath = swBasePath + cleanPath;
    
    return url.pathname === fullPath || 
           url.pathname === '/' + cleanPath ||
           url.pathname.endsWith('/' + cleanPath);
  });
}

// ==================== Background Sync ====================

self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);
  
  if (event.tag === 'sync-routes') {
    event.waitUntil(syncPendingRoutes());
  } else if (event.tag === 'sync-reports') {
    event.waitUntil(syncPendingReports());
  } else if (event.tag === 'sync-guides') {
    event.waitUntil(syncPendingGuides());
  }
});

/**
 * Sync pending routes to Firebase
 */
async function syncPendingRoutes() {
  try {
    const pendingRoutes = await getPendingData('pending-routes');
    
    for (const route of pendingRoutes) {
      try {
        // This would call Firebase - simplified for demo
        console.log('[SW] Syncing route:', route.id);
        await removePendingData('pending-routes', route.id);
        
        // Notify client of successful sync
        notifyClients({
          type: 'SYNC_SUCCESS',
          data: { type: 'route', id: route.id }
        });
      } catch (error) {
        console.error('[SW] Failed to sync route:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

/**
 * Sync pending reports to Firebase
 */
async function syncPendingReports() {
  try {
    const pendingReports = await getPendingData('pending-reports');
    
    for (const report of pendingReports) {
      try {
        console.log('[SW] Syncing report:', report.id);
        await removePendingData('pending-reports', report.id);
        
        notifyClients({
          type: 'SYNC_SUCCESS',
          data: { type: 'report', id: report.id }
        });
      } catch (error) {
        console.error('[SW] Failed to sync report:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

/**
 * Sync pending guides to Firebase
 */
async function syncPendingGuides() {
  try {
    const pendingGuides = await getPendingData('pending-guides');
    
    for (const guide of pendingGuides) {
      try {
        console.log('[SW] Syncing guide:', guide.id);
        await removePendingData('pending-guides', guide.id);
        
        notifyClients({
          type: 'SYNC_SUCCESS',
          data: { type: 'guide', id: guide.id }
        });
      } catch (error) {
        console.error('[SW] Failed to sync guide:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// ==================== IndexedDB Helpers ====================

async function getPendingData(storeName) {
  // This would use IndexedDB - simplified placeholder
  return [];
}

async function removePendingData(storeName, id) {
  // This would remove from IndexedDB - simplified placeholder
  return true;
}

// ==================== Client Communication ====================

async function notifyClients(message) {
  const clients = await self.clients.matchAll({ type: 'window' });
  
  clients.forEach(client => {
    client.postMessage(message);
  });
}

// ==================== Push Notifications ====================

self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const options = {
    icon: '/assets/icons/icon-192x192.png',
    badge: '/assets/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      { action: 'view', title: 'View', icon: '/assets/icons/check.png' },
      { action: 'dismiss', title: 'Dismiss', icon: '/assets/icons/close.png' }
    ]
  };
  
  let data = { title: 'Access Nature', body: 'New update available' };
  
  try {
    data = event.data?.json() || data;
  } catch (e) {
    data.body = event.data?.text() || data.body;
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      ...options
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      self.clients.openWindow('/')
    );
  }
});

// ==================== Message Handler ====================

self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};
  
  // Only log relevant app messages, not Firebase internal messages (ping, keyChanged, etc.)
  if (type && !['ping', 'keyChanged'].includes(event.data?.eventType)) {
    console.log('[SW] Message received:', type);
  }
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CACHE_URLS':
      event.waitUntil(cacheUrls(payload.urls, payload.cacheName || APP_CACHE));
      break;
      
    case 'CACHE_MAP_REGION':
      event.waitUntil(cacheMapRegion(payload));
      break;
      
    case 'CLEAR_CACHE':
      event.waitUntil(clearCache(payload.cacheName));
      break;
      
    case 'GET_CACHE_SIZE':
      event.waitUntil(getCacheSize().then(size => {
        event.ports[0]?.postMessage({ size });
      }));
      break;
  }
});

/**
 * Cache specific URLs on demand
 */
async function cacheUrls(urls, cacheName) {
  const cache = await caches.open(cacheName);
  
  for (const url of urls) {
    try {
      await cache.add(url);
      console.log('[SW] Cached:', url);
    } catch (error) {
      console.warn('[SW] Failed to cache:', url, error);
    }
  }
}

/**
 * Cache map tiles for a region
 */
async function cacheMapRegion({ bounds, zoom, maxZoom = 16 }) {
  const cache = await caches.open(MAP_CACHE);
  const tiles = generateTileUrls(bounds, zoom, maxZoom);
  
  let cached = 0;
  const total = tiles.length;
  
  for (const tileUrl of tiles) {
    try {
      const response = await fetch(tileUrl);
      if (response.ok) {
        await cache.put(tileUrl, response);
        cached++;
      }
    } catch (error) {
      // Continue with other tiles
    }
    
    // Notify progress
    if (cached % 10 === 0) {
      notifyClients({
        type: 'MAP_CACHE_PROGRESS',
        data: { cached, total }
      });
    }
  }
  
  notifyClients({
    type: 'MAP_CACHE_COMPLETE',
    data: { cached, total }
  });
}

/**
 * Generate tile URLs for a bounding box
 */
function generateTileUrls(bounds, minZoom, maxZoom) {
  const urls = [];
  const tileServer = 'https://a.tile.openstreetmap.org';
  
  for (let z = minZoom; z <= maxZoom; z++) {
    const minTile = latLngToTile(bounds.north, bounds.west, z);
    const maxTile = latLngToTile(bounds.south, bounds.east, z);
    
    for (let x = minTile.x; x <= maxTile.x; x++) {
      for (let y = minTile.y; y <= maxTile.y; y++) {
        urls.push(`${tileServer}/${z}/${x}/${y}.png`);
      }
    }
  }
  
  return urls;
}

/**
 * Convert lat/lng to tile coordinates
 */
function latLngToTile(lat, lng, zoom) {
  const n = Math.pow(2, zoom);
  const x = Math.floor((lng + 180) / 360 * n);
  const latRad = lat * Math.PI / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return { x, y };
}

/**
 * Clear specific cache
 */
async function clearCache(cacheName) {
  if (cacheName) {
    await caches.delete(cacheName);
  } else {
    // Clear all caches
    const names = await caches.keys();
    await Promise.all(names.map(name => caches.delete(name)));
  }
}

/**
 * Get total cache size
 */
async function getCacheSize() {
  let totalSize = 0;
  const cacheNames = await caches.keys();
  
  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    
    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
  }
  
  return totalSize;
}

console.log('[SW] Service Worker loaded');