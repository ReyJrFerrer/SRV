# FCM Test Commands

Run these commands in your browser console to diagnose FCM issues.

## Quick Diagnostic

Run this first to see what's wrong:

```javascript
// Import FCM service (make sure app is loaded)
const fcmService = (await import("/src/services/fcmService.ts")).default;

// Print full diagnostics
await fcmService.printDiagnostics();
```

## Comprehensive Test

Test entire FCM flow:

```javascript
const fcmService = (await import("/src/services/fcmService.ts")).default;

// Run full test
const result = await fcmService.testFCMConfiguration();

console.log("Test Success:", result.success ? "Success" : "Failed");
console.table(result.steps);
```

## Manual Token Test (Bypass Our Code)

Test if Firebase itself works:

```javascript
// Test raw Firebase FCM
async function testRawFCM() {
  try {
    // 1. Check service worker
    const registration = await navigator.serviceWorker.ready;
    console.log("Service Worker:", registration.scope);

    // 2. Check permission
    const permission = await Notification.requestPermission();
    console.log("Permission:", permission);

    if (permission !== "granted") {
      throw new Error("Permission denied");
    }

    // 3. Import Firebase
    const { initializeApp } = await import(
      "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js"
    );
    const { getMessaging, getToken } = await import(
      "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js"
    );

    // 4. Initialize Firebase
    const app = initializeApp({
      apiKey: "AIzaSyDRyQ38qXdEDDF1gcw33UhyAXocHAtnQzs",
      authDomain: "devsrv-rey.firebaseapp.com",
      projectId: "devsrv-rey",
      storageBucket: "devsrv-rey.firebasestorage.app",
      messagingSenderId: "851522429469",
      appId: "1:851522429469:web:e0737ae9bdedb4f27edcf4",
    });

    const messaging = getMessaging(app);
    console.log("Firebase initialized");

    // 5. Get token
    const token = await getToken(messaging, {
      vapidKey:
        "BJsC4118PVulthWXC7mN1pWkxOG_0ao1my5QwoWj5Hjs7z1j5wOnekEYLeC20YBpbOJdicCRSlfH0adFCNx8vKs",
      serviceWorkerRegistration: registration,
    });

    console.log("Token obtained:", token);
    return token;
  } catch (error) {
    console.error("Raw FCM test failed:", error);

    // Detailed error info
    if (error.code) {
      console.error("Error code:", error.code);
    }
    if (error.message) {
      console.error("Error message:", error.message);
    }

    // Specific error handling
    if (error.message?.includes("Registration failed")) {
      console.error(`
REGISTRATION FAILED - PUSH SERVICE ERROR

This error means:
1. Firebase Cloud Messaging API is NOT enabled in Google Cloud Console
2. VAPID key might be invalid
3. Firebase project configuration is incomplete

IMMEDIATE FIXES:
1. Go to: https://console.cloud.google.com/
2. Select project: devsrv-rey
3. Go to: APIs & Services > Library
4. Search: "Firebase Cloud Messaging API"
5. Click ENABLE

Then refresh and try again.
      `);
    }

    throw error;
  }
}

// Run the test
testRawFCM();
```

## Check Google Cloud APIs

```javascript
// This will help you construct the URL to check APIs
const projectId = "devsrv-rey";
const apiUrls = {
  library: `https://console.cloud.google.com/apis/library?project=${projectId}`,
  dashboard: `https://console.cloud.google.com/apis/dashboard?project=${projectId}`,
  fcmApi: `https://console.cloud.google.com/apis/library/fcm.googleapis.com?project=${projectId}`,
  cloudMessaging: `https://console.cloud.google.com/apis/library/googlecloudmessaging.googleapis.com?project=${projectId}`,
};

console.log("Google Cloud Console Links:");
console.log("API Library:", apiUrls.library);
console.log("API Dashboard:", apiUrls.dashboard);
console.log("FCM API:", apiUrls.fcmApi);
console.log("Cloud Messaging:", apiUrls.cloudMessaging);
```

## Reset Everything

If nothing works, reset all FCM state:

```javascript
const fcmService = (await import("/src/services/fcmService.ts")).default;

// Nuclear option - reset everything
await fcmService.resetFCMState();

console.log("FCM state reset. Refresh the page and try again.");
```

## Check Token Health

```javascript
const fcmService = (await import("/src/services/fcmService.ts")).default;

const health = fcmService.getTokenHealth();
console.log("Token Health:", health);

if (!health.hasToken) {
  console.log("No token available");
} else if (health.isStale) {
  console.log("Token is stale (> 7 days old)");
  if (health.canRefresh) {
    console.log("You can refresh now");
  } else {
    console.log("Next refresh available:", health.nextRefreshTime);
  }
} else {
  console.log("Token is healthy");
  console.log("Age:", Math.floor(health.age / 1000 / 60), "minutes");
}
```

## Force Token Refresh

```javascript
const fcmService = (await import("/src/services/fcmService.ts")).default;

const newToken = await fcmService.forceRefresh();
console.log("New token:", newToken);
```

## Check Service Workers

```javascript
// List all service workers
const registrations = await navigator.serviceWorker.getRegistrations();

console.log(`Found ${registrations.length} service worker(s):`);
registrations.forEach((reg, i) => {
  console.log(`${i + 1}. Scope: ${reg.scope}`);
  console.log(`   Active: ${!!reg.active}`);
  console.log(`   Installing: ${!!reg.installing}`);
  console.log(`   Waiting: ${!!reg.waiting}`);
});

// Check for ready SW
const ready = await navigator.serviceWorker.ready;
console.log("Ready SW scope:", ready.scope);
```

## Unregister All Service Workers

```javascript
// Nuclear option - remove all service workers
const registrations = await navigator.serviceWorker.getRegistrations();

for (const registration of registrations) {
  await registration.unregister();
  console.log("Unregistered:", registration.scope);
}

console.log("All service workers unregistered. Refresh the page.");
```

## Check Notification Permission

```javascript
console.log("Current permission:", Notification.permission);

if (Notification.permission !== "granted") {
  const newPermission = await Notification.requestPermission();
  console.log("New permission:", newPermission);
}
```

## Test Notification Display

```javascript
// Test if browser can show notifications
if (Notification.permission === "granted") {
  new Notification("Test Notification", {
    body: "If you see this, notifications work!",
    icon: "/logo.svg",
  });
} else {
  console.log("Permission not granted. Current:", Notification.permission);
}
```

## Check localStorage

```javascript
// Check stored FCM data
const fcmData = localStorage.getItem("fcm_token_metadata");

if (fcmData) {
  const metadata = JSON.parse(fcmData);
  console.log("Stored token metadata:");
  console.log("- Token:", metadata.token?.substring(0, 20) + "...");
  console.log("- Timestamp:", new Date(metadata.timestamp));
  console.log(
    "- Age:",
    Math.floor((Date.now() - metadata.timestamp) / 1000 / 60),
    "minutes",
  );
  console.log("- Refresh attempts:", metadata.refreshAttempts);
} else {
  console.log("No token metadata in localStorage");
}
```

## Clear FCM localStorage

```javascript
localStorage.removeItem("fcm_token_metadata");
console.log("FCM metadata cleared");
```

## Full System Check

```javascript
console.log("=== FULL SYSTEM CHECK ===\n");

console.log("1. Browser:", navigator.userAgent);
console.log("2. Notification support:", "Notification" in window ? "Yes" : "No");
console.log(
  "3. Service Worker support:",
  "serviceWorker" in navigator ? "Yes" : "No",
);
console.log("4. Current permission:", Notification.permission);
console.log(
  "5. VAPID key configured:",
  !!import.meta.env.VITE_FIREBASE_VAPID_KEY ? "Yes" : "No",
);

// Service workers
const registrations = await navigator.serviceWorker.getRegistrations();
console.log("6. Service workers:", registrations.length);

// localStorage
const fcmData = localStorage.getItem("fcm_token_metadata");
console.log("7. Token in localStorage:", !!fcmData ? "Yes" : "No");

// FCM service state
const fcmService = (await import("/src/services/fcmService.ts")).default;
console.log("8. FCM initialized:", fcmService.isReady() ? "Yes" : "No");
console.log("9. Has token:", !!fcmService.getToken() ? "Yes" : "No");
```
