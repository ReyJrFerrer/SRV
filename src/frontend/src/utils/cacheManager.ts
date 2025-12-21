/**
 * Cache Manager
 * Handles cache invalidation for Google Maps and other external resources
 * to prevent AuthFailure and stale content issues
 */

const CACHE_VERSION_KEY = "app_cache_version";
const CURRENT_CACHE_VERSION = "1.0.0"; // Increment this when you need to invalidate all caches

/**
 * Check if cache needs to be cleared based on version
 */
export function shouldClearCache(): boolean {
  try {
    const storedVersion = localStorage.getItem(CACHE_VERSION_KEY);
    return storedVersion !== CURRENT_CACHE_VERSION;
  } catch {
    return false;
  }
}

/**
 * Clear all browser caches (Cache API, Service Worker caches, localStorage)
 */
export async function clearAllCaches(): Promise<void> {
  console.log("[CacheManager] Clearing all caches...");

  try {
    // Clear Cache API caches
    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => {
          console.log("[CacheManager] Deleting cache:", cacheName);
          return caches.delete(cacheName);
        }),
      );
    }

    // Clear specific localStorage items that might cause issues
    const itemsToRemove = ["GMAPS_ADDR_CACHE_COMMON_V1", "GEOCODE_CACHE_V1"];

    itemsToRemove.forEach((item) => {
      try {
        localStorage.removeItem(item);
      } catch {}
    });

    // Update cache version
    localStorage.setItem(CACHE_VERSION_KEY, CURRENT_CACHE_VERSION);

    console.log("[CacheManager] Cache cleared successfully");
  } catch (error) {
    console.error("[CacheManager] Error clearing caches:", error);
  }
}

/**
 * Initialize cache management on app startup
 */
export async function initializeCacheManagement(): Promise<void> {
  if (shouldClearCache()) {
    console.log(
      "[CacheManager] Cache version mismatch detected, clearing caches...",
    );
    await clearAllCaches();
  }

  // Listen for Google Maps auth errors
  window.addEventListener("error", (event) => {
    const errorMessage = event.message || "";

    // Detect Google Maps AuthFailure
    if (
      errorMessage.includes("Google Maps") &&
      (errorMessage.includes("AuthFailure") || errorMessage.includes("auth"))
    ) {
      console.error("[CacheManager] Google Maps AuthFailure detected");

      // Show user-friendly message
      const shouldReload = window.confirm(
        "Google Maps failed to load due to cached credentials. " +
          "Would you like to clear the cache and reload? " +
          "(Recommended)",
      );

      if (shouldReload) {
        clearAllCaches().then(() => {
          window.location.reload();
        });
      }
    }
  });
}

/**
 * Force clear cache and reload (for user-triggered cache clear)
 */
export async function forceClearAndReload(): Promise<void> {
  await clearAllCaches();
  // Force reload without cache
  window.location.reload();
}
