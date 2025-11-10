/**
 * OneSignal Push Notification Service
 * Handles push notification subscriptions and management using OneSignal
 *
 * Responsibilities:
 * - Setup OneSignal event listeners after SDK initialization
 * - Request notification permission
 * - Manage user subscriptions
 * - Handle notification events
 * - Sync player IDs with backend
 */

interface PlayerIdMetadata {
  playerId: string;
  timestamp: number;
  isSubscribed: boolean;
}

class OneSignalService {
  private static instance: OneSignalService;
  private isInitialized = false;
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
    }
  }

  /**
   * Clear player ID metadata from localStorage
   */
  private clearPlayerIdMetadata(): void {
    try {
      localStorage.removeItem(this.PLAYER_ID_STORAGE_KEY);
    } catch (error) {
    }
  }

  /**
   * Setup event listeners and sync state after OneSignal is initialized
   * This should be called after OneSignal.init() is complete
   */
  setupAfterInit(): void {
    if (this.isInitialized) {
      return;
    }

    // Check if OneSignal SDK is loaded
    if (typeof window.OneSignal === "undefined") {
      return;
    }

    this.isInitialized = true;

    // Setup event listeners
    this.setupEventListeners();

    // Check if user is already subscribed (non-blocking)
    // Note: optedIn is a property getter, not a Promise
    try {
      const isSubscribed = window.OneSignal.User.PushSubscription.optedIn;
      if (isSubscribed) {

        // Get player ID (OneSignal User ID)
        try {
          const playerId = window.OneSignal.User.onesignalId;
          if (playerId) {
            this.currentPlayerId = playerId;
            this.savePlayerIdMetadata(playerId, true);
          }
        } catch (idError) {
        }
      }
    } catch (error) {
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
      // Handle notification click
      const url = event.notification?.url || event.notification?.data?.url;
      if (url) {
        window.location.href = url;
      }
    });

    // Listen for foreground notifications
    window.OneSignal.Notifications.addEventListener(
      "foregroundWillDisplay",
      () => {
      },
    );
  }

  /**
   * Request notification permission and subscribe user
   * @returns Promise that resolves to player ID if successful, null otherwise
   */
  async subscribe(): Promise<string | null> {
    if (!this.isInitialized) {
      return null;
    }

    try {
      // Check current permission (property access, not Promise)
      // Note: OneSignal returns boolean (true/false) not string ("granted"/"denied"/"default")
      const permissionGranted = window.OneSignal.Notifications.permission;

      // Check native browser permission for more accurate status
      const nativePermission =
        typeof Notification !== "undefined"
          ? Notification.permission
          : "default";

      if (nativePermission === "denied") {
        throw new Error(
          "Notifications are blocked. Please enable them in your browser settings.",
        );
      }

      if (!permissionGranted) {
        try {
          const newPermissionGranted =
            await window.OneSignal.Notifications.requestPermission();
          if (!newPermissionGranted) {

            // Check if user actually denied or if there was another issue
            const updatedNativePermission = Notification.permission;
            if (updatedNativePermission === "denied") {
              throw new Error(
                "Notification permission was denied. Please enable notifications in your browser settings.",
              );
            } else if (updatedNativePermission === "default") {
              throw new Error(
                "Notification permission was not granted. Please try again and allow notifications when prompted.",
              );
            }
          } 
        } catch (error) {
          throw error;
        }
      }

      // Check if already subscribed before opting in (property access, not Promise)
      const alreadySubscribed = window.OneSignal.User.PushSubscription.optedIn;
      if (alreadySubscribed) {
        const existingPlayerId = window.OneSignal.User.onesignalId;
        if (existingPlayerId) {
          this.currentPlayerId = existingPlayerId;
          this.savePlayerIdMetadata(existingPlayerId, true);
          return existingPlayerId;
        }
      }

      await window.OneSignal.User.PushSubscription.optIn();

      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Get player ID with retry logic
      let playerId: string | null = null;
      let attempts = 0;
      const maxAttempts = 5;

      while (attempts < maxAttempts && !playerId) {
        attempts++;
        playerId = await this.getPlayerId();

        if (!playerId && attempts < maxAttempts) {
          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      if (playerId) {
        this.currentPlayerId = playerId;
        this.savePlayerIdMetadata(playerId, true);
        await this.registerPlayerId(playerId);
        return playerId;
      } else {

  
        window.OneSignal.User.PushSubscription.optedIn;

        // Always fail if player ID wasn't found - don't wait for event listener
        throw new Error(
          "Your browser may not be compatible with push notifications at this time.",
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to subscribe to push notifications");
    }
  }

  /**
   * Unsubscribe user from push notifications
   */
  async unsubscribe(): Promise<boolean> {
    if (!this.isInitialized) {
      return false;
    }

    try {
      await window.OneSignal.User.PushSubscription.optOut();
      await this.unregisterPlayerId();
      this.currentPlayerId = null;
      this.clearPlayerIdMetadata();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current player ID (OneSignal User ID)
   * Note: In OneSignal v16, the user ID is at OneSignal.User.onesignalId
   */
  async getPlayerId(): Promise<string | null> {
    if (!this.isInitialized) {
      return null;
    }

    try {
      // Check if User object exists
      if (!window.OneSignal.User) {
        return null;
      }

      // Check if PushSubscription exists
      if (!window.OneSignal.User.PushSubscription) {
        return null;
      }

      // Try multiple possible locations for the player ID
      let playerId = window.OneSignal.User.onesignalId;

      if (!playerId) {
        // Fallback: try push subscription ID
        playerId = window.OneSignal.User.PushSubscription.id;
      }

      if (!playerId) {
        // Fallback: try push token
        playerId = window.OneSignal.User.PushSubscription.token;
      }

      return playerId || null;
    } catch (error) {
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
      // Property access, not Promise
      const optedIn = window.OneSignal.User.PushSubscription.optedIn;
      return optedIn;
    } catch (error) {
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
      // OneSignal returns boolean, but we need to return standard NotificationPermission
      // Use native Notification API for accurate status
      if (typeof Notification !== "undefined") {
        return Notification.permission;
      }

      // Fallback: check OneSignal's boolean permission
      const permissionGranted = window.OneSignal.Notifications.permission;
      return permissionGranted ? "granted" : "default";
    } catch (error) {
      return "default";
    }
  }

  /**
   * Set external user ID (for linking with your backend user)
   * @param externalId Your backend user ID
   */
  async setExternalUserId(externalId: string): Promise<boolean> {
    if (!this.isInitialized) {
      return false;
    }

    try {
      await window.OneSignal.login(externalId);
      return true;
    } catch (error) {
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
      return true;
    } catch (error) {
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
      return true;
    } catch (error) {
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
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Register player ID with backend
   */
  private async registerPlayerId(playerId: string): Promise<boolean> {
    if (!playerId) {
      return false;
    }

    try {
      // Import Firebase functions
      const { getFunctions, httpsCallable } = await import(
        "firebase/functions"
      );
      const functions = getFunctions();
      const storePlayerId = httpsCallable(functions, "storeOneSignalPlayerId");
      const result = await storePlayerId({ playerId });
      const data = result.data as { success: boolean };
      return data.success;
    } catch (error) {
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
        return true; 
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
      const result = await removePlayerId({ playerId });
      const data = result.data as { success: boolean };
      return data.success;
    } catch (error) {
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
    await this.getDiagnostics();
  

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
