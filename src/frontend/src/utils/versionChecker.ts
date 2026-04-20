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
  } catch (error) {}
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
    } catch (error) {}
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
  const existingNotification = document.getElementById("app-update-notification");
  if (existingNotification) {
    existingNotification.remove();
  }

  const notification = document.createElement("div");
  notification.id = "app-update-notification";
  notification.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      max-width: 90%;
      width: 480px;
      background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
      color: white;
      padding: 20px 24px;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(37, 99, 235, 0.3), 0 4px 12px rgba(0, 0, 0, 0.2);
      z-index: 10000;
      display: flex;
      align-items: center;
      gap: 20px;
      font-family: system-ui, -apple-system, sans-serif;
      animation: slideDown 0.3s ease-out;
      border: 1px solid rgba(255, 255, 255, 0.2);
    ">
      <div style="
        flex: 1;
        min-width: 0;
      ">
        <div style="
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        ">
          <svg style="width: 20px; height: 20px; flex-shrink: 0;" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" />
          </svg>
          <strong style="font-size: 16px; font-weight: 700;">New Version Available!</strong>
        </div>
        <p style="
          margin: 0;
          font-size: 14px;
          opacity: 0.95;
          line-height: 1.4;
        ">
          Please reload to get the latest updates and improvements.
        </p>
      </div>
      <div style="
        display: flex;
        flex-direction: column;
        gap: 8px;
        flex-shrink: 0;
      ">
        <button id="reload-app-btn" style="
          background: #fdcc38;
          color: #1f2937;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(253, 204, 56, 0.3);
        "
        onmouseover="this.style.background='#fdd761'; this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(253, 204, 56, 0.4)';"
        onmouseout="this.style.background='#fdcc38'; this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(253, 204, 56, 0.3)';"
        >
          Reload Now
        </button>
        <button id="dismiss-update-btn" style="
          background: transparent;
          color: white;
          border: 2px solid rgba(255, 255, 255, 0.4);
          padding: 8px 20px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
        "
        onmouseover="this.style.background='rgba(255, 255, 255, 0.1)'; this.style.borderColor='rgba(255, 255, 255, 0.6)';"
        onmouseout="this.style.background='transparent'; this.style.borderColor='rgba(255, 255, 255, 0.4)';"
        >
          Later
        </button>
      </div>
    </div>
    <style>
      @keyframes slideDown {
        from {
          transform: translateX(-50%) translateY(-120%);
          opacity: 0;
        }
        to {
          transform: translateX(-50%) translateY(0);
          opacity: 1;
        }
      }
      
      @media (max-width: 640px) {
        #app-update-notification > div {
          flex-direction: column;
          text-align: center;
          padding: 20px;
        }
        
        #app-update-notification button {
          width: 100%;
        }
      }
    </style>
  `;

  document.body.appendChild(notification);

  // Add reload handler
  document.getElementById("reload-app-btn")?.addEventListener("click", () => {
    // Clear all caches before reload
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
  } catch (error) {}
}

/**
 * Force check for updates (can be called manually)
 */
export async function checkForUpdates(): Promise<boolean> {
  try {
    const latestVersion = await fetchVersion();
    return currentVersion !== latestVersion;
  } catch (error) {
    return false;
  }
}
