/**
 * OneSignal Push Notification Service
 * Handles push notification subscriptions and management using OneSignal
 *
 * Responsibilities:
 * - Initialize OneSignal SDK
 * - Request notification permission
 * - Manage user subscriptions
 * - Handle notification events
 * - Sync player IDs with backend
 */

interface OneSignalConfig {
  appId: string;
  safariWebId: string;
  allowLocalhostAsSecureOrigin?: boolean;
}

interface PlayerIdMetadata {
  playerId: string;
  timestamp: number;
  isSubscribed: boolean;
}

class OneSignalService {
  private static instance: OneSignalService;
  private isInitialized = false;
  private initializationPromise: Promise<boolean> | null = null;
  private currentPlayerId: string | null = null;

  // Storage keys
  private readonly PLAYER_ID_STORAGE_KEY = "onesignal_player_metadata";

  private constructor() {}

  static getInstance(): OneSignalService {
    if (!OneSignalService.instance) {
      OneSignalService.instance = new OneSignalService();
    }
    return OneSignalService.instance;
  }

  /**
   * Save player ID metadata to localStorage
   */
  private savePlayerIdMetadata(playerId: string, isSubscribed: boolean): void {
    const metadata: PlayerIdMetadata = {
      playerId,
      timestamp: Date.now(),
      isSubscribed,
    };
    try {
      localStorage.setItem(
        this.PLAYER_ID_STORAGE_KEY,
        JSON.stringify(metadata),
      );
    } catch (error) {
      console.error("OneSignal: Failed to save player ID metadata", error);
    }
  }

  /**
   * Clear player ID metadata from localStorage
   */
  private clearPlayerIdMetadata(): void {
    try {
      localStorage.removeItem(this.PLAYER_ID_STORAGE_KEY);
    } catch (error) {
      console.error("OneSignal: Failed to clear player ID metadata", error);
    }
  }

  /**
   * Initialize OneSignal
   * Should be called once when the app loads
   * @param config OneSignal configuration
   * @returns Promise that resolves to true if successful
   */
  async initialize(config: OneSignalConfig): Promise<boolean> {
    // Return pending initialization if in progress
    if (this.initializationPromise) {
      console.log("OneSignal: Initialization already in progress, waiting...");
      return this.initializationPromise;
    }

    // Already initialized
    if (this.isInitialized) {
      console.log("OneSignal: Already initialized");
      return true;
    }

    this.initializationPromise = this.performInitialization(config);

    try {
      const result = await this.initializationPromise;
      return result;
    } finally {
      this.initializationPromise = null;
    }
  }

  /**
   * Perform actual OneSignal initialization
   */
  private async performInitialization(
    config: OneSignalConfig,
  ): Promise<boolean> {
    try {
      // Check if OneSignal SDK is loaded
      if (typeof window.OneSignal === "undefined") {
        console.error(
          "OneSignal: SDK not loaded. Make sure to include the OneSignal script.",
        );
        return false;
      }

      console.log("OneSignal: Initializing...");

      // Initialize OneSignal
      await window.OneSignal.init({
        appId: config.appId,
        safari_web_id: config.safariWebId,
        allowLocalhostAsSecureOrigin: config.allowLocalhostAsSecureOrigin,
        notifyButton: {
          enable: false, // We'll handle subscription UI ourselves
        },
      });

      this.isInitialized = true;
      console.log("OneSignal: Initialized successfully");

      // Setup event listeners
      this.setupEventListeners();

      // Check if user is already subscribed (but don't fetch player ID yet - wait for user gesture)
      const isSubscribed = await window.OneSignal.User.PushSubscription.optedIn;
      if (isSubscribed) {
        console.log(
          "OneSignal: User previously subscribed, will restore on next action",
        );
      }

      return true;
    } catch (error) {
      console.error("OneSignal: Initialization failed", error);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Setup OneSignal event listeners
   */
  private setupEventListeners(): void {
    // Listen for subscription changes
    window.OneSignal.User.PushSubscription.addEventListener(
      "change",
      (event: any) => {
        console.log("OneSignal: Subscription changed", event);

        if (event.current.optedIn) {
          const playerId = event.current.id;
          this.currentPlayerId = playerId;
          this.savePlayerIdMetadata(playerId, true);
          this.registerPlayerId(playerId);
        } else {
          this.currentPlayerId = null;
          this.clearPlayerIdMetadata();
          this.unregisterPlayerId();
        }
      },
    );

    // Listen for notification clicks
    window.OneSignal.Notifications.addEventListener("click", (event: any) => {
      console.log("OneSignal: Notification clicked", event);

      // Handle notification click
      const url = event.notification?.url || event.notification?.data?.url;
      if (url) {
        window.location.href = url;
      }
    });

    // Listen for foreground notifications
    window.OneSignal.Notifications.addEventListener(
      "foregroundWillDisplay",
      (event: any) => {
        console.log("OneSignal: Foreground notification received", event);
        // You can prevent the notification from showing by calling event.preventDefault()
        // Or modify the notification before it displays
      },
    );
  }

  /**
   * Request notification permission and subscribe user
   * @returns Promise that resolves to player ID if successful, null otherwise
   */
  async subscribe(): Promise<string | null> {
    if (!this.isInitialized) {
      console.error("OneSignal: Not initialized. Call initialize() first.");
      return null;
    }

    try {
      // Check current permission
      const permission = await window.OneSignal.Notifications.permission;

      if (permission === "denied") {
        console.error(
          "OneSignal: Permission denied. User needs to enable in browser settings.",
        );
        return null;
      }

      // Request permission if not granted
      if (permission !== "granted") {
        console.log("OneSignal: Requesting notification permission...");
        const permissionGranted =
          await window.OneSignal.Notifications.requestPermission();
        if (!permissionGranted) {
          console.log("OneSignal: User denied permission");
          return null;
        }
        console.log("OneSignal: Permission granted");
      }

      // Opt in to push notifications
      console.log("OneSignal: Opting in to push notifications...");
      await window.OneSignal.User.PushSubscription.optIn();

      console.log("OneSignal: Waiting for subscription to be ready...");
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Get player ID with retry logic for mobile browsers
      let playerId: string | null = null;
      let attempts = 0;
      const maxAttempts = 5;

      while (attempts < maxAttempts && !playerId) {
        attempts++;
        console.log(
          `OneSignal: Attempting to get player ID (attempt ${attempts}/${maxAttempts})...`,
        );

        playerId = await this.getPlayerId();

        if (!playerId && attempts < maxAttempts) {
          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      if (playerId) {
        console.log("OneSignal: Player ID retrieved successfully:", playerId);
        this.currentPlayerId = playerId;
        this.savePlayerIdMetadata(playerId, true);
        await this.registerPlayerId(playerId);
        return playerId;
      } else {
        console.error(
          "OneSignal: Failed to get player ID after",
          maxAttempts,
          "attempts",
        );
        // Even if we don't have player ID yet, subscription might still work
        // The event listener will catch it when it becomes available
        return null;
      }
    } catch (error) {
      console.error("OneSignal: Subscription failed", error);
      return null;
    }
  }

  /**
   * Unsubscribe user from push notifications
   */
  async unsubscribe(): Promise<boolean> {
    if (!this.isInitialized) {
      console.error("OneSignal: Not initialized");
      return false;
    }

    try {
      await window.OneSignal.User.PushSubscription.optOut();
      await this.unregisterPlayerId();
      this.currentPlayerId = null;
      this.clearPlayerIdMetadata();
      return true;
    } catch (error) {
      console.error("OneSignal: Unsubscribe failed", error);
      return false;
    }
  }

  /**
   * Get current player ID
   */
  async getPlayerId(): Promise<string | null> {
    if (!this.isInitialized) {
      return null;
    }

    try {
      const playerId = await window.OneSignal.User.PushSubscription.id;
      return playerId || null;
    } catch (error) {
      console.error("OneSignal: Failed to get player ID", error);
      return null;
    }
  }

  /**
   * Check if user is subscribed
   */
  async isSubscribed(): Promise<boolean> {
    if (!this.isInitialized) {
      return false;
    }

    try {
      const optedIn = await window.OneSignal.User.PushSubscription.optedIn;
      return optedIn;
    } catch (error) {
      console.error("OneSignal: Failed to check subscription status", error);
      return false;
    }
  }

  /**
   * Get notification permission status
   */
  async getPermissionStatus(): Promise<NotificationPermission> {
    if (!this.isInitialized) {
      return "default";
    }

    try {
      const permission = await window.OneSignal.Notifications.permission;
      return permission;
    } catch (error) {
      console.error("OneSignal: Failed to get permission status", error);
      return "default";
    }
  }

  /**
   * Set external user ID (for linking with your backend user)
   * @param externalId Your backend user ID
   */
  async setExternalUserId(externalId: string): Promise<boolean> {
    if (!this.isInitialized) {
      console.error("OneSignal: Not initialized");
      return false;
    }

    try {
      await window.OneSignal.login(externalId);
      console.log("OneSignal: External user ID set:", externalId);
      return true;
    } catch (error) {
      console.error("OneSignal: Failed to set external user ID", error);
      return false;
    }
  }

  /**
   * Remove external user ID
   */
  async removeExternalUserId(): Promise<boolean> {
    if (!this.isInitialized) {
      return false;
    }

    try {
      await window.OneSignal.logout();
      console.log("OneSignal: External user ID removed");
      return true;
    } catch (error) {
      console.error("OneSignal: Failed to remove external user ID", error);
      return false;
    }
  }

  /**
   * Add tags to user (for targeting)
   * @param tags Key-value pairs of tags
   */
  async setTags(tags: Record<string, string>): Promise<boolean> {
    if (!this.isInitialized) {
      return false;
    }

    try {
      await window.OneSignal.User.addTags(tags);
      console.log("OneSignal: Tags added", tags);
      return true;
    } catch (error) {
      console.error("OneSignal: Failed to add tags", error);
      return false;
    }
  }

  /**
   * Remove tags from user
   * @param tagKeys Array of tag keys to remove
   */
  async removeTags(tagKeys: string[]): Promise<boolean> {
    if (!this.isInitialized) {
      return false;
    }

    try {
      await window.OneSignal.User.removeTags(tagKeys);
      console.log("OneSignal: Tags removed", tagKeys);
      return true;
    } catch (error) {
      console.error("OneSignal: Failed to remove tags", error);
      return false;
    }
  }

  /**
   * Register player ID with backend
   */
  private async registerPlayerId(playerId: string): Promise<boolean> {
    if (!playerId) {
      console.error("OneSignal: Cannot register undefined/null player ID");
      return false;
    }

    try {
      // Import Firebase functions
      const { getFunctions, httpsCallable } = await import(
        "firebase/functions"
      );
      const functions = getFunctions();
      const storePlayerId = httpsCallable(functions, "storeOneSignalPlayerId");

      console.log("OneSignal: Registering player ID with backend:", playerId);

      const result = await storePlayerId({ playerId });
      const data = result.data as { success: boolean };

      console.log("OneSignal: Player ID registered successfully");
      return data.success;
    } catch (error) {
      console.error(
        "OneSignal: Failed to register player ID with backend",
        error,
      );
      return false;
    }
  }

  /**
   * Unregister player ID from backend
   */
  private async unregisterPlayerId(): Promise<boolean> {
    try {
      const playerId = this.currentPlayerId;

      if (!playerId) {
        console.warn("OneSignal: No player ID to unregister");
        return true; // Not an error, just nothing to do
      }

      // Import Firebase functions
      const { getFunctions, httpsCallable } = await import(
        "firebase/functions"
      );
      const functions = getFunctions();
      const removePlayerId = httpsCallable(
        functions,
        "removeOneSignalPlayerId",
      );

      console.log("OneSignal: Unregistering player ID from backend");

      // httpsCallable automatically wraps parameters in { data: ... }
      const result = await removePlayerId({ playerId });
      const data = result.data as { success: boolean };

      console.log("OneSignal: Player ID unregistered successfully");
      return data.success;
    } catch (error) {
      console.error(
        "OneSignal: Failed to unregister player ID from backend",
        error,
      );
      return false;
    }
  }

  /**
   * Get service status and diagnostics
   */
  async getDiagnostics(): Promise<{
    isInitialized: boolean;
    isSubscribed: boolean;
    playerId: string | null;
    permission: NotificationPermission;
    browserSupport: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    const browserSupport =
      "Notification" in window && "serviceWorker" in navigator;

    if (!browserSupport) {
      errors.push("Browser does not support notifications or service workers");
    }

    let permission: NotificationPermission = "default";
    let isSubscribed = false;
    let playerId: string | null = null;

    if (this.isInitialized) {
      try {
        permission = await this.getPermissionStatus();
        isSubscribed = await this.isSubscribed();
        playerId = await this.getPlayerId();
      } catch (error) {
        errors.push("Failed to get OneSignal status");
      }
    } else {
      errors.push("OneSignal not initialized");
    }

    return {
      isInitialized: this.isInitialized,
      isSubscribed,
      playerId,
      permission,
      browserSupport,
      errors,
    };
  }

  /**
   * Print diagnostics to console
   */
  async printDiagnostics(): Promise<void> {
    const diagnostics = await this.getDiagnostics();

    console.group("🔔 OneSignal Diagnostics");
    console.log("Initialized:", diagnostics.isInitialized ? "✅" : "❌");
    console.log("Subscribed:", diagnostics.isSubscribed ? "✅" : "❌");
    console.log("Player ID:", diagnostics.playerId || "N/A");
    console.log("Permission:", diagnostics.permission);
    console.log("Browser Support:", diagnostics.browserSupport ? "✅" : "❌");

    if (diagnostics.errors.length > 0) {
      console.error("Errors:", diagnostics.errors);
    } else {
      console.log("No errors");
    }

    console.groupEnd();
  }

  /**
   * Check if OneSignal is ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get current cached player ID
   */
  getCachedPlayerId(): string | null {
    return this.currentPlayerId;
  }
}

// Type definitions for OneSignal
declare global {
  interface Window {
    OneSignal: any;
    OneSignalDeferred: Array<(oneSignal: any) => void>;
  }
}

export default OneSignalService.getInstance();
