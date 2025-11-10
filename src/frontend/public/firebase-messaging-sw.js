// Firebase Messaging Service Worker Redirect
// This file exists only to satisfy Firebase's default SW file check
// The actual service worker logic is in sw.js
// FCM will use the registration we provide via serviceWorkerRegistration parameter

// Import Firebase for FCM support (same as sw.js)
importScripts(
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js",
);

// Initialize Firebase (same config as sw.js)
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

  // Handle background messages
  messaging.onBackgroundMessage((payload) => {
    console.log("Firebase SW: Background message received", payload);

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
  console.error("Firebase SW: Failed to initialize:", error);
}

console.log("Firebase Messaging Service Worker initialized");
