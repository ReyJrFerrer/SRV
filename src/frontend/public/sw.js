// Service Worker for SRV PWA - Enhanced for cross-browser compatibility with FCM support
// Import Firebase Messaging for FCM support
importScripts(
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js",
);

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
    isChrome: /Chrome/.test(userAgent),
    isBrave: /Brave/.test(userAgent),
    isEdge: /Edg/.test(userAgent),
    isFirefox: /Firefox/.test(userAgent),
  };

  //console.log("🔍 SW: Browser detected:", browserInfo);
  return browserInfo;
}

// Initialize Firebase for FCM background messages
try {
  firebase.initializeApp({
    apiKey: "AIzaSyDRyQ38qXdEDDF1gcw33UhyAXocHAtnQzs",
    authDomain: "devsrv-rey.firebaseapp.com",
    projectId: "devsrv-rey",
    storageBucket: "devsrv-rey.firebasestorage.app",
    messagingSenderId: "851522429469",
    appId: "1:851522429469:web:e0737ae9bdedb4f27edcf4",
  });

  const messaging = firebase.messaging();

  // Handle background messages from FCM
  messaging.onBackgroundMessage((payload) => {
    console.log("SW: Received background message from FCM:", payload);

    const notificationTitle = payload.notification?.title || "SRV Notification";
    const notificationOptions = {
      body: payload.notification?.body || "You have a new notification",
      icon: payload.notification?.icon || "/logo.svg",
      badge: "/logo.svg",
      data: payload.data || {},
      tag: payload.data?.notificationId || "srv-notification",
    };

    return self.registration.showNotification(
      notificationTitle,
      notificationOptions,
    );
  });
} catch (error) {
  console.error("SW: Failed to initialize Firebase:", error);
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

  // Skip chrome-extension and other non-http requests
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

  // Bypass third-party requests that can be blocked (e.g., Google Maps telemetry) so we don't
  // intercept them and cause console noise when blocked by the network or extensions.
  try {
    const reqUrl = new URL(event.request.url);
    const isThirdParty = reqUrl.origin !== self.location.origin;
    const isGoogleMapsDomain =
      reqUrl.hostname === "maps.googleapis.com" ||
      reqUrl.hostname === "maps.gstatic.com";
    const isMapsTelemetry =
      isGoogleMapsDomain && reqUrl.pathname.includes("/maps/api/js/QuotaService.RecordEvent");

    if (isMapsTelemetry || isGoogleMapsDomain) {
      // Let the browser handle it (no caching, no SW respondWith)
      return;
    }
  } catch (_) {
    // If URL parsing fails, continue to default handler below
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached response if found
      if (response) {
        return response;
      }

      // Clone the request because it's a stream
      const fetchRequest = event.request.clone();

      return fetch(fetchRequest)
        .then((response) => {
          // Check if valid response
          if (
            !response ||
            response.status !== 200 ||
            response.type !== "basic"
          ) {
            return response;
          }

          // Clone the response because it's a stream
          const responseToCache = response.clone();

          // Add successful responses to cache (with browser-specific handling)
          caches.open(CACHE_NAME).then((cache) => {
            // Safari sometimes has issues with certain cache operations
            try {
              cache.put(event.request, responseToCache);
            } catch (cacheError) {
              if (browser.isSafari) {
                //console.warn(
                //  "⚠️ SW: Safari cache put failed (expected):",
                //  cacheError,
                //);
              } else {
                //console.error("❌ SW: Cache put failed:", cacheError);
              }
            }
          });

          return response;
        })
        .catch((error) => {
          //console.error("❌ SW: Fetch failed:", error);
          // For navigation requests return an offline fallback if we have it
          if (event.request.mode === "navigate") {
            return caches.match("/").then((fallbackResponse) => {
              if (fallbackResponse) return fallbackResponse;
              return new Response("App is offline. Please check your connection.", {
                status: 503,
                headers: { "Content-Type": "text/plain" },
              });
            });
          }
          // For third-party or opaque requests, avoid rejecting the promise to silence console noise
          try {
            const reqUrl = new URL(event.request.url);
            if (reqUrl.origin !== self.location.origin) {
              // Return an empty 204 to satisfy callers expecting a response (e.g., telemetry beacons)
              return new Response(null, { status: 204 });
            }
          } catch (_) {}
          // Otherwise, return a generic 504 response
          return new Response("Network error", { status: 504 });
        });
    }),
  );
});

// Push notification event handler
self.addEventListener("push", (event) => {
  const browser = detectBrowser();
  //console.log(`🔔 SW: Push event received (${browser.name}):`, event);

  let notificationData = {};

  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (error) {
      //console.error("❌ SW: Error parsing push data:", error);
      notificationData = {
        title: "SRV Notification",
        body: event.data.text() || "You have a new notification",
        icon: "/logo.svg",
        badge: "/logo.svg",
      };
    }
  } else {
    notificationData = {
      title: "SRV Notification",
      body: "You have a new notification",
      icon: "/logo.svg",
      badge: "/logo.svg",
    };
  }

  // Browser-specific notification options
  const options = {
    body: notificationData.body,
    icon: notificationData.icon || "/logo.svg",
    badge: notificationData.badge || "/logo.svg",
    data: notificationData.data || {},
    tag: notificationData.tag || "srv-notification",
    requireInteraction: browser.isSafari
      ? false
      : notificationData.requireInteraction || false, // Safari doesn't support requireInteraction well
    vibrate: browser.isSafari
      ? undefined
      : notificationData.vibrate || [100, 50, 100], // Safari doesn't support vibrate
    timestamp: Date.now(),
  };

  // Safari doesn't support actions in notifications
  if (!browser.isSafari && notificationData.actions) {
    options.actions = notificationData.actions;
  }

  //console.log(`📱 SW: Showing notification (${browser.name})`, options);

  event.waitUntil(
    self.registration
      .showNotification(notificationData.title, options)
      .catch((error) => {
        //console.error("❌ SW: Failed to show notification:", error);
        // Fallback for Safari or other issues
        return self.registration.showNotification("SRV Notification", {
          body: "You have a new notification",
          icon: "/logo.svg",
        });
      }),
  );
});

// Notification click event handler
self.addEventListener("notificationclick", (event) => {
  //console.log("Notification clicked:", event);

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
  //console.log("Background sync:", event.tag);

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
