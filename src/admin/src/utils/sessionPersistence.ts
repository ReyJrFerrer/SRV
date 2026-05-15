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
  private static DB_NAME = "srve_admin_auth";
  private static STORE_NAME = "sessions";
  private static CURRENT_SESSION_KEY = "current";
  private static REFRESH_THRESHOLD = 0.8; // Refresh at 80% of lifetime
  private static FIREBASE_TOKEN_REFRESH = 50 * 60 * 1000; // Refresh Firebase token every 50 minutes (tokens expire at ~60 min)

  private db: IDBDatabase | null = null;
  private refreshTimer: number | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized && this.db) return;

    return new Promise((resolve) => {
      const request = indexedDB.open(SessionManager.DB_NAME, 1);

      request.onerror = () => {
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

  async storeSession(data: SessionData): Promise<void> {
    if (!this.isInitialized) await this.initialize();

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

    try {
      localStorage.setItem("srve_admin_session_data", JSON.stringify(data));
    } catch (error) {}

    this.scheduleRefresh(data.expiresAt);
  }

  async getSession(): Promise<SessionData | null> {
    if (!this.isInitialized) await this.initialize();

    let sessionData: SessionData | null = null;

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

    if (!sessionData) {
      try {
        const stored = localStorage.getItem("srve_admin_session_data");
        if (stored) {
          sessionData = JSON.parse(stored);
        }
      } catch (error) {}
    }

    if (sessionData) {
      return sessionData;
    }

    return null;
  }

  async clearSession(): Promise<void> {
    if (!this.isInitialized) await this.initialize();

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

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

    try {
      localStorage.removeItem("srve_admin_session_data");
    } catch (error) {}
  }

  private scheduleRefresh(expiresAt: number): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;

    if (timeUntilExpiry <= 0) return;

    const refreshAt = Math.min(
      SessionManager.FIREBASE_TOKEN_REFRESH,
      timeUntilExpiry * SessionManager.REFRESH_THRESHOLD,
    );

    this.refreshTimer = window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("admin-session-refresh-needed"));
    }, refreshAt);
  }

  async needsRefresh(): Promise<boolean> {
    const session = await this.getSession();
    if (!session) return false;

    const now = Date.now();
    const timeSinceFirebaseRefresh =
      now - (session.lastFirebaseRefresh || session.lastRefresh);

    const firebaseTokenNeedsRefresh =
      timeSinceFirebaseRefresh > SessionManager.FIREBASE_TOKEN_REFRESH;
    const pastICThreshold =
      now - session.lastRefresh >
      session.sessionDuration * SessionManager.REFRESH_THRESHOLD;

    return firebaseTokenNeedsRefresh || pastICThreshold;
  }

  async updateLastRefresh(): Promise<void> {
    const session = await this.getSession();
    if (session) {
      const now = Date.now();
      session.lastRefresh = now;
      session.lastFirebaseRefresh = now;
      await this.storeSession(session);
    }
  }

  async getTimeUntilExpiry(): Promise<number> {
    const session = await this.getSession();
    if (!session) return 0;

    return Math.max(0, session.expiresAt - Date.now());
  }

  cancelRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}

export const sessionManager = new SessionManager();

/**
 * Get recommended session duration for admin (1 hour in nanoseconds for IC)
 */
export function getRecommendedSessionDuration(): number {
  return 1 * 60 * 60 * 1000 * 1000 * 1000;
}
