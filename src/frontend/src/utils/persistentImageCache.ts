/**
 * Persistent image cache using sessionStorage for profile pictures
 * Provides instant loading on navigation within the same session
 */

const CACHE_KEY_PREFIX = "profile_image_";
const CACHE_EXPIRY_MS = 60 * 60 * 1000; // 1 hour (session-based cache)

interface CachedImageData {
  dataUrl: string;
  timestamp: number;
}

/**
 * Validates that a data URL is valid and not blank
 */
const isValidDataUrl = (dataUrl: string): boolean => {
  if (!dataUrl || typeof dataUrl !== "string") return false;

  // Check if it's a valid URL format (http/https or data URL)
  if (dataUrl.startsWith("http://") || dataUrl.startsWith("https://")) {
    return true;
  }

  // For data URLs, ensure they have actual content
  if (dataUrl.startsWith("data:")) {
    // Check if there's content after the base64 marker
    const base64Content = dataUrl.split(",")[1];
    return !!(base64Content && base64Content.length > 100); // Minimum viable image size
  }

  return false;
};

export const persistentImageCache = {
  /**
   * Store an image data URL in sessionStorage
   * @param key - The image URL or identifier
   * @param dataUrl - The base64 data URL of the image
   */
  async set(key: string, dataUrl: string): Promise<void> {
    try {
      // Validate data URL before caching
      if (!isValidDataUrl(dataUrl)) {
        console.warn("Attempted to cache invalid or blank image data");
        return;
      }

      const cacheData: CachedImageData = {
        dataUrl,
        timestamp: Date.now(),
      };
      sessionStorage.setItem(
        `${CACHE_KEY_PREFIX}${key}`,
        JSON.stringify(cacheData),
      );
    } catch (error) {
      // SessionStorage might be full or unavailable
      console.warn("Failed to cache image:", error);
      // If storage is full, try to clear old entries
      if (error instanceof Error && error.name === "QuotaExceededError") {
        this.clearExpired();
      }
    }
  },

  /**
   * Retrieve a cached image data URL from sessionStorage
   * @param key - The image URL or identifier
   * @returns The cached data URL or null if not found/expired/invalid
   */
  async get(key: string): Promise<string | null> {
    try {
      const cached = sessionStorage.getItem(`${CACHE_KEY_PREFIX}${key}`);
      if (!cached) return null;

      const { dataUrl, timestamp }: CachedImageData = JSON.parse(cached);

      // Check if cache is still valid
      if (Date.now() - timestamp > CACHE_EXPIRY_MS) {
        sessionStorage.removeItem(`${CACHE_KEY_PREFIX}${key}`);
        return null;
      }

      // Validate the cached data before returning
      if (!isValidDataUrl(dataUrl)) {
        console.warn("Cached image data is invalid, clearing");
        sessionStorage.removeItem(`${CACHE_KEY_PREFIX}${key}`);
        return null;
      }

      return dataUrl;
    } catch (error) {
      console.warn("Failed to retrieve cached image:", error);
      // Clear corrupted cache entry
      try {
        sessionStorage.removeItem(`${CACHE_KEY_PREFIX}${key}`);
      } catch {}
      return null;
    }
  },

  /**
   * Clear a specific cached image
   * @param key - The image URL or identifier
   */
  async clear(key: string): Promise<void> {
    try {
      sessionStorage.removeItem(`${CACHE_KEY_PREFIX}${key}`);
    } catch (error) {
      console.warn("Failed to clear cached image:", error);
    }
  },

  /**
   * Clear expired cached images
   */
  clearExpired(): void {
    try {
      const keys = Object.keys(sessionStorage);
      const now = Date.now();

      keys.forEach((key) => {
        if (key.startsWith(CACHE_KEY_PREFIX)) {
          try {
            const cached = sessionStorage.getItem(key);
            if (cached) {
              const { timestamp }: CachedImageData = JSON.parse(cached);
              if (now - timestamp > CACHE_EXPIRY_MS) {
                sessionStorage.removeItem(key);
              }
            }
          } catch {
            // Remove corrupted entries
            sessionStorage.removeItem(key);
          }
        }
      });
    } catch (error) {
      console.warn("Failed to clear expired cached images:", error);
    }
  },

  /**
   * Clear all cached profile images
   */
  async clearAll(): Promise<void> {
    try {
      const keys = Object.keys(sessionStorage);
      keys.forEach((key) => {
        if (key.startsWith(CACHE_KEY_PREFIX)) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn("Failed to clear all cached images:", error);
    }
  },
};
