import { getMessaging, getToken, onMessage, deleteToken, type Messaging } from "firebase/messaging";
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
 */
class FCMService {
  private static instance: FCMService;
  private messaging: Messaging | null = null;
  private currentToken: string | null = null;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): FCMService {
    if (!FCMService.instance) {
      FCMService.instance = new FCMService();
    }
    return FCMService.instance;
  }

  /**
   * Initialize FCM messaging and request permission
   * @returns FCM token if successful, null otherwise
   */
  async initialize(): Promise<string | null> {
    if (this.isInitialized) {
      return this.currentToken;
    }

    try {
      // Check if notifications are supported
      if (!("Notification" in window)) {
        console.warn("FCM: Notifications not supported in this browser");
        return null;
      }

      // Initialize Firebase Messaging
      this.messaging = getMessaging(getFirebaseApp());

      // Request notification permission
      const permission = await Notification.requestPermission();
      
      if (permission !== "granted") {
        console.info("FCM: Notification permission denied");
        return null;
      }

      // Get FCM token
      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
        console.error("FCM: VAPID key not configured");
        return null;
      }

      const token = await getToken(this.messaging, { vapidKey });
      
      if (token) {
        this.currentToken = token;
        this.isInitialized = true;
        console.log("FCM: Token obtained successfully");
        
        // Setup foreground message listener
        this.setupForegroundListener();
        
        return token;
      } else {
        console.warn("FCM: No registration token available");
        return null;
      }
    } catch (error) {
      console.error("FCM: Initialization failed", error);
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
          payload.data || {}
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
    data: Record<string, any>
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
    try {
      await notificationCanisterService.removePushSubscription();
      console.log("FCM: Token unregistered from backend");
      return true;
    } catch (error) {
      console.error("FCM: Failed to unregister token from backend", error);
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
}

export default FCMService.getInstance();
