/**
 * Session Persistence Manager
 *
 * Handles persistent storage of authentication session data using IndexedDB
 * with localStorage fallback for better cross-platform compatibility.
 * Implements proactive token refresh to prevent auto-logout on mobile devices.
 */

export interface SessionData {
  principal: string;
  firebaseToken: string;
  expiresAt: number; // IC session expiry timestamp (ms)
  lastRefresh: number; // Last token refresh timestamp (ms)
  lastFirebaseRefresh: number; // Last Firebase token refresh timestamp (ms)
  hasProfile: boolean;
  needsProfile: boolean;
  sessionDuration: number; // Original session duration in ms
}

export class SessionManager {
  private static DB_NAME = "wchl_auth";
  private static STORE_NAME = "sessions";
  private static CURRENT_SESSION_KEY = "current";
  private static REFRESH_THRESHOLD = 0.8; // Refresh at 80% of lifetime
  private static FIREBASE_TOKEN_REFRESH = 50 * 60 * 1000; // Refresh Firebase token every 50 minutes (tokens expire at ~60 min)

  private db: IDBDatabase | null = null;
  private refreshTimer: number | null = null;
  private isInitialized = false;

  /**
   * Initialize IndexedDB
   */
  async initialize(): Promise<void> {
    if (this.isInitialized && this.db) return;

    return new Promise((resolve) => {
      const request = indexedDB.open(SessionManager.DB_NAME, 1);

      request.onerror = () => {
        // Fallback to localStorage only if IndexedDB fails
        this.isInitialized = true;
        resolve();
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(SessionManager.STORE_NAME)) {
          db.createObjectStore(SessionManager.STORE_NAME);
        }
      };
    });
  }

  /**
   * Store complete session data in IndexedDB and localStorage backup
   */
  async storeSession(data: SessionData): Promise<void> {
    if (!this.isInitialized) await this.initialize();

    // Store in IndexedDB
    if (this.db) {
      try {
        await new Promise<void>((resolve, reject) => {
          const transaction = this.db!.transaction(
            [SessionManager.STORE_NAME],
            "readwrite",
          );
          const store = transaction.objectStore(SessionManager.STORE_NAME);
          const request = store.put(data, SessionManager.CURRENT_SESSION_KEY);

          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      } catch (error) {}
    }

    // Always store backup in localStorage (critical for iOS PWA)
    try {
      localStorage.setItem("wchl_session_data", JSON.stringify(data));
    } catch (error) {}

    // Schedule automatic refresh
    this.scheduleRefresh(data.expiresAt);
  }

  /**
   * Retrieve session data from IndexedDB or localStorage backup
   */
  async getSession(): Promise<SessionData | null> {
    if (!this.isInitialized) await this.initialize();

    let sessionData: SessionData | null = null;

    // Try IndexedDB first
    if (this.db) {
      try {
        sessionData = await new Promise<SessionData | null>((resolve) => {
          const transaction = this.db!.transaction(
            [SessionManager.STORE_NAME],
            "readonly",
          );
          const store = transaction.objectStore(SessionManager.STORE_NAME);
          const request = store.get(SessionManager.CURRENT_SESSION_KEY);

          request.onsuccess = () => {
            const data = request.result as SessionData | undefined;
            resolve(data || null);
          };
          request.onerror = () => resolve(null);
        });
      } catch (error) {}
    }

    // Fallback to localStorage
    if (!sessionData) {
      try {
        const stored = localStorage.getItem("wchl_session_data");
        if (stored) {
          sessionData = JSON.parse(stored);
        }
      } catch (error) {}
    }

    // Validate session hasn't expired
    if (sessionData && Date.now() < sessionData.expiresAt) {
      return sessionData;
    }

    // Clear expired session
    if (sessionData) {
      await this.clearSession();
    }

    return null;
  }

  /**
   * Clear session from all storage locations
   */
  async clearSession(): Promise<void> {
    if (!this.isInitialized) await this.initialize();

    // Clear refresh timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    // Clear from IndexedDB
    if (this.db) {
      try {
        await new Promise<void>((resolve) => {
          const transaction = this.db!.transaction(
            [SessionManager.STORE_NAME],
            "readwrite",
          );
          const store = transaction.objectStore(SessionManager.STORE_NAME);
          const request = store.delete(SessionManager.CURRENT_SESSION_KEY);

          request.onsuccess = () => resolve();
          request.onerror = () => resolve();
        });
      } catch (error) {}
    }

    // Clear from localStorage
    try {
      localStorage.removeItem("wchl_session_data");
    } catch (error) {}
  }

  /**
   * Schedule automatic refresh before session expires
   * Uses Firebase token refresh interval (50 min) to prevent token expiry
   */
  private scheduleRefresh(expiresAt: number): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;

    if (timeUntilExpiry <= 0) return;

    // Use Firebase token refresh interval (50 min) instead of IC session lifetime
    // This ensures Firebase tokens refresh before expiring (~1 hour)
    // regardless of platform (desktop 30 days vs mobile 7 days)
    const refreshAt = Math.min(
      SessionManager.FIREBASE_TOKEN_REFRESH,
      timeUntilExpiry * SessionManager.REFRESH_THRESHOLD,
    );

    // Schedule refresh
    this.refreshTimer = window.setTimeout(() => {
      // Dispatch custom event for refresh
      window.dispatchEvent(new CustomEvent("session-refresh-needed"));
    }, refreshAt);
  }

  /**
   * Check if session needs refresh based on Firebase token age
   * Firebase tokens expire after ~1 hour, so we refresh at 50 minutes
   */
  async needsRefresh(): Promise<boolean> {
    const session = await this.getSession();
    if (!session) return false;

    const now = Date.now();
    const timeUntilExpiry = session.expiresAt - now;
    const timeSinceFirebaseRefresh = now - (session.lastFirebaseRefresh || session.lastRefresh);

    // Refresh if Firebase token is older than 50 minutes OR we're past 80% of IC session lifetime
    const firebaseTokenNeedsRefresh =
      timeSinceFirebaseRefresh > SessionManager.FIREBASE_TOKEN_REFRESH;
    const pastICThreshold =
      (now - session.lastRefresh) >
      session.sessionDuration * SessionManager.REFRESH_THRESHOLD;

    return (firebaseTokenNeedsRefresh || pastICThreshold) && timeUntilExpiry > 60000; // At least 1 min remaining
  }

  /**
   * Update last refresh timestamp
   */
  async updateLastRefresh(): Promise<void> {
    const session = await this.getSession();
    if (session) {
      const now = Date.now();
      session.lastRefresh = now;
      session.lastFirebaseRefresh = now;
      await this.storeSession(session);
    }
  }

  /**
   * Get time until session expires (in milliseconds)
   */
  async getTimeUntilExpiry(): Promise<number> {
    const session = await this.getSession();
    if (!session) return 0;

    return Math.max(0, session.expiresAt - Date.now());
  }

  /**
   * Cancel any scheduled refresh
   */
  cancelRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();

/**
 * Detect platform for session duration optimization
 */
export function detectPlatform(): {
  isPWA: boolean;
  isMobile: boolean;
  isIOS: boolean;
} {
  const isPWA = window.matchMedia("(display-mode: standalone)").matches;
  const userAgent = navigator.userAgent || "";
  const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);

  return { isPWA, isMobile, isIOS };
}

/**
 * Get recommended session duration based on platform
 */
export function getRecommendedSessionDuration(): number {
  const { isPWA, isMobile } = detectPlatform();

  if (isPWA || isMobile) {
    // 7 days for mobile/PWA (in nanoseconds for IC)
    return 7 * 24 * 60 * 60 * 1000 * 1000 * 1000;
  } else {
    // 30 days for desktop (in nanoseconds for IC)
    return 30 * 24 * 60 * 60 * 1000 * 1000 * 1000;
  }
}
