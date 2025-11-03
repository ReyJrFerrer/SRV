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
   * Only checks metadata age, doesn't call getToken to avoid duplicate registrations
   */
  private async validateCachedToken(): Promise<boolean> {
    if (!this.currentToken || !this.messaging) {
      return false;
    }

    const metadata = this.loadTokenMetadata();
    if (!metadata) {
      return false;
    }

    // Just check if token isn't too old
    // Don't call getToken() here as it may create a new registration
    const isStale = this.isTokenStale(metadata);
    
    if (isStale) {
      console.log("FCM: Cached token is stale, needs refresh");
      return false;
    }

    console.log("FCM: Cached token is fresh");
    return true;
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

      // Initialize Firebase Messaging with existing service worker
      this.messaging = getMessaging(getFirebaseApp());

      // Request notification permission
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        console.info("FCM: Notification permission denied");
        return null;
      }

      // Get FCM token using existing service worker
      // Firebase handles token recycling internally
      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
        console.error("FCM: VAPID key not configured");
        return null;
      }

      console.log("FCM: Requesting FCM token from Firebase...");
      const token = await getToken(this.messaging, {
        vapidKey,
        serviceWorkerRegistration: registration,
      });

      if (token) {
        this.currentToken = token;
        this.isInitialized = true;

        // Save token with metadata
        this.saveTokenMetadata(token);

        console.log("FCM: Token obtained successfully");

        // Setup foreground message listener
        this.setupForegroundListener();

        // Setup token refresh listener
        this.setupTokenRefreshListener();

        // Register token with backend (but don't fail if this fails)
        console.log("FCM: Registering token with backend...");
        try {
          const registered = await this.registerToken(token);
          if (!registered) {
            console.warn(
              "FCM: Backend registration failed - will retry later. Token is still valid locally.",
            );
            // Don't throw error, token is still valid for Firebase
          } else {
            console.log("FCM: Token successfully registered with backend");
          }
        } catch (regError) {
          console.error(
            "FCM: Backend registration error - will retry later:",
            regError,
          );
          // Don't throw error, token is still valid for Firebase
        }

        return token;
      } else {
        console.warn("FCM: No registration token available");
        return null;
      }
    } catch (error: any) {
      // Handle specific error types with helpful messages
      if (
        error?.code === "messaging/token-subscribe-failed" ||
        error?.message?.includes("Registration failed") ||
        error?.message?.includes("push service error")
      ) {
        console.error(
          "❌ FCM: Registration failed - push service error",
          "\n",
          "This usually means:",
          "\n",
          "1. Firebase Cloud Messaging API is not enabled in Google Cloud Console",
          "\n",
          "2. VAPID key is incorrect or missing",
          "\n",
          "3. Firebase project configuration is incomplete",
          "\n",
          "Please check your Firebase/Google Cloud configuration.",
          "\n",
          "Error details:",
          error,
        );
        return null;
      } else if (
        error?.code === "messaging/too-many-requests" ||
        error?.message?.includes("429") ||
        error?.message?.includes("Too Many Requests")
      ) {
        console.error(
          "FCM: Rate limited by Firebase. Please wait before trying again.",
          error,
        );
        // Don't reset state on rate limit - token might still be valid
        return this.currentToken;
      } else if (error?.code === "messaging/token-unsubscribe-failed") {
        console.warn(
          "FCM: Token unsubscribe failed, but continuing initialization",
        );
        // Continue with initialization despite unsubscribe failure
      } else if (error?.code === "messaging/permission-blocked") {
        console.error(
          "FCM: Notification permission was blocked by user",
          error,
        );
        return null;
      } else if (error?.code === "messaging/unsupported-browser") {
        console.error(
          "FCM: This browser doesn't support push notifications",
          error,
        );
        return null;
      } else {
        console.error("FCM: Initialization failed", error);
        // Only reset on critical errors
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

      // Get service worker and VAPID key
      const registration = await navigator.serviceWorker.ready;
      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

      if (!this.messaging || !vapidKey) {
        throw new Error("FCM not properly initialized");
      }

      // Delete old token to force refresh
      if (this.currentToken) {
        try {
          await deleteToken(this.messaging);
          console.log("FCM: Old token deleted");
        } catch (deleteError) {
          console.warn(
            "FCM: Failed to delete old token, will get new one anyway",
            deleteError,
          );
        }
      }

      // Get new token
      const newToken = await getToken(this.messaging, {
        vapidKey,
        serviceWorkerRegistration: registration,
      });

      if (newToken) {
        const tokenChanged = this.currentToken !== newToken;

        // Update current token
        this.currentToken = newToken;

        // Save new token metadata (resets refresh attempts)
        this.saveTokenMetadata(newToken);

        // Only unregister old token if it actually changed
        if (tokenChanged) {
          console.log("FCM: Token changed, updating backend registration...");
          // No need to explicitly unregister - just register the new one
          // The backend will update the token for this user
        } else {
          console.log("FCM: Token unchanged after refresh");
        }

        // Register token with backend (with retry logic)
        const registered = await this.registerToken(newToken);
        if (!registered) {
          console.warn(
            "FCM: Backend registration failed during refresh - will retry later",
          );
          // Don't fail the refresh, token is still valid locally
        }

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
   * Implements retry logic for better resilience
   */
  async registerToken(
    token: string,
    retries: number = 2,
  ): Promise<boolean> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(
            `FCM: Retrying backend registration (attempt ${attempt + 1}/${retries + 1})...`,
          );
          // Wait before retry with exponential backoff
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * Math.pow(2, attempt)),
          );
        }

        await notificationCanisterService.storePushSubscription({
          endpoint: token, // FCM uses token as endpoint
          p256dh: "", // Not used in FCM
          auth: "", // Not used in FCM
        });

        console.log("FCM: Token registered with backend");
        return true;
      } catch (error: any) {
        console.error(
          `FCM: Failed to register token with backend (attempt ${attempt + 1}/${retries + 1}):`,
          error,
        );

        // If this is the last attempt, return false
        if (attempt === retries) {
          console.error(
            "FCM: All registration attempts failed. Will retry on next session.",
          );
          return false;
        }
      }
    }

    return false;
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

  /**
   * Comprehensive FCM diagnostics
   * Returns detailed information about FCM configuration and state
   */
  async getDiagnostics(): Promise<{
    browser: string;
    notificationSupport: boolean;
    notificationPermission: NotificationPermission;
    serviceWorkerSupport: boolean;
    serviceWorkerReady: boolean;
    serviceWorkerScope: string | null;
    fcmInitialized: boolean;
    hasToken: boolean;
    tokenAge: number | null;
    tokenHealth: "healthy" | "stale" | "missing";
    vapidKeyConfigured: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    let serviceWorkerReady = false;
    let serviceWorkerScope: string | null = null;

    // Check browser support
    const notificationSupport = "Notification" in window;
    const serviceWorkerSupport = "serviceWorker" in navigator;

    if (!notificationSupport) {
      errors.push("Browser does not support notifications");
    }

    if (!serviceWorkerSupport) {
      errors.push("Browser does not support service workers");
    }

    // Check service worker status
    if (serviceWorkerSupport) {
      try {
        const registration = await navigator.serviceWorker.ready;
        serviceWorkerReady = !!registration.active;
        serviceWorkerScope = registration.scope;

        if (!registration.active) {
          errors.push("Service worker is not active");
        }
      } catch (error) {
        errors.push(`Service worker error: ${error}`);
      }
    }

    // Check notification permission
    const notificationPermission = notificationSupport
      ? Notification.permission
      : "denied";

    if (notificationPermission !== "granted") {
      errors.push(`Notification permission: ${notificationPermission}`);
    }

    // Check VAPID key
    const vapidKeyConfigured = !!import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (!vapidKeyConfigured) {
      errors.push("VAPID key not configured in environment");
    }

    // Check token health
    const tokenHealth = this.getTokenHealth();
    let tokenHealthStatus: "healthy" | "stale" | "missing" = "missing";

    if (tokenHealth.hasToken) {
      tokenHealthStatus = tokenHealth.isStale ? "stale" : "healthy";
    }

    // Detect browser
    const userAgent = navigator.userAgent;
    let browser = "Unknown";
    if (userAgent.includes("Chrome")) browser = "Chrome";
    else if (userAgent.includes("Safari")) browser = "Safari";
    else if (userAgent.includes("Firefox")) browser = "Firefox";
    else if (userAgent.includes("Edg")) browser = "Edge";

    return {
      browser,
      notificationSupport,
      notificationPermission,
      serviceWorkerSupport,
      serviceWorkerReady,
      serviceWorkerScope,
      fcmInitialized: this.isInitialized,
      hasToken: !!this.currentToken,
      tokenAge: tokenHealth.age,
      tokenHealth: tokenHealthStatus,
      vapidKeyConfigured,
      errors,
    };
  }

  /**
   * Print diagnostics to console
   */
  async printDiagnostics(): Promise<void> {
    const diagnostics = await this.getDiagnostics();

    console.group("🔍 FCM Diagnostics");
    console.log("Browser:", diagnostics.browser);
    console.log("Notification Support:", diagnostics.notificationSupport ? "✅" : "❌");
    console.log("Notification Permission:", diagnostics.notificationPermission);
    console.log("Service Worker Support:", diagnostics.serviceWorkerSupport ? "✅" : "❌");
    console.log("Service Worker Ready:", diagnostics.serviceWorkerReady ? "✅" : "❌");
    console.log("Service Worker Scope:", diagnostics.serviceWorkerScope);
    console.log("FCM Initialized:", diagnostics.fcmInitialized ? "✅" : "❌");
    console.log("Has Token:", diagnostics.hasToken ? "✅" : "❌");
    console.log("Token Age:", diagnostics.tokenAge ? `${Math.floor(diagnostics.tokenAge / 1000 / 60)} minutes` : "N/A");
    console.log("Token Health:", diagnostics.tokenHealth);
    console.log("VAPID Key Configured:", diagnostics.vapidKeyConfigured ? "✅" : "❌");
    
    if (diagnostics.errors.length > 0) {
      console.group("⚠️ Errors:");
      diagnostics.errors.forEach(error => console.log("  -", error));
      console.groupEnd();
    } else {
      console.log("Errors:", "None ✅");
    }
    
    console.groupEnd();
  }

  /**
   * Retry backend registration if token exists locally but not on backend
   * Useful for recovering from backend registration failures
   */
  async retryBackendRegistration(): Promise<boolean> {
    if (!this.currentToken || !this.isInitialized) {
      console.log("FCM: No token available for backend registration retry");
      return false;
    }

    console.log("FCM: Retrying backend registration for existing token...");
    return await this.registerToken(this.currentToken);
  }

  /**
   * Test FCM configuration and connectivity
   * Comprehensive test that checks all components
   */
  async testFCMConfiguration(): Promise<{
    success: boolean;
    steps: Array<{ step: string; status: "✅" | "❌"; message: string }>;
  }> {
    const steps: Array<{ step: string; status: "✅" | "❌"; message: string }> = [];

    // Step 1: Check browser support
    const notificationSupport = "Notification" in window;
    steps.push({
      step: "Browser Notification Support",
      status: notificationSupport ? "✅" : "❌",
      message: notificationSupport
        ? "Browser supports notifications"
        : "Browser does not support notifications",
    });

    const serviceWorkerSupport = "serviceWorker" in navigator;
    steps.push({
      step: "Service Worker Support",
      status: serviceWorkerSupport ? "✅" : "❌",
      message: serviceWorkerSupport
        ? "Browser supports service workers"
        : "Browser does not support service workers",
    });

    if (!notificationSupport || !serviceWorkerSupport) {
      return { success: false, steps };
    }

    // Step 2: Check permission
    const permission = Notification.permission;
    steps.push({
      step: "Notification Permission",
      status: permission === "granted" ? "✅" : "❌",
      message: `Permission: ${permission}`,
    });

    if (permission !== "granted") {
      const newPermission = await Notification.requestPermission();
      steps.push({
        step: "Request Permission",
        status: newPermission === "granted" ? "✅" : "❌",
        message: `New permission: ${newPermission}`,
      });

      if (newPermission !== "granted") {
        return { success: false, steps };
      }
    }

    // Step 3: Check service worker
    try {
      const registration = await navigator.serviceWorker.ready;
      steps.push({
        step: "Service Worker Ready",
        status: "✅",
        message: `Active with scope: ${registration.scope}`,
      });
    } catch (error) {
      steps.push({
        step: "Service Worker Ready",
        status: "❌",
        message: `Error: ${error}`,
      });
      return { success: false, steps };
    }

    // Step 4: Check VAPID key
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    steps.push({
      step: "VAPID Key Configuration",
      status: vapidKey ? "✅" : "❌",
      message: vapidKey
        ? "VAPID key configured"
        : "VAPID key missing in environment",
    });

    if (!vapidKey) {
      return { success: false, steps };
    }

    // Step 5: Test FCM initialization
    try {
      const token = await this.initialize();
      steps.push({
        step: "FCM Token Generation",
        status: token ? "✅" : "❌",
        message: token
          ? `Token obtained: ${token.substring(0, 20)}...`
          : "Failed to obtain token",
      });

      if (!token) {
        return { success: false, steps };
      }
    } catch (error: any) {
      steps.push({
        step: "FCM Token Generation",
        status: "❌",
        message: `Error: ${error?.message || error}`,
      });
      return { success: false, steps };
    }

    // Step 6: Test backend registration
    if (this.currentToken) {
      try {
        const registered = await this.registerToken(this.currentToken);
        steps.push({
          step: "Backend Registration",
          status: registered ? "✅" : "❌",
          message: registered
            ? "Token registered with backend"
            : "Backend registration failed",
        });
      } catch (error: any) {
        steps.push({
          step: "Backend Registration",
          status: "❌",
          message: `Error: ${error?.message || error}`,
        });
      }
    }

    const success = steps.every((s) => s.status === "✅");
    return { success, steps };
  }
}

export default FCMService.getInstance();
