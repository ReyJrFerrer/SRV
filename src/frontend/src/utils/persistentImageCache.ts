/**
 * Persistent image cache using sessionStorage for profile pictures
 * Provides instant loading on navigation within the same session
 */

const CACHE_KEY_PREFIX = "profile_image_";
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CachedImageData {
  dataUrl: string;
  timestamp: number;
}

export const persistentImageCache = {
  /**
   * Store an image data URL in sessionStorage
   * @param key - The image URL or identifier
   * @param dataUrl - The base64 data URL of the image
   */
  async set(key: string, dataUrl: string): Promise<void> {
    try {
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
    }
  },

  /**
   * Retrieve a cached image data URL from sessionStorage
   * @param key - The image URL or identifier
   * @returns The cached data URL or null if not found/expired
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

      return dataUrl;
    } catch (error) {
      console.warn("Failed to retrieve cached image:", error);
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
