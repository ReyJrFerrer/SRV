// Firebase Messaging initialization in Service Worker context
// This file is imported by the main service worker

// Import Firebase scripts
importScripts(
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js",
);

// Initialize Firebase
firebase.initializeApp({
  apiKey: "AIzaSyDRyQ38qXdEDDF1gcw33UhyAXocHAtnQzs",
  authDomain: "devsrv-rey.firebaseapp.com",
  projectId: "devsrv-rey",
  storageBucket: "devsrv-rey.firebasestorage.app",
  messagingSenderId: "851522429469",
  appId: "1:851522429469:web:e0737ae9bdedb4f27edcf4",
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log("[FCM SW] Received background message:", payload);

  const notificationTitle = payload.notification?.title || "SRV Notification";
  const notificationOptions = {
    body: payload.notification?.body || "You have a new notification",
    icon: payload.notification?.icon || "/logo.svg",
    badge: "/logo.svg",
    data: payload.data || {},
    tag: payload.data?.notificationId || `srv-notification-${Date.now()}`,
    requireInteraction: false,
    vibrate: [100, 50, 100],
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
