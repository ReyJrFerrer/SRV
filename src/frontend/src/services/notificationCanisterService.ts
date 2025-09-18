// Notification Canister Service
import { Principal } from "@dfinity/principal";
import { canisterId, createActor } from "../../../declarations/notification";
import type {
  _SERVICE as NotificationService,
  NotificationType as CanisterNotificationType,
  NotificationStatus as CanisterNotificationStatus,
  UserType as CanisterUserType,
  Notification as CanisterNotification,
  NotificationFilter as CanisterNotificationFilter,

} from "../../../declarations/notification/notification.did";
import { Identity } from "@dfinity/agent";

// Frontend-compatible interfaces
export interface FrontendNotification {
  id: string;
  message: string;
  type: string;
  timestamp: string;
  read: boolean;
  href: string;
  providerName?: string;
  clientName?: string;
  bookingId?: string;
  title: string;
  userType: "client" | "provider";
  metadata?: any;
}

export interface NotificationStats {
  total: number;
  unread: number;
  pushSent: number;
  read: number;
}

export interface NotificationFilter {
  userType?: "client" | "provider";
  notificationType?: string;
  status?: "unread" | "read" | "push_sent" | "push_sent_and_read";
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

export interface PushSubscriptionData {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}

/**
 * Creates a notification actor with the provided identity
 * @param identity The user's identity from AuthContext
 * @returns An authenticated NotificationService actor
 */
const createNotificationActor = (identity?: Identity | null): NotificationService => {
  return createActor(canisterId, {
    agentOptions: {
      identity: identity || undefined,
      host:
        process.env.DFX_NETWORK !== "ic" &&
        process.env.DFX_NETWORK !== "playground"
          ? "http://localhost:4943"
          : "https://ic0.app",
    },
  }) as NotificationService;
};

// Singleton actor instance with identity tracking
let notificationActor: NotificationService | null = null;
let currentIdentity: Identity | null = null;

/**
 * Updates the notification actor with a new identity
 * This should be called when the user's authentication state changes
 */
export const updateNotificationActor = (identity: Identity | null) => {
  if (currentIdentity !== identity) {
    notificationActor = createNotificationActor(identity);
    currentIdentity = identity;
  }
};

/**
 * Gets the current notification actor
 * Throws error if no authenticated identity is available for auth-required operations
 */
const getNotificationActor = (requireAuth: boolean = false): NotificationService => {
  if (requireAuth && !currentIdentity) {
    throw new Error(
      "Authentication required: Please log in to perform this action",
    );
  }

  if (!notificationActor) {
    notificationActor = createNotificationActor(currentIdentity);
  }

  return notificationActor;
};

/**
 * Convert frontend notification filter to canister format
 */
const convertToCanisterFilter = (filter?: NotificationFilter): [CanisterNotificationFilter] | [] => {
  if (!filter) return [];

  const canisterFilter: CanisterNotificationFilter = {
    userType: filter.userType ? [{ [filter.userType]: null } as CanisterUserType] : [],
    notificationType: filter.notificationType ? [{ [filter.notificationType]: null } as CanisterNotificationType] : [],
    status: filter.status ? [{ [filter.status]: null } as CanisterNotificationStatus] : [],
    fromDate: filter.fromDate ? [BigInt(filter.fromDate.getTime() * 1000000)] : [],
    toDate: filter.toDate ? [BigInt(filter.toDate.getTime() * 1000000)] : [],
    limit: filter.limit ? [BigInt(filter.limit)] : [],
    offset: filter.offset ? [BigInt(filter.offset)] : [],
  };

  return [canisterFilter];
};

/**
 * Convert canister notification to frontend format
 */
const convertToFrontendNotification = (canisterNotif: CanisterNotification): FrontendNotification => {
  // Convert notification type to string
  const notificationType = Object.keys(canisterNotif.notificationType)[0];
  
  // Determine if read
  const isRead = 'read' in canisterNotif.status || 'push_sent_and_read' in canisterNotif.status;
  
  // Parse metadata if available
  let metadata: any = {};
  if (canisterNotif.metadata && canisterNotif.metadata.length > 0 && canisterNotif.metadata[0]) {
    try {
      metadata = JSON.parse(canisterNotif.metadata[0]);
    } catch (e) {
      console.warn("Failed to parse notification metadata:", e);
    }
  }

  // Determine user type
  const userType = 'client' in canisterNotif.userType ? 'client' : 'provider';

  // Generate href based on notification type and user type
  let href = '/';
  const bookingId = canisterNotif.relatedEntityId && canisterNotif.relatedEntityId.length > 0 
    ? canisterNotif.relatedEntityId[0] : undefined;

  if (bookingId) {
    if (userType === 'provider') {
      href = `/provider/booking/${bookingId}`;
    } else {
      href = `/client/booking/${bookingId}`;
    }
  }

  // Override href for specific types
  switch (notificationType) {
    case 'review_reminder':
    case 'review_request':
      if (bookingId) {
        href = userType === 'provider' ? `/provider/booking/${bookingId}` : `/client/review/${bookingId}`;
      }
      break;
    case 'payment_completed':
      if (bookingId) {
        href = `/provider/receipt/${bookingId}`;
      }
      break;
    case 'service_completion_reminder':
      if (bookingId) {
        href = `/provider/active-service/${bookingId}`;
      }
      break;
  }

  return {
    id: canisterNotif.id,
    message: canisterNotif.message,
    type: notificationType,
    title: canisterNotif.title,
    timestamp: new Date(Number(canisterNotif.createdAt) / 1000000).toISOString(),
    read: isRead,
    href: href,
    userType: userType as "client" | "provider",
    providerName: metadata.providerName,
    clientName: metadata.clientName,
    bookingId: bookingId,
    metadata: metadata,
  };
};

// Notification Canister Service Functions
export const notificationCanisterService = {
  /**
   * Get notifications for current user
   */
  async getUserNotifications(userId?: string, filter?: NotificationFilter): Promise<FrontendNotification[]> {
    try {
      const actor = getNotificationActor();
      const userPrincipal = userId ? Principal.fromText(userId) : (currentIdentity?.getPrincipal() || Principal.anonymous());
      const canisterFilter = convertToCanisterFilter(filter);
      
      const notifications = await actor.getUserNotifications(userPrincipal, canisterFilter);
      return notifications.map(convertToFrontendNotification);
    } catch (error) {
      console.error("Error fetching user notifications:", error);
      throw new Error(`Failed to fetch notifications: ${error}`);
    }
  },

  /**
   * Mark notification as read (requires authentication)
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const actor = getNotificationActor(true);
      const result = await actor.markAsRead(notificationId);
      
      if ('err' in result) {
        throw new Error(result.err);
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
      throw new Error(`Failed to mark notification as read: ${error}`);
    }
  },

  /**
   * Mark notification as push sent (requires authentication)
   */
  async markAsPushSent(notificationId: string): Promise<void> {
    try {
      const actor = getNotificationActor(true);
      const result = await actor.markAsPushSent(notificationId);
      
      if ('err' in result) {
        throw new Error(result.err);
      }
    } catch (error) {
      console.error("Error marking notification as push sent:", error);
      throw new Error(`Failed to mark notification as push sent: ${error}`);
    }
  },

  /**
   * Get notifications eligible for push (requires authentication)
   */
  async getNotificationsForPush(userId?: string): Promise<FrontendNotification[]> {
    try {
      const actor = getNotificationActor();
      const userPrincipal = userId ? Principal.fromText(userId) : (currentIdentity?.getPrincipal() || Principal.anonymous());
      
      const notifications = await actor.getNotificationsForPush(userPrincipal);
      return notifications.map(convertToFrontendNotification);
    } catch (error) {
      console.error("Error fetching notifications for push:", error);
      throw new Error(`Failed to fetch notifications for push: ${error}`);
    }
  },

  /**
   * Store push subscription (requires authentication)
   */
  async storePushSubscription(subscriptionData: PushSubscriptionData): Promise<void> {
    try {
      const actor = getNotificationActor(true);
      const result = await actor.storePushSubscription(
        subscriptionData.endpoint,
        subscriptionData.p256dh,
        subscriptionData.auth,
        subscriptionData.userAgent ? [subscriptionData.userAgent] : []
      );
      
      if ('err' in result) {
        throw new Error(result.err);
      }
    } catch (error) {
      console.error("Error storing push subscription:", error);
      throw new Error(`Failed to store push subscription: ${error}`);
    }
  },

  /**
   * Remove push subscription (requires authentication)
   */
  async removePushSubscription(): Promise<void> {
    try {
      const actor = getNotificationActor(true);
      const result = await actor.removePushSubscription();
      
      if ('err' in result) {
        throw new Error(result.err);
      }
    } catch (error) {
      console.error("Error removing push subscription:", error);
      throw new Error(`Failed to remove push subscription: ${error}`);
    }
  },

  /**
   * Get current push subscription (requires authentication)
   */
  async getPushSubscription(): Promise<PushSubscriptionData | null> {
    try {
      const actor = getNotificationActor(true);
      const result = await actor.getPushSubscription();
      
      if (result && result.length > 0) {
        const subscription = result[0];
        if (subscription) {
          return {
            endpoint: subscription.endpoint,
            p256dh: subscription.p256dh,
            auth: subscription.auth,
            userAgent: subscription.userAgent && subscription.userAgent.length > 0 ? subscription.userAgent[0] : undefined,
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error("Error getting push subscription:", error);
      throw new Error(`Failed to get push subscription: ${error}`);
    }
  },

  /**
   * Get notification statistics (requires authentication)
   */
  async getNotificationStats(userId?: string): Promise<NotificationStats> {
    try {
      const actor = getNotificationActor();
      const userPrincipal = userId ? Principal.fromText(userId) : (currentIdentity?.getPrincipal() || Principal.anonymous());
      
      const result = await actor.getNotificationStats(userPrincipal);
      return {
        total: Number(result.total),
        unread: Number(result.unread),
        pushSent: Number(result.pushSent),
        read: Number(result.read),
      };
    } catch (error) {
      console.error("Error getting notification stats:", error);
      throw new Error(`Failed to get notification stats: ${error}`);
    }
  },

  /**
   * Mark all notifications as read (requires authentication)
   */
  async markAllAsRead(): Promise<number> {
    try {
      const actor = getNotificationActor(true);
      const result = await actor.markAllAsRead();
      
      if ('err' in result) {
        throw new Error(result.err);
      }
      
      return Number(result.ok);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      throw new Error(`Failed to mark all notifications as read: ${error}`);
    }
  },

  /**
   * Check if user can receive notifications (rate limiting check)
   */
  async canReceiveNotification(userId: string, notificationType: string): Promise<boolean> {
    try {
      const actor = getNotificationActor();
      const userPrincipal = Principal.fromText(userId);
      const canisterNotifType = { [notificationType]: null } as CanisterNotificationType;
      
      return await actor.canReceiveNotification(userPrincipal, canisterNotifType);
    } catch (error) {
      console.error("Error checking notification rate limit:", error);
      return false;
    }
  },

  /**
   * Create a notification (requires authentication - typically called by other services)
   */
  async createNotification(
    targetUserId: string,
    userType: "client" | "provider",
    notificationType: string,
    title: string,
    message: string,
    relatedEntityId?: string,
    metadata?: any
  ): Promise<string> {
    try {
      const actor = getNotificationActor(true);
      const userPrincipal = Principal.fromText(targetUserId);
      const canisterUserType = { [userType]: null } as CanisterUserType;
      const canisterNotifType = { [notificationType]: null } as CanisterNotificationType;
      const metadataString = metadata ? JSON.stringify(metadata) : null;
      
      const result = await actor.createNotification(
        userPrincipal,
        canisterUserType,
        canisterNotifType,
        title,
        message,
        relatedEntityId ? [relatedEntityId] : [],
        metadataString ? [metadataString] : []
      );
      
      if ('err' in result) {
        throw new Error(result.err);
      }
      
      return result.ok;
    } catch (error) {
      console.error("Error creating notification:", error);
      throw new Error(`Failed to create notification: ${error}`);
    }
  },
};

export default notificationCanisterService;