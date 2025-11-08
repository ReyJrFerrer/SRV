// Service Worker for SRV PWA - Enhanced for cross-browser compatibility
// Note: OneSignal handles push notifications via OneSignalSDKWorker.js
// This service worker focuses ONLY on PWA caching and offline functionality
// Both service workers can coexist with proper scoping

const CACHE_NAME = "srv-pwa-v1";
const STATIC_CACHE_URLS = [
  "/",
  "/manifest.json",
  "/logo.svg",
  "/heroImage.png",
];

// Browser detection in service worker
function detectBrowser() {
  const userAgent = self.navigator.userAgent;
  let browserInfo = {
    name: "Unknown",
    version: "Unknown",
    isSafari: /Safari/.test(userAgent) && !/Chrome/.test(userAgent),
    isChrome:
      /Chrome/.test(userAgent) &&
      !/Edg/.test(userAgent) &&
      !/Vivaldi/.test(userAgent) &&
      !/Brave/.test(userAgent),
    isBrave:
      /Brave/.test(userAgent) ||
      (navigator.brave && typeof navigator.brave.isBrave === "function"),
    isVivaldi: /Vivaldi/.test(userAgent),
    isEdge: /Edg/.test(userAgent),
    isFirefox: /Firefox/.test(userAgent),
  };

  // Set a readable name
  if (browserInfo.isSafari) browserInfo.name = "Safari";
  else if (browserInfo.isBrave) browserInfo.name = "Brave";
  else if (browserInfo.isVivaldi) browserInfo.name = "Vivaldi";
  else if (browserInfo.isEdge) browserInfo.name = "Edge";
  else if (browserInfo.isChrome) browserInfo.name = "Chrome";
  else if (browserInfo.isFirefox) browserInfo.name = "Firefox";

  return browserInfo;
}

// Install event - cache resources
self.addEventListener("install", (event) => {
  const browser = detectBrowser();
  //console.log(`🔧 SW: Installing Service Worker (${browser.name})...`);

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        //console.log("📦 SW: Caching static resources");
        return cache.addAll(
          STATIC_CACHE_URLS.map(
            (url) =>
              new Request(url, {
                cache: browser.isSafari ? "default" : "reload", // Safari cache handling
              }),
          ),
        );
      })
      .catch((error) => {
        //console.error("❌ SW: Failed to cache resources:", error);
      }),
  );

  // Skip waiting for better update experience, but handle Safari carefully
  if (!browser.isSafari) {
    self.skipWaiting();
  }
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  const browser = detectBrowser();
  //console.log(`✅ SW: Activating Service Worker (${browser.name})...`);

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              //console.log("🗑️ SW: Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          }),
        );
      }),
      // Handle client claiming with browser-specific logic
      browser.isSafari
        ? Promise.resolve() // Safari sometimes has issues with clients.claim()
        : self.clients.claim(),
    ]),
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  const browser = detectBrowser();

  // Skip non-GET requests
  if (event.request.method !== "GET") {
    return;
  }

  // Skip non-http requests
  if (!event.request.url.startsWith("http")) {
    return;
  }

  // Skip chrome-extension requests
  if (event.request.url.startsWith("chrome-extension://")) {
    return;
  }

  // Safari-specific handling
  if (browser.isSafari && event.request.url.includes("safari-extension://")) {
    return;
  }

  // Bypass third-party Google Maps requests to avoid interference
  try {
    const reqUrl = new URL(event.request.url);
    const isGoogleMapsDomain =
      reqUrl.hostname === "maps.googleapis.com" ||
      reqUrl.hostname === "maps.gstatic.com";
    const isMapsTelemetry =
      isGoogleMapsDomain &&
      reqUrl.pathname.includes("/maps/api/js/QuotaService.RecordEvent");
    if (isMapsTelemetry || isGoogleMapsDomain) {
      return;
    }
  } catch (_) {}

  const reqUrl = new URL(event.request.url);
  const sameOrigin = reqUrl.origin === self.location.origin;

  const cacheFirst = () =>
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (
            response &&
            response.status === 200 &&
            response.type !== "opaque"
          ) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              try {
                cache.put(event.request, copy);
              } catch (_) {}
            });
          }
          return response;
        });
      }),
    );

  const networkFirst = () =>
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (
            response &&
            response.status === 200 &&
            response.type !== "opaque"
          ) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              try {
                cache.put(event.request, copy);
              } catch (_) {}
            });
          }
          return response;
        })
        .catch(() =>
          caches.match(event.request).then((r) => r || caches.match("/")),
        ),
    );

  // Navigations (HTML): prefer fresh content, fallback to cache
  if (event.request.mode === "navigate") {
    return networkFirst();
  }

  if (sameOrigin) {
    const pathname = reqUrl.pathname;

    // Service workers: always fetch latest
    if (pathname === "/sw.js" || pathname === "/firebase-messaging-sw.js") {
      return event.respondWith(fetch(event.request));
    }

    // Built assets (JS/CSS)
    if (
      pathname.startsWith("/assets/") ||
      pathname.endsWith(".js") ||
      pathname.endsWith(".css")
    ) {
      return cacheFirst();
    }

    // Fonts and images
    if (pathname.startsWith("/fonts/") || pathname.startsWith("/images/")) {
      return cacheFirst();
    }
  }

  // Default: cache-first for other GETs
  return cacheFirst();
});

// Notification click event handler
// Note: OneSignal handles most notification events, but we keep this for compatibility
self.addEventListener("notificationclick", (event) => {
  console.log("SW: Notification clicked:", event);

  // Only handle notifications that are not from OneSignal
  if (event.notification.tag && event.notification.tag.startsWith("onesignal")) {
    // Let OneSignal handle its own notifications
    return;
  }

  event.notification.close();

  const urlToOpen =
    event.notification.data?.url || event.notification.data?.href || "/";

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin)) {
            client.focus();
            client.postMessage({
              type: "NOTIFICATION_CLICKED",
              data: event.notification.data,
              url: urlToOpen,
            });
            return;
          }
        }

        // Open new window if app is not open
        return clients.openWindow(urlToOpen);
      }),
  );
});

// Background sync event (for offline actions)
self.addEventListener("sync", (event) => {
  console.log("SW: Background sync:", event.tag);

  if (event.tag === "background-notification-sync") {
    event.waitUntil(
      // Handle any offline actions that need to be synced
      Promise.resolve(),
    );
  }
});

// Message event handler (for communication with main thread)
self.addEventListener("message", (event) => {
  //console.log("Service Worker received message:", event.data);

  if (event.data && event.data.type) {
    switch (event.data.type) {
      case "SKIP_WAITING":
        self.skipWaiting();
        break;
      case "GET_VERSION":
        event.ports[0].postMessage({ version: CACHE_NAME });
        break;
      default:
      //console.log("Unknown message type:", event.data.type);
    }
  }
});
