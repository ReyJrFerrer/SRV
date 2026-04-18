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
  `;

  const content = document.createElement("div");
  content.style.cssText = `flex: 1; min-width: 0;`;

  const titleRow = document.createElement("div");
  titleRow.style.cssText = `display: flex; align-items: center; gap: 8px; margin-bottom: 6px;`;

  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("style", "width: 20px; height: 20px; flex-shrink: 0;");
  icon.setAttribute("fill", "currentColor");
  icon.setAttribute("viewBox", "0 0 20 20");
  icon.innerHTML = `<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" />`;
  titleRow.appendChild(icon);

  const title = document.createElement("strong");
  title.style.cssText = `font-size: 16px; font-weight: 700;`;
  title.textContent = "New Version Available!";
  titleRow.appendChild(title);
  content.appendChild(titleRow);

  const desc = document.createElement("p");
  desc.style.cssText = `margin: 0; font-size: 14px; opacity: 0.95; line-height: 1.4;`;
  desc.textContent =
    "Please reload to get the latest updates and improvements.";
  content.appendChild(desc);

  container.appendChild(content);

  const buttonContainer = document.createElement("div");
  buttonContainer.style.cssText = `display: flex; flex-direction: column; gap: 8px; flex-shrink: 0;`;

  const reloadButton = document.createElement("button");
  reloadButton.style.cssText = `
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
  `;
  reloadButton.textContent = "Reload Now";
  reloadButton.addEventListener("click", async () => {
    await clearAllCaches();
    window.location.reload();
  });
  buttonContainer.appendChild(reloadButton);

  const dismissButton = document.createElement("button");
  dismissButton.style.cssText = `
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
  `;
  dismissButton.textContent = "Later";
  dismissButton.addEventListener("click", () => {
    notification.remove();
  });
  buttonContainer.appendChild(dismissButton);

  container.appendChild(buttonContainer);
  notification.appendChild(container);

  const style = document.createElement("style");
  style.textContent = `
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
