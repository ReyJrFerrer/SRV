// Service Worker for SRV PWA
const CACHE_NAME = "srv-pwa-v1";
const STATIC_CACHE_URLS = [
  "/",
  "/manifest.json",
  "/logo.svg",
  "/heroImage.png",
];

// Install event - cache resources
self.addEventListener("install", (event) => {
  console.log("Service Worker installing...");
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Caching static resources");
        return cache.addAll(
          STATIC_CACHE_URLS.map((url) => new Request(url, { cache: "reload" })),
        );
      })
      .catch((error) => {
        console.error("Failed to cache resources:", error);
      }),
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("Service Worker activating...");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") {
    return;
  }

  // Skip chrome-extension requests
  if (event.request.url.startsWith("chrome-extension://")) {
    return;
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

          // Add successful responses to cache
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch((error) => {
          console.error("Fetch failed:", error);
          // Return a fallback response for navigation requests
          if (event.request.mode === "navigate") {
            return caches.match("/");
          }
          throw error;
        });
    }),
  );
});

// Push notification event handler
self.addEventListener("push", (event) => {
  console.log("Push event received:", event);

  let notificationData = {};

  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (error) {
      console.error("Error parsing push data:", error);
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

  const options = {
    body: notificationData.body,
    icon: notificationData.icon || "/logo.svg",
    badge: notificationData.badge || "/logo.svg",
    data: notificationData.data || {},
    tag: notificationData.tag || "srv-notification",
    requireInteraction: notificationData.requireInteraction || false,
    actions: notificationData.actions || [],
    vibrate: notificationData.vibrate || [100, 50, 100],
    timestamp: Date.now(),
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options),
  );
});

// Notification click event handler
self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked:", event);

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
  console.log("Background sync:", event.tag);

  if (event.tag === "background-notification-sync") {
    event.waitUntil(
      // Handle any offline actions that need to be synced
      Promise.resolve(),
    );
  }
});

// Message event handler (for communication with main thread)
self.addEventListener("message", (event) => {
  console.log("Service Worker received message:", event.data);

  if (event.data && event.data.type) {
    switch (event.data.type) {
      case "SKIP_WAITING":
        self.skipWaiting();
        break;
      case "GET_VERSION":
        event.ports[0].postMessage({ version: CACHE_NAME });
        break;
      default:
        console.log("Unknown message type:", event.data.type);
    }
  }
});
