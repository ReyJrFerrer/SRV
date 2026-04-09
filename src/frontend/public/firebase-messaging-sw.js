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
    apiKey: "AIzaSyAFcM9CreLogkp7mqv0e_ySK_ipP6JQ4Wk",
    authDomain: "srve-7133d.firebaseapp.com",
    projectId: "srve-7133d",
    storageBucket: "srve-7133d.firebasestorage.app",
    messagingSenderId: "197983300433",
    appId: "1:197983300433:web:9c995f3b51357255cf8170",
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
