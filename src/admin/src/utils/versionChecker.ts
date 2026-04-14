/**
 * Version Checker Utility
 * Automatically detects new deployments and prompts users to reload
 */

const VERSION_CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
const VERSION_FILE_PATH = "/version.json";

interface VersionInfo {
  buildTime: string;
  version: string;
}

let currentVersion: string | null = null;
let checkInterval: NodeJS.Timeout | null = null;

/**
 * Initialize version checker
 */
export async function initVersionChecker(): Promise<void> {
  try {
    // Get initial version
    currentVersion = await fetchVersion();

    // Start periodic checks
    startVersionCheck();
  } catch (error) {
    console.warn("Version checker initialization failed:", error);
  }
}

/**
 * Fetch current version from server
 */
async function fetchVersion(): Promise<string> {
  try {
    const response = await fetch(VERSION_FILE_PATH, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch version: ${response.status}`);
    }

    const data: VersionInfo = await response.json();
    return data.buildTime;
  } catch (error) {
    // If version file doesn't exist yet, return current timestamp
    console.warn("Version file not found, using fallback");
    return new Date().toISOString();
  }
}

/**
 * Start periodic version checks
 */
function startVersionCheck(): void {
  if (checkInterval) {
    return; // Already running
  }

  checkInterval = setInterval(async () => {
    try {
      const latestVersion = await fetchVersion();

      if (currentVersion && latestVersion !== currentVersion) {
        // Notify user about new version
        showUpdateNotification();
      }
    } catch (error) {
      console.warn("Version check failed:", error);
    }
  }, VERSION_CHECK_INTERVAL);
}
/**
 * Stop version checks
 */
export function stopVersionChecker(): void {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
}

/**
 * Show update notification to user
 */
function showUpdateNotification(): void {
  // Create a custom notification
  const notification = document.createElement("div");
  notification.id = "app-update-notification";
  notification.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #2563eb;
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      display: flex;
      align-items: center;
      gap: 16px;
      font-family: system-ui, -apple-system, sans-serif;
      animation: slideDown 0.3s ease-out;
    ">
      <div>
        <strong>New Version Available!</strong>
        <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.9;">
          Please reload to get the latest updates.
        </p>
      </div>
      <button id="reload-app-btn" style="
        background: white;
        color: #2563eb;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
      "
      onclick="(async()=>{try{if('caches' in window){const k=await caches.keys();await Promise.all(k.map(n=>caches.delete(n)));}if('serviceWorker' in navigator){const r=await navigator.serviceWorker.getRegistrations();await Promise.all(r.map(s=>s.unregister()));}localStorage.removeItem('app-version');}catch(e){console.error('Failed to clear caches:',e);}finally{window.location.reload();}})()">
        Reload Now
      </button>
      <button id="dismiss-update-btn" style="
        background: transparent;
        color: white;
        border: 1px solid rgba(255,255,255,0.3);
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        white-space: nowrap;
      ">
        Later
      </button>
    </div>
    <style>
      @keyframes slideDown {
        from {
          transform: translateX(-50%) translateY(-100%);
          opacity: 0;
        }
        to {
          transform: translateX(-50%) translateY(0);
          opacity: 1;
        }
      }
    </style>
  `;

  document.body.appendChild(notification);

  // Add reload handler
  document.getElementById("reload-app-btn")?.addEventListener("click", () => {
    clearAllCaches().then(() => {
      window.location.reload();
    });
  });

  // Add dismiss handler
  document
    .getElementById("dismiss-update-btn")
    ?.addEventListener("click", () => {
      notification.remove();
    });
}

/**
 * Clear all browser caches
 */
async function clearAllCaches(): Promise<void> {
  try {
    // Clear Cache API
    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName)),
      );
    }

    // Unregister service workers
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map((registration) => registration.unregister()),
      );
    }

    // Clear localStorage version marker
    localStorage.removeItem("app-version");
  } catch (error) {
    console.error("Failed to clear caches:", error);
  }
}

/**
 * Force check for updates (can be called manually)
 */
export async function checkForUpdates(): Promise<boolean> {
  try {
    const latestVersion = await fetchVersion();
    return currentVersion !== latestVersion;
  } catch (error) {
    console.error("Failed to check for updates:", error);
    return false;
  }
}
