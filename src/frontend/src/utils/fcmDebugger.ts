/**
 * FCM Debugger Utility
 * Comprehensive debugging and testing tool for Firebase Cloud Messaging
 * 
 * This utility helps diagnose FCM issues by:
 * - Checking browser compatibility
 * - Validating Firebase configuration
 * - Testing service worker registration
 * - Monitoring token generation
 * - Testing notification permissions
 * - Validating VAPID key
 */

import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { getFirebaseApp } from "../services/firebaseApp";

export interface FCMDiagnostics {
  timestamp: string;
  browserSupport: {
    notificationAPI: boolean;
    serviceWorker: boolean;
    pushManager: boolean;
    fcmSupported: boolean;
  };
  configuration: {
    firebaseConfigValid: boolean;
    vapidKeyPresent: boolean;
    vapidKeyValue: string;
    projectId: string;
    messagingSenderId: string;
  };
  serviceWorker: {
    registered: boolean;
    active: boolean;
    scope?: string;
    state?: string;
    scriptURL?: string;
  };
  permissions: {
    notificationPermission: NotificationPermission;
    canRequestPermission: boolean;
  };
  token: {
    generated: boolean;
    value?: string;
    error?: string;
  };
  issues: string[];
  recommendations: string[];
}

/**
 * Run comprehensive FCM diagnostics
 */
export async function runFCMDiagnostics(): Promise<FCMDiagnostics> {
  const diagnostics: FCMDiagnostics = {
    timestamp: new Date().toISOString(),
    browserSupport: {
      notificationAPI: false,
      serviceWorker: false,
      pushManager: false,
      fcmSupported: false,
    },
    configuration: {
      firebaseConfigValid: false,
      vapidKeyPresent: false,
      vapidKeyValue: "",
      projectId: "",
      messagingSenderId: "",
    },
    serviceWorker: {
      registered: false,
      active: false,
    },
    permissions: {
      notificationPermission: "default",
      canRequestPermission: false,
    },
    token: {
      generated: false,
    },
    issues: [],
    recommendations: [],
  };

  // Check browser support
  diagnostics.browserSupport.notificationAPI = "Notification" in window;
  diagnostics.browserSupport.serviceWorker = "serviceWorker" in navigator;
  diagnostics.browserSupport.pushManager = "PushManager" in window;

  if (!diagnostics.browserSupport.notificationAPI) {
    diagnostics.issues.push("Browser does not support Notification API");
    diagnostics.recommendations.push("Use a modern browser (Chrome, Firefox, Edge)");
  }

  if (!diagnostics.browserSupport.serviceWorker) {
    diagnostics.issues.push("Browser does not support Service Workers");
    diagnostics.recommendations.push("Update your browser to the latest version");
  }

  if (!diagnostics.browserSupport.pushManager) {
    diagnostics.issues.push("Browser does not support Push Manager");
    diagnostics.recommendations.push("Use a browser that supports Push API");
  }

  // Check FCM support
  try {
    diagnostics.browserSupport.fcmSupported = await isSupported();
    if (!diagnostics.browserSupport.fcmSupported) {
      diagnostics.issues.push("Firebase Cloud Messaging is not supported in this environment");
      diagnostics.recommendations.push("Check if you're using HTTPS or localhost");
    }
  } catch (error) {
    diagnostics.issues.push(`FCM support check failed: ${error}`);
  }

  // Check Firebase configuration
  try {
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
    const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;

    diagnostics.configuration.vapidKeyPresent = !!vapidKey;
    diagnostics.configuration.vapidKeyValue = vapidKey ? `${vapidKey.substring(0, 20)}...` : "";
    diagnostics.configuration.projectId = projectId || "";
    diagnostics.configuration.messagingSenderId = messagingSenderId || "";
    diagnostics.configuration.firebaseConfigValid = !!(apiKey && projectId && messagingSenderId);

    if (!diagnostics.configuration.vapidKeyPresent) {
      diagnostics.issues.push("VAPID key is missing from environment variables");
      diagnostics.recommendations.push("Add VITE_FIREBASE_VAPID_KEY to your .env file");
    }

    if (!diagnostics.configuration.firebaseConfigValid) {
      diagnostics.issues.push("Firebase configuration is incomplete");
      diagnostics.recommendations.push("Verify all Firebase environment variables are set");
    }

    // Validate VAPID key format
    if (vapidKey && !vapidKey.match(/^[A-Za-z0-9_-]{87}$/)) {
      diagnostics.issues.push("VAPID key format appears invalid");
      diagnostics.recommendations.push("VAPID key should be a 87-character base64url string");
    }
  } catch (error) {
    diagnostics.issues.push(`Configuration check failed: ${error}`);
  }

  // Check service worker
  if (diagnostics.browserSupport.serviceWorker) {
    try {
      const registration = await navigator.serviceWorker.ready;
      diagnostics.serviceWorker.registered = true;
      diagnostics.serviceWorker.active = !!registration.active;
      diagnostics.serviceWorker.scope = registration.scope;
      diagnostics.serviceWorker.state = registration.active?.state;
      diagnostics.serviceWorker.scriptURL = registration.active?.scriptURL;

      if (!diagnostics.serviceWorker.active) {
        diagnostics.issues.push("Service Worker is registered but not active");
        diagnostics.recommendations.push("Wait for service worker to activate or reload the page");
      }
    } catch (error) {
      diagnostics.issues.push(`Service Worker check failed: ${error}`);
      diagnostics.recommendations.push("Ensure service worker is properly configured in vite.config.ts");
    }
  }

  // Check permissions
  if (diagnostics.browserSupport.notificationAPI) {
    diagnostics.permissions.notificationPermission = Notification.permission;
    diagnostics.permissions.canRequestPermission = Notification.permission === "default";

    if (diagnostics.permissions.notificationPermission === "denied") {
      diagnostics.issues.push("Notification permission is denied");
      diagnostics.recommendations.push("Enable notifications in browser settings");
    } else if (diagnostics.permissions.notificationPermission === "default") {
      diagnostics.recommendations.push("Request notification permission from user");
    }
  }

  // Try to get token
  if (
    diagnostics.browserSupport.fcmSupported &&
    diagnostics.configuration.firebaseConfigValid &&
    diagnostics.serviceWorker.active &&
    diagnostics.permissions.notificationPermission === "granted"
  ) {
    try {
      const app = getFirebaseApp();
      const messaging = getMessaging(app);
      const registration = await navigator.serviceWorker.ready;
      
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: registration,
      });

      if (token) {
        diagnostics.token.generated = true;
        diagnostics.token.value = `${token.substring(0, 20)}...`;
      } else {
        diagnostics.token.generated = false;
        diagnostics.issues.push("Token generation returned empty result");
        diagnostics.recommendations.push("Check Firebase Console for project configuration");
      }
    } catch (error: any) {
      diagnostics.token.generated = false;
      diagnostics.token.error = error.message || String(error);
      
      // Provide specific recommendations based on error
      if (error.code === "messaging/token-subscribe-failed") {
        diagnostics.issues.push("Failed to subscribe to FCM: Push service error");
        diagnostics.recommendations.push("This may be a temporary Firebase issue. Wait 60 seconds and try again");
        diagnostics.recommendations.push("Clear browser cache and service workers, then retry");
      } else if (error.code === "messaging/token-subscribe-no-token") {
        diagnostics.issues.push("Push subscription succeeded but no FCM token received");
        diagnostics.recommendations.push("Check Firebase project configuration");
      } else if (error.message?.includes("429") || error.message?.includes("Too Many Requests")) {
        diagnostics.issues.push("Rate limit exceeded (too many token requests)");
        diagnostics.recommendations.push("Wait at least 60 seconds before retrying");
        diagnostics.recommendations.push("Check for multiple FCM initialization attempts in your code");
      } else {
        diagnostics.issues.push(`Token generation failed: ${error.message}`);
      }
    }
  } else {
    diagnostics.issues.push("Token generation skipped - prerequisites not met");
  }

  return diagnostics;
}

/**
 * Format diagnostics for console output
 */
export function formatDiagnostics(diagnostics: FCMDiagnostics): string {
  const lines: string[] = [];
  
  lines.push("=".repeat(60));
  lines.push("FCM DIAGNOSTICS REPORT");
  lines.push(`Timestamp: ${diagnostics.timestamp}`);
  lines.push("=".repeat(60));
  
  lines.push("\n📱 BROWSER SUPPORT:");
  lines.push(`  Notification API: ${diagnostics.browserSupport.notificationAPI ? "✅" : "❌"}`);
  lines.push(`  Service Worker: ${diagnostics.browserSupport.serviceWorker ? "✅" : "❌"}`);
  lines.push(`  Push Manager: ${diagnostics.browserSupport.pushManager ? "✅" : "❌"}`);
  lines.push(`  FCM Supported: ${diagnostics.browserSupport.fcmSupported ? "✅" : "❌"}`);
  
  lines.push("\n⚙️  CONFIGURATION:");
  lines.push(`  Firebase Config: ${diagnostics.configuration.firebaseConfigValid ? "✅" : "❌"}`);
  lines.push(`  VAPID Key: ${diagnostics.configuration.vapidKeyPresent ? "✅" : "❌"}`);
  lines.push(`  Project ID: ${diagnostics.configuration.projectId || "N/A"}`);
  lines.push(`  Sender ID: ${diagnostics.configuration.messagingSenderId || "N/A"}`);
  if (diagnostics.configuration.vapidKeyValue) {
    lines.push(`  VAPID (preview): ${diagnostics.configuration.vapidKeyValue}`);
  }
  
  lines.push("\n🔧 SERVICE WORKER:");
  lines.push(`  Registered: ${diagnostics.serviceWorker.registered ? "✅" : "❌"}`);
  lines.push(`  Active: ${diagnostics.serviceWorker.active ? "✅" : "❌"}`);
  if (diagnostics.serviceWorker.scope) {
    lines.push(`  Scope: ${diagnostics.serviceWorker.scope}`);
  }
  if (diagnostics.serviceWorker.state) {
    lines.push(`  State: ${diagnostics.serviceWorker.state}`);
  }
  
  lines.push("\n🔔 PERMISSIONS:");
  lines.push(`  Status: ${diagnostics.permissions.notificationPermission.toUpperCase()}`);
  lines.push(`  Can Request: ${diagnostics.permissions.canRequestPermission ? "Yes" : "No"}`);
  
  lines.push("\n🎫 TOKEN:");
  lines.push(`  Generated: ${diagnostics.token.generated ? "✅" : "❌"}`);
  if (diagnostics.token.value) {
    lines.push(`  Value (preview): ${diagnostics.token.value}`);
  }
  if (diagnostics.token.error) {
    lines.push(`  Error: ${diagnostics.token.error}`);
  }
  
  if (diagnostics.issues.length > 0) {
    lines.push("\n❌ ISSUES FOUND:");
    diagnostics.issues.forEach((issue, i) => {
      lines.push(`  ${i + 1}. ${issue}`);
    });
  }
  
  if (diagnostics.recommendations.length > 0) {
    lines.push("\n💡 RECOMMENDATIONS:");
    diagnostics.recommendations.forEach((rec, i) => {
      lines.push(`  ${i + 1}. ${rec}`);
    });
  }
  
  lines.push("\n" + "=".repeat(60));
  
  return lines.join("\n");
}

/**
 * Log diagnostics to console
 */
export async function logFCMDiagnostics(): Promise<void> {
  console.log("[FCM Debugger] Running diagnostics...");
  const diagnostics = await runFCMDiagnostics();
  console.log(formatDiagnostics(diagnostics));
  
  // Also return raw data for programmatic access
  console.log("[FCM Debugger] Raw data:", diagnostics);
}

/**
 * Export diagnostics as JSON
 */
export async function exportDiagnostics(): Promise<string> {
  const diagnostics = await runFCMDiagnostics();
  return JSON.stringify(diagnostics, null, 2);
}

/**
 * Test notification display
 */
export async function testNotification(): Promise<boolean> {
  try {
    if (!("Notification" in window)) {
      console.error("[FCM Test] Notifications not supported");
      return false;
    }

    if (Notification.permission !== "granted") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        console.error("[FCM Test] Permission denied");
        return false;
      }
    }

    const notification = new Notification("FCM Test", {
      body: "This is a test notification from FCM Debugger",
      icon: "/logo.svg",
      badge: "/logo.svg",
      tag: "fcm-test",
    });

    notification.onclick = () => {
      console.log("[FCM Test] Notification clicked");
      notification.close();
    };

    console.log("[FCM Test] Test notification displayed");
    return true;
  } catch (error) {
    console.error("[FCM Test] Failed to display notification:", error);
    return false;
  }
}

/**
 * Clear all FCM-related cache and data
 */
export async function clearFCMCache(): Promise<void> {
  try {
    // Clear localStorage
    localStorage.removeItem("fcm_token");
    localStorage.removeItem("fcm_token_timestamp");
    
    // Unregister service workers
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
        console.log("[FCM Debugger] Unregistered service worker:", registration.scope);
      }
    }
    
    console.log("[FCM Debugger] Cache cleared successfully");
  } catch (error) {
    console.error("[FCM Debugger] Failed to clear cache:", error);
  }
}

// Expose to window for easy console access
if (typeof window !== "undefined") {
  (window as any).fcmDebugger = {
    runDiagnostics: runFCMDiagnostics,
    logDiagnostics: logFCMDiagnostics,
    exportDiagnostics,
    testNotification,
    clearCache: clearFCMCache,
  };
  
  console.log(
    "%c[FCM Debugger] Utilities available: window.fcmDebugger",
    "color: #00bcd4; font-weight: bold"
  );
  console.log("Commands:");
  console.log("  - window.fcmDebugger.logDiagnostics() - Run full diagnostic report");
  console.log("  - window.fcmDebugger.testNotification() - Test notification display");
  console.log("  - window.fcmDebugger.clearCache() - Clear all FCM cache and service workers");
  console.log("  - window.fcmDebugger.exportDiagnostics() - Export diagnostics as JSON");
}
