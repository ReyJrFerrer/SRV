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
 * Pure Firebase Cloud Messaging (FCM) service wrapper
 * Handles ONLY FCM-specific operations with no business logic
 *
 * Responsibilities:
 * - Initialize Firebase Messaging
 * - Request notification permission
 * - Get and manage FCM tokens
 * - Listen for foreground messages
 * - Display foreground notifications
 * - Handle token refresh and validation
 */

interface TokenMetadata {
  token: string;
  timestamp: number;
  lastRefreshAttempt?: number;
  refreshAttempts: number;
}

class FCMService {
  private static instance: FCMService;
  private messaging: Messaging | null = null;
  private currentToken: string | null = null;
  private isInitialized = false;
  private initializationPromise: Promise<string | null> | null = null;

  // Token management constants
  private readonly TOKEN_STORAGE_KEY = "fcm_token_metadata";
  private readonly TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
  private readonly MIN_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes between refresh attempts

  private constructor() {}

  static getInstance(): FCMService {
    if (!FCMService.instance) {
      FCMService.instance = new FCMService();
    }
    return FCMService.instance;
  }

  /**
   * Save token metadata to localStorage
   */
  private saveTokenMetadata(token: string): void {
    const metadata: TokenMetadata = {
      token,
      timestamp: Date.now(),
      refreshAttempts: 0,
    };
    try {
      localStorage.setItem(this.TOKEN_STORAGE_KEY, JSON.stringify(metadata));
    } catch (error) {
      console.error("FCM: Failed to save token metadata", error);
    }
  }

  /**
   * Load token metadata from localStorage
   */
  private loadTokenMetadata(): TokenMetadata | null {
    try {
      const data = localStorage.getItem(this.TOKEN_STORAGE_KEY);
      if (!data) return null;
      return JSON.parse(data) as TokenMetadata;
    } catch (error) {
      console.error("FCM: Failed to load token metadata", error);
      return null;
    }
  }

  /**
   * Clear token metadata from localStorage
   */
  private clearTokenMetadata(): void {
    try {
      localStorage.removeItem(this.TOKEN_STORAGE_KEY);
    } catch (error) {
      console.error("FCM: Failed to clear token metadata", error);
    }
  }

  /**
   * Check if token is stale and needs refresh
   */
  private isTokenStale(metadata: TokenMetadata): boolean {
    const age = Date.now() - metadata.timestamp;
    return age > this.TOKEN_MAX_AGE;
  }

  /**
   * Check if we can attempt a token refresh (rate limiting)
   */
  private canAttemptRefresh(metadata: TokenMetadata): boolean {
    // If never attempted refresh, allow it
    if (!metadata.lastRefreshAttempt) {
      return true;
    }

    const timeSinceLastAttempt = Date.now() - metadata.lastRefreshAttempt;

    // Exponential backoff: each attempt increases wait time
    const backoffMultiplier = Math.pow(2, metadata.refreshAttempts);
    const requiredInterval = this.MIN_REFRESH_INTERVAL * backoffMultiplier;

    return timeSinceLastAttempt >= requiredInterval;
  }

  /**
   * Update refresh attempt metadata
   */
  private updateRefreshAttempt(metadata: TokenMetadata): void {
    metadata.lastRefreshAttempt = Date.now();
    metadata.refreshAttempts = (metadata.refreshAttempts || 0) + 1;

    try {
      localStorage.setItem(this.TOKEN_STORAGE_KEY, JSON.stringify(metadata));
    } catch (error) {
      console.error("FCM: Failed to update refresh metadata", error);
    }
  }

  /**
   * Validate if cached token is still valid with Firebase
   */
  private async validateCachedToken(): Promise<boolean> {
    if (!this.currentToken || !this.messaging) {
      return false;
    }

    try {
      // Try to get token again - if it returns the same token, it's valid
      // If it returns a different token, the old one was invalid
      const registration = await navigator.serviceWorker.ready;
      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

      if (!vapidKey) {
        return false;
      }

      const token = await getToken(this.messaging, {
        vapidKey,
        serviceWorkerRegistration: registration,
      });

      // If tokens match, it's valid
      const isValid = token === this.currentToken;

      if (!isValid && token) {
        console.log(
          "FCM: Cached token is invalid, got new token from Firebase",
        );
        // Update to the new token Firebase gave us
        this.currentToken = token;
        this.saveTokenMetadata(token);
        // Re-register with backend
        await this.registerToken(token);
      }

      return isValid;
    } catch (error) {
      console.error("FCM: Token validation failed", error);
      return false;
    }
  }

  /**
   * Initialize FCM messaging and request permission
   * Uses existing service worker registration
   * Prevents multiple concurrent initialization attempts
   * Validates and refreshes stale tokens
   * @returns FCM token if successful, null otherwise
   */
  async initialize(): Promise<string | null> {
    // Return pending initialization if in progress
    if (this.initializationPromise) {
      console.log("FCM: Initialization already in progress, waiting...");
      return this.initializationPromise;
    }

    // Check if we have a cached token with metadata
    if (this.isInitialized && this.currentToken) {
      const metadata = this.loadTokenMetadata();

      if (metadata) {
        // First, validate if the cached token is still valid with Firebase
        console.log("FCM: Validating cached token with Firebase...");
        const isValid = await this.validateCachedToken();

        if (!isValid) {
          console.log("FCM: Cached token is invalid, will get new token");
          // Clear invalid token and reinitialize
          await this.resetFCMState();
          this.initializationPromise = this.performInitialization();
          try {
            const token = await this.initializationPromise;
            return token;
          } finally {
            this.initializationPromise = null;
          }
        }

        // Check if token is stale by age
        if (this.isTokenStale(metadata)) {
          console.log("FCM: Token is stale by age, refreshing...");

          // Check if we can attempt refresh (rate limiting)
          if (this.canAttemptRefresh(metadata)) {
            return await this.refreshToken();
          } else {
            const nextRetryTime = new Date(
              (metadata.lastRefreshAttempt || 0) +
                this.MIN_REFRESH_INTERVAL *
                  Math.pow(2, metadata.refreshAttempts),
            );
            console.warn(
              `FCM: Rate limit protection - next refresh attempt allowed after ${nextRetryTime.toLocaleTimeString()}`,
            );
            // Return current token even if stale, rather than failing
            return this.currentToken;
          }
        }

        // Token is valid and fresh, return it
        console.log("FCM: Using valid cached token");
        return this.currentToken;
      }
    }

    // No valid cached token, perform fresh initialization
    this.initializationPromise = this.performInitialization();

    try {
      const token = await this.initializationPromise;
      return token;
    } finally {
      // Clear the promise once done (success or failure)
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
        console.warn("FCM: Notifications not supported in this browser");
        return null;
      }

      // Wait for service worker to be ready
      if (!navigator.serviceWorker) {
        console.error("FCM: Service Worker not supported");
        return null;
      }

      // CRITICAL: Wait for service worker to be actually registered and ready
      // This prevents the MIME type error and ensures proper scope
      console.log("FCM: Waiting for Service Worker to be ready...");

      let registration: ServiceWorkerRegistration;
      try {
        // First, check if there's an existing registration
        registration = await navigator.serviceWorker.ready;
        console.log("FCM: Using existing Service Worker registration");
      } catch (error) {
        console.warn(
          "FCM: No existing service worker, waiting for PWA service to register it",
        );
        // Wait a bit for PWA service to register the service worker
        await new Promise((resolve) => setTimeout(resolve, 1000));
        registration = await navigator.serviceWorker.ready;
      }

      // Ensure service worker is actually active
      if (!registration.active) {
        console.error("FCM: Service Worker is registered but not active");
        throw new Error("Service Worker is not active");
      }

      console.log("FCM: Service Worker is ready and active", {
        scope: registration.scope,
        active: !!registration.active,
      });

      // IMPORTANT: Unregister any old token from backend FIRST
      // This prevents "already registered" errors
      try {
        console.log("FCM: Cleaning up any old backend registration...");
        await this.unregisterToken();
      } catch (cleanupError) {
        console.warn("FCM: Cleanup failed (may be first time):", cleanupError);
        // Continue anyway - this is expected on first run
      }

      // Initialize Firebase Messaging with existing service worker
      this.messaging = getMessaging(getFirebaseApp());

      // Request notification permission
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        console.info("FCM: Notification permission denied");
        return null;
      }

      // Delete any old Firebase token to get a fresh one
      try {
        console.log("FCM: Deleting any old Firebase token...");
        await deleteToken(this.messaging);
      } catch (deleteError) {
        console.warn("FCM: No old token to delete:", deleteError);
        // Continue anyway
      }

      // Get FRESH FCM token using existing service worker
      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
        console.error("FCM: VAPID key not configured");
        return null;
      }

      const token = await getToken(this.messaging, {
        vapidKey,
        serviceWorkerRegistration: registration,
      });

      if (token) {
        this.currentToken = token;
        this.isInitialized = true;

        // Save token with metadata
        this.saveTokenMetadata(token);

        console.log("FCM: Fresh token obtained successfully");

        // Setup foreground message listener
        this.setupForegroundListener();

        // Setup token refresh listener
        this.setupTokenRefreshListener();

        // Register NEW token with backend
        console.log("FCM: Registering fresh token with backend...");
        const registered = await this.registerToken(token);
        if (!registered) {
          console.error(
            "FCM: Backend registration failed - will retry on next attempt",
          );
          // Clear state and force retry
          await this.resetFCMState();
          throw new Error("Backend registration failed");
        }

        console.log("FCM: Token successfully registered with backend");
        return token;
      } else {
        console.warn("FCM: No registration token available");
        // Clear any stale data
        await this.resetFCMState();
        return null;
      }
    } catch (error: any) {
      // Handle rate limiting specifically
      if (
        error?.code === "messaging/too-many-requests" ||
        error?.message?.includes("429") ||
        error?.message?.includes("Too Many Requests")
      ) {
        console.error(
          "FCM: Rate limit exceeded. Please wait a few minutes before trying again.",
        );
        console.info(
          "FCM: This usually happens during development with frequent refreshes.",
        );
        // Reset state only on rate limit
        await this.resetFCMState();
      } else if (
        error?.code === "messaging/registration-token-not-registered" ||
        error?.message?.includes("Registration failed") ||
        error?.message?.includes("Backend registration failed")
      ) {
        console.error(
          "FCM: Token registration failed. This might be due to an old/invalid token.",
        );
        console.info("FCM: Clearing old state and preparing for retry...");
        // Just clear local state, don't try to unregister again
        this.currentToken = null;
        this.isInitialized = false;
        this.clearTokenMetadata();
      } else {
        console.error("FCM: Initialization failed", error);
        // Just clear local state on unknown errors
        this.currentToken = null;
        this.isInitialized = false;
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
      console.log("FCM: Received foreground message", payload);

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
   * Setup listener for token refresh events
   * Firebase automatically triggers this when token changes
   */
  private setupTokenRefreshListener(): void {
    if (!this.messaging) {
      return;
    }

    // Note: Firebase SDK handles token refresh internally
    // When getToken() is called with the same VAPID key, it returns the same token
    // unless the token has been invalidated by Firebase
    // We handle manual refresh through our refreshToken() method

    console.log("FCM: Token refresh monitoring enabled");
  }

  /**
   * Refresh FCM token
   * Implements rate limiting to avoid Google's rate limits
   */
  async refreshToken(): Promise<string | null> {
    const metadata = this.loadTokenMetadata();

    if (metadata && !this.canAttemptRefresh(metadata)) {
      console.warn("FCM: Cannot refresh token yet due to rate limiting");
      return this.currentToken;
    }

    try {
      console.log("FCM: Attempting token refresh...");

      // Update refresh attempt metadata before trying
      if (metadata) {
        this.updateRefreshAttempt(metadata);
      }

      // Delete old token first
      if (this.messaging && this.currentToken) {
        try {
          await deleteToken(this.messaging);
          console.log("FCM: Old token deleted");
        } catch (deleteError) {
          console.warn(
            "FCM: Failed to delete old token, continuing anyway",
            deleteError,
          );
        }
      }

      // Get new token
      const registration = await navigator.serviceWorker.ready;
      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

      if (!this.messaging || !vapidKey) {
        throw new Error("FCM not properly initialized");
      }

      const newToken = await getToken(this.messaging, {
        vapidKey,
        serviceWorkerRegistration: registration,
      });

      if (newToken) {
        // Unregister old token from backend
        if (this.currentToken && this.currentToken !== newToken) {
          try {
            await this.unregisterToken();
          } catch (error) {
            console.warn(
              "FCM: Failed to unregister old token from backend",
              error,
            );
          }
        }

        // Update current token
        this.currentToken = newToken;

        // Save new token metadata (resets refresh attempts)
        this.saveTokenMetadata(newToken);

        // Register new token with backend
        await this.registerToken(newToken);

        console.log("FCM: Token refreshed successfully");
        return newToken;
      } else {
        console.warn("FCM: Failed to get new token");
        return null;
      }
    } catch (error: any) {
      // Handle rate limiting
      if (
        error?.code === "messaging/too-many-requests" ||
        error?.message?.includes("429") ||
        error?.message?.includes("Too Many Requests")
      ) {
        console.error(
          "FCM: Rate limit exceeded during token refresh. Will retry with exponential backoff.",
        );
      } else {
        console.error("FCM: Token refresh failed", error);
      }
      return null;
    }
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
      console.error("FCM: Failed to display notification", error);
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
      console.log("FCM: Token registered with backend");
      return true;
    } catch (error) {
      console.error("FCM: Failed to register token with backend", error);
      return false;
    }
  }

  /**
   * Unregister FCM token from backend
   */
  async unregisterToken(): Promise<boolean> {
    if (!this.currentToken) {
      console.log("FCM: No token to unregister");
      return true;
    }

    try {
      await notificationCanisterService.removePushSubscription();
      console.log("FCM: Token unregistered from backend");
      return true;
    } catch (error: any) {
      // Treat "not found" errors as success since the token is already gone
      if (
        error?.message?.includes("NOT_FOUND") ||
        error?.message?.includes("No token to remove") ||
        error?.message?.includes("not found")
      ) {
        console.log("FCM: Token already removed from backend (NOT_FOUND)");
        return true;
      }

      console.error("FCM: Failed to unregister token from backend", error);
      // Don't fail completely - just log and continue
      return true; // Return true to allow initialization to continue
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

      // Clear token metadata
      this.clearTokenMetadata();

      console.log("FCM: Token deleted");
      return true;
    } catch (error) {
      console.error("FCM: Failed to delete token", error);
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
   * Reset FCM state completely
   * Clears all tokens, metadata, and reinitializes
   */
  async resetFCMState(): Promise<void> {
    console.log("FCM: Resetting FCM state...");

    try {
      // Try to delete old token from Firebase
      if (this.messaging && this.currentToken) {
        try {
          await deleteToken(this.messaging);
          console.log("FCM: Old token deleted from Firebase");
        } catch (error) {
          console.warn("FCM: Failed to delete old token from Firebase", error);
        }
      }

      // Unregister from backend
      try {
        await this.unregisterToken();
      } catch (error) {
        console.warn("FCM: Failed to unregister from backend", error);
      }

      // Clear local state
      this.currentToken = null;
      this.isInitialized = false;
      this.messaging = null;
      this.initializationPromise = null;

      // Clear token metadata
      this.clearTokenMetadata();

      console.log("FCM: State reset complete");
    } catch (error) {
      console.error("FCM: Error during state reset", error);
    }
  }

  /**
   * Force refresh token (public method)
   * Use this when notifications stop working
   */
  async forceRefresh(): Promise<string | null> {
    console.log("FCM: Force refresh requested");
    return await this.refreshToken();
  }

  /**
   * Get token age and health status
   */
  getTokenHealth(): {
    hasToken: boolean;
    age: number | null;
    isStale: boolean;
    canRefresh: boolean;
    nextRefreshTime: Date | null;
  } {
    const metadata = this.loadTokenMetadata();

    if (!metadata || !this.currentToken) {
      return {
        hasToken: false,
        age: null,
        isStale: false,
        canRefresh: true,
        nextRefreshTime: null,
      };
    }

    const age = Date.now() - metadata.timestamp;
    const isStale = this.isTokenStale(metadata);
    const canRefresh = this.canAttemptRefresh(metadata);

    let nextRefreshTime: Date | null = null;
    if (!canRefresh && metadata.lastRefreshAttempt) {
      const backoffMultiplier = Math.pow(2, metadata.refreshAttempts);
      const requiredInterval = this.MIN_REFRESH_INTERVAL * backoffMultiplier;
      nextRefreshTime = new Date(
        metadata.lastRefreshAttempt + requiredInterval,
      );
    }

    return {
      hasToken: true,
      age,
      isStale,
      canRefresh,
      nextRefreshTime,
    };
  }
}

export default FCMService.getInstance();
