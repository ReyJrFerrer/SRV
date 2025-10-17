import {
  getMessaging,
  getToken,
  onMessage,
  deleteToken,
  type Messaging,
} from "firebase/messaging";
import { getFirebaseApp } from "./firebaseApp";
import notificationCanisterService from "./notificationCanisterService";

/**
 * Firebase Cloud Messaging (FCM) service wrapper
 * Works with Vite PWA generated service worker
 *
 * Responsibilities:
 * - Initialize Firebase Messaging with Vite PWA service worker
 * - Request notification permission
 * - Get and manage FCM tokens
 * - Listen for foreground messages
 * - Display foreground notifications
 */
class FCMService {
  private static instance: FCMService;
  private messaging: Messaging | null = null;
  private currentToken: string | null = null;
  private isInitialized = false;
  private initializationPromise: Promise<string | null> | null = null;
  private rateLimitedUntil: number = 0;
  private readonly RATE_LIMIT_COOLDOWN = 60000; // 1 minute cooldown
  private readonly TOKEN_STORAGE_KEY = "fcm_token";
  private readonly TOKEN_TIMESTAMP_KEY = "fcm_token_timestamp";
  private readonly TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

  private constructor() {
    // Try to load cached token
    this.loadCachedToken();
  }

  static getInstance(): FCMService {
    if (!FCMService.instance) {
      FCMService.instance = new FCMService();
    }
    return FCMService.instance;
  }

  /**
   * Set the service worker registration from Vite PWA
   * This should be called before initialize()
   */
  setServiceWorkerRegistration(registration: ServiceWorkerRegistration): void {
    console.log("[FCM] Service Worker registration set:", registration.scope);
  }

  /**
   * Load cached token from localStorage
   */
  private loadCachedToken(): void {
    try {
      const token = localStorage.getItem(this.TOKEN_STORAGE_KEY);
      const timestamp = localStorage.getItem(this.TOKEN_TIMESTAMP_KEY);

      if (token && timestamp) {
        const age = Date.now() - parseInt(timestamp, 10);
        if (age < this.TOKEN_MAX_AGE) {
          this.currentToken = token;
          this.isInitialized = true;
          console.log(
            "[FCM] Loaded cached token (age:",
            Math.floor(age / 1000 / 60),
            "minutes)",
          );
        } else {
          console.log("[FCM] Cached token expired, will refresh");
          this.clearCachedToken();
        }
      }
    } catch (error) {
      console.error("[FCM] Failed to load cached token:", error);
    }
  }

  /**
   * Save token to localStorage
   */
  private saveCachedToken(token: string): void {
    try {
      localStorage.setItem(this.TOKEN_STORAGE_KEY, token);
      localStorage.setItem(this.TOKEN_TIMESTAMP_KEY, Date.now().toString());
      console.log("[FCM] Token cached");
    } catch (error) {
      console.error("[FCM] Failed to cache token:", error);
    }
  }

  /**
   * Clear cached token from localStorage
   */
  private clearCachedToken(): void {
    try {
      localStorage.removeItem(this.TOKEN_STORAGE_KEY);
      localStorage.removeItem(this.TOKEN_TIMESTAMP_KEY);
    } catch (error) {
      console.error("[FCM] Failed to clear cached token:", error);
    }
  }

  /**
   * Check if currently rate limited
   */
  private isRateLimited(): boolean {
    return Date.now() < this.rateLimitedUntil;
  }

  /**
   * Set rate limit cooldown
   */
  private setRateLimited(): void {
    this.rateLimitedUntil = Date.now() + this.RATE_LIMIT_COOLDOWN;
    console.warn(
      `[FCM] Rate limited. Retry after ${this.RATE_LIMIT_COOLDOWN / 1000} seconds`,
    );
  }

  /**
   * Initialize FCM messaging and request permission
   * Uses Vite PWA service worker registration
   * @returns FCM token if successful, null otherwise
   */
  async initialize(): Promise<string | null> {
    // Check if rate limited
    if (this.isRateLimited()) {
      const remainingTime = Math.ceil(
        (this.rateLimitedUntil - Date.now()) / 1000,
      );
      console.warn(`[FCM] Rate limited. Try again in ${remainingTime} seconds`);
      return null;
    }

    // Return cached token if valid and initialized
    if (this.isInitialized && this.currentToken) {
      console.log("[FCM] Already initialized, returning cached token");
      return this.currentToken;
    }

    // Return pending initialization if in progress
    if (this.initializationPromise) {
      console.log("[FCM] Initialization in progress, waiting...");
      return this.initializationPromise;
    }

    // Start new initialization
    this.initializationPromise = this.performInitialization();

    try {
      const token = await this.initializationPromise;
      return token;
    } finally {
      // Clear the promise once done
      this.initializationPromise = null;
    }
  }

  /**
   * Perform actual FCM initialization
   */
  private async performInitialization(): Promise<string | null> {
    try {
      // Check if notifications are supported
      if (!("Notification" in window)) {
        console.warn("[FCM] Notifications not supported in this browser");
        return null;
      }

      // Wait for service worker from Vite PWA
      if (!navigator.serviceWorker) {
        console.error("[FCM] Service Worker not supported");
        return null;
      }

      // Wait for service worker to be ready
      const registration = await navigator.serviceWorker.ready;
      console.log("[FCM] Service Worker ready:", registration.scope);

      // Initialize Firebase Messaging with Vite PWA service worker
      this.messaging = getMessaging(getFirebaseApp());

      // Request notification permission
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        console.info("[FCM] Notification permission denied");
        return null;
      }

      // Get FCM token using Vite PWA service worker
      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
        console.error("[FCM] VAPID key not configured");
        return null;
      }

      const token = await getToken(this.messaging, {
        vapidKey,
        serviceWorkerRegistration: registration,
      });

      if (token) {
        this.currentToken = token;
        this.isInitialized = true;
        this.saveCachedToken(token); // Cache the token
        console.log("[FCM] Token obtained successfully");

        // Setup foreground message listener
        this.setupForegroundListener();

        return token;
      } else {
        console.warn("[FCM] No registration token available");
        return null;
      }
    } catch (error: any) {
      // Handle rate limiting
      if (
        error?.code === "messaging/too-many-requests" ||
        error?.message?.includes("429") ||
        error?.message?.includes("Too Many Requests") ||
        error?.message?.includes("push service error")
      ) {
        console.error(
          "[FCM] Rate limit exceeded or push service error. Please wait before trying again.",
        );
        this.setRateLimited(); // Set cooldown period

        // Clear any stale cached token that might be causing issues
        this.clearCachedToken();

        // Return cached token if we had one and it's still valid
        if (this.currentToken) {
          console.log("[FCM] Using existing token during rate limit");
          return this.currentToken;
        }
      } else {
        console.error("[FCM] Initialization failed:", error);
      }
      return null;
    }
  }

  /**
   * Setup listener for foreground messages
   */
  private setupForegroundListener(): void {
    if (!this.messaging) {
      return;
    }

    onMessage(this.messaging, (payload) => {
      console.log("[FCM] Received foreground message:", payload);

      // Display notification if notification payload exists
      if (payload.notification) {
        this.displayNotification(
          payload.notification.title || "SRV Notification",
          payload.notification.body || "",
          payload.notification.icon || "/logo.svg",
          payload.data || {},
        );
      }
    });
  }

  /**
   * Display a notification in the browser
   */
  private displayNotification(
    title: string,
    body: string,
    icon: string,
    data: Record<string, any>,
  ): void {
    try {
      const notification = new Notification(title, {
        body,
        icon,
        badge: "/logo.svg",
        data,
        tag: data.notificationId || `notification-${Date.now()}`,
      });

      // Handle notification click
      notification.onclick = () => {
        window.focus();
        if (data.href) {
          window.location.href = data.href;
        }
        notification.close();
      };
    } catch (error) {
      console.error("[FCM] Failed to display notification:", error);
    }
  }

  /**
   * Register FCM token with backend
   */
  async registerToken(token: string): Promise<boolean> {
    try {
      await notificationCanisterService.storePushSubscription({
        endpoint: token, // FCM uses token as endpoint
        p256dh: "", // Not used in FCM
        auth: "", // Not used in FCM
      });
      console.log("[FCM] Token registered with backend");
      return true;
    } catch (error) {
      console.error("[FCM] Failed to register token with backend:", error);
      return false;
    }
  }

  /**
   * Unregister FCM token from backend
   */
  async unregisterToken(): Promise<boolean> {
    try {
      await notificationCanisterService.removePushSubscription();
      console.log("[FCM] Token unregistered from backend");
      return true;
    } catch (error) {
      console.error("[FCM] Failed to unregister token from backend:", error);
      return false;
    }
  }

  /**
   * Delete FCM token completely
   */
  async deleteToken(): Promise<boolean> {
    if (!this.messaging || !this.currentToken) {
      return false;
    }

    try {
      await deleteToken(this.messaging);
      this.currentToken = null;
      this.isInitialized = false;
      this.clearCachedToken(); // Clear from localStorage
      console.log("[FCM] Token deleted");
      return true;
    } catch (error) {
      console.error("[FCM] Failed to delete token:", error);
      return false;
    }
  }

  /**
   * Get current FCM token
   */
  getToken(): string | null {
    return this.currentToken;
  }

  /**
   * Check if FCM is initialized
   */
  isReady(): boolean {
    return this.isInitialized && this.currentToken !== null;
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!("Notification" in window)) {
      return "denied";
    }
    return await Notification.requestPermission();
  }

  /**
   * Check current notification permission status
   */
  getPermissionStatus(): NotificationPermission {
    if (!("Notification" in window)) {
      return "denied";
    }
    return Notification.permission;
  }

  /**
   * Get time remaining on rate limit (in seconds)
   * Returns 0 if not rate limited
   */
  getRateLimitRemaining(): number {
    if (!this.isRateLimited()) {
      return 0;
    }
    return Math.ceil((this.rateLimitedUntil - Date.now()) / 1000);
  }

  /**
   * Clear rate limit manually (use with caution)
   * Useful for testing or after waiting the cooldown period
   */
  clearRateLimit(): void {
    this.rateLimitedUntil = 0;
    console.log("[FCM] Rate limit cleared");
  }
}

export default FCMService.getInstance();
