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
  if (document.getElementById("app-update-notification")) {
    return;
  }

  const notification = document.createElement("div");
  notification.id = "app-update-notification";

  const container = document.createElement("div");
  container.style.cssText = `
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
  `;

  const content = document.createElement("div");
  const title = document.createElement("strong");
  title.textContent = "New Version Available!";
  content.appendChild(title);

  const desc = document.createElement("p");
  desc.style.cssText = "margin: 4px 0 0 0; font-size: 14px; opacity: 0.9;";
  desc.textContent = "Please reload to get the latest updates.";
  content.appendChild(desc);

  container.appendChild(content);

  const reloadButton = document.createElement("button");
  reloadButton.style.cssText = `
    background: white;
    color: #2563eb;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
  `;
  reloadButton.textContent = "Reload Now";
  reloadButton.addEventListener("click", async () => {
    await clearAllCaches();
    window.location.reload();
  });
  container.appendChild(reloadButton);

  const dismissButton = document.createElement("button");
  dismissButton.style.cssText = `
    background: transparent;
    color: white;
    border: 1px solid rgba(255,255,255,0.3);
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    white-space: nowrap;
  `;
  dismissButton.textContent = "Later";
  dismissButton.addEventListener("click", () => {
    notification.remove();
  });
  container.appendChild(dismissButton);

  notification.appendChild(container);

  const style = document.createElement("style");
  style.textContent = `
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
  `;
  notification.appendChild(style);

  document.body.appendChild(notification);
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
