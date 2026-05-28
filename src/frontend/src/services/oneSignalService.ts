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

import OneSignal from "react-onesignal";
import { getFirebaseFunctions } from "./firebaseApp";

interface PlayerIdMetadata {
  playerId: string;
  timestamp: number;
  isSubscribed: boolean;
}

class OneSignalService {
  private static instance: OneSignalService;
  private isInitialized = false;
  private currentPlayerId: string | null = null;
  private readyResolve: (() => void) | null = null;
  private readyPromise: Promise<void>;

  // Storage keys
  private readonly PLAYER_ID_STORAGE_KEY = "onesignal_player_metadata";

  private constructor() {
    this.readyPromise = new Promise((resolve) => {
      this.readyResolve = resolve;
    });
  }

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
    } catch (error) {}
  }

  /**
   * Clear player ID metadata from localStorage
   */
  private clearPlayerIdMetadata(): void {
    try {
      localStorage.removeItem(this.PLAYER_ID_STORAGE_KEY);
    } catch (error) {}
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
    if (typeof OneSignal === "undefined") {
      return;
    }

    this.isInitialized = true;
    this.readyResolve?.();

    // Setup event listeners
    this.setupEventListeners();

    // Check if user is already subscribed (non-blocking)
    // Note: optedIn is a property getter, not a Promise
    try {
      const isSubscribed = OneSignal.User.PushSubscription.optedIn;
      if (isSubscribed) {
        // Get player ID (OneSignal User ID)
        try {
          const playerId = OneSignal.User.onesignalId;
          if (playerId) {
            this.currentPlayerId = playerId;
            this.savePlayerIdMetadata(playerId, true);
            this.registerPlayerId(playerId);
          }
        } catch (idError) {}
      }
    } catch (error) {}
  }

  /**
   * Setup OneSignal event listeners
   */
  private setupEventListeners(): void {
    // Listen for subscription changes
    OneSignal.User.PushSubscription.addEventListener("change", (event: any) => {
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
    });

    // Listen for notification clicks
    OneSignal.Notifications.addEventListener("click", (event: any) => {
      // Handle notification click
      const url = event.notification?.url || event.notification?.data?.url;
      if (url) {
        window.location.href = url;
      }
    });

    // Listen for foreground notifications
    OneSignal.Notifications.addEventListener("foregroundWillDisplay", () => {});
  }

  /**
   * Request notification permission and subscribe user
   * @returns Promise that resolves to player ID if successful, null otherwise
   */
  async subscribe(): Promise<string | null> {
    // Wait for OneSignal to finish initializing
    const ready = await this.waitForReady();
    if (!ready) {
      return null;
    }

    try {
      // Check current permission (property access, not Promise)
      // Note: OneSignal returns boolean (true/false) not string ("granted"/"denied"/"default")
      const permissionGranted = OneSignal.Notifications.permission;

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
            await OneSignal.Notifications.requestPermission();
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
      const alreadySubscribed = OneSignal.User.PushSubscription.optedIn;
      if (alreadySubscribed) {
        const existingPlayerId = OneSignal.User.onesignalId;
        if (existingPlayerId) {
          this.currentPlayerId = existingPlayerId;
          this.savePlayerIdMetadata(existingPlayerId, true);
          this.registerPlayerId(existingPlayerId);
          return existingPlayerId;
        }
      }

      await OneSignal.User.PushSubscription.optIn();

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
        OneSignal.User.PushSubscription.optedIn;

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
      await OneSignal.User.PushSubscription.optOut();
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
      if (!OneSignal.User) {
        return null;
      }

      // Check if PushSubscription exists
      if (!OneSignal.User.PushSubscription) {
        return null;
      }

      // Try multiple possible locations for the player ID
      let playerId: string | null = OneSignal.User.onesignalId ?? null;

      if (!playerId) {
        // Fallback: try push subscription ID
        playerId = OneSignal.User.PushSubscription.id ?? null;
      }

      if (!playerId) {
        // Fallback: try push token
        playerId = OneSignal.User.PushSubscription.token ?? null;
      }

      return playerId;
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
      const optedIn = OneSignal.User.PushSubscription.optedIn;
      return optedIn ?? false;
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
      const permissionGranted = OneSignal.Notifications.permission;
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
      await OneSignal.login(externalId);
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
      await OneSignal.logout();
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
      await OneSignal.User.addTags(tags);
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
      await OneSignal.User.removeTags(tagKeys);
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
      const { httpsCallable } = await import("firebase/functions");
      const functions = getFirebaseFunctions();
      const notificationActionFn = httpsCallable(
        functions,
        "notificationAction",
      );
      const result = await notificationActionFn({
        action: "storeOneSignalPlayerId",
        data: { playerId },
      });
      const data = result.data as { success: boolean };
      return data.success;
    } catch (error) {
      console.error("Failed to register OneSignal player ID:", error);
      return false;
    }
  }

  private async unregisterPlayerId(): Promise<boolean> {
    try {
      const playerId = this.currentPlayerId;

      if (!playerId) {
        return true;
      }

      const { httpsCallable } = await import("firebase/functions");
      const functions = getFirebaseFunctions();
      const notificationActionFn = httpsCallable(
        functions,
        "notificationAction",
      );
      const result = await notificationActionFn({
        action: "removeOneSignalPlayerId",
        data: { playerId },
      });
      const data = result.data as { success: boolean };
      return data.success;
    } catch (error) {
      console.error("Failed to unregister OneSignal player ID:", error);
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

  async waitForReady(timeoutMs = 15000): Promise<boolean> {
    if (this.isInitialized) return true;
    try {
      await Promise.race([
        this.readyPromise,
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("OneSignal init timeout")),
            timeoutMs,
          ),
        ),
      ]);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current cached player ID
   */
  getCachedPlayerId(): string | null {
    return this.currentPlayerId;
  }
}

export default OneSignalService.getInstance();
