const functions = require("firebase-functions");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const {FieldValue} = require("firebase-admin/firestore");

const db = admin.firestore();

// OneSignal Configuration
const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID || "6ca84c57-1e6b-466d-b792-64df97dea60b";
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY || "";

// Base URL for building absolute push URLs (used only for push payloads)
const APP_BASE_URL = process.env.APP_BASE_URL || "https://srvpinoy.com";

/**
 * Helper function to safely get user authentication info
 * @param {object} context - Firebase Functions context
 * @param {object} data - Request data
 * @return {object} User authentication info
 */
function getAuthInfo(context, data) {
  const auth = context.auth || data.auth;
  return {
    uid: auth?.uid || null,
    isAdmin: auth?.token?.isAdmin || false,
    hasAuth: !!auth,
  };
}

// Constants for spam prevention
const SPAM_PREVENTION_WINDOW = 5 * 60 * 1000; // 5 minutes in milliseconds
const MAX_NOTIFICATIONS_PER_WINDOW = 10;
const NOTIFICATION_EXPIRY_DAYS = 30;

// Notification types (matching Motoko enum)
const NOTIFICATION_TYPES = {
  BOOKING_ACCEPTED: "booking_accepted",
  BOOKING_DECLINED: "booking_declined",
  REVIEW_REMINDER: "review_reminder",
  GENERIC: "generic",
  NEW_BOOKING_REQUEST: "new_booking_request",
  BOOKING_CONFIRMATION: "booking_confirmation",
  PAYMENT_COMPLETED: "payment_completed",
  SERVICE_COMPLETION_REMINDER: "service_completion_reminder",
  REVIEW_REQUEST: "review_request",
  CHAT_MESSAGE: "chat_message",
  BOOKING_CANCELLED: "booking_cancelled",
  BOOKING_COMPLETED: "booking_completed",
  PAYMENT_RECEIVED: "payment_received",
  PAYMENT_FAILED: "payment_failed",
  PROVIDER_MESSAGE: "provider_message",
  SYSTEM_ANNOUNCEMENT: "system_announcement",
  SERVICE_RESCHEDULED: "service_rescheduled",
  SERVICE_REMINDER: "service_reminder",
  PROMO_OFFER: "promo_offer",
  PROVIDER_ON_THE_WAY: "provider_on_the_way",
  BOOKING_RESCHEDULED: "booking_rescheduled",
  CLIENT_NO_SHOW: "client_no_show",
  PAYMENT_ISSUE: "payment_issue",
  BOOKING_AUTO_CANCELLED_NOT_CHOSEN: "booking_auto_cancelled_not_chosen",
  BOOKING_AUTO_CANCELLED_MISSED_SLOT: "booking_auto_cancelled_missed_slot",
};

// User types
const USER_TYPES = {
  CLIENT: "client",
  PROVIDER: "provider",
};

// Notification status
const NOTIFICATION_STATUS = {
  UNREAD: "unread",
  READ: "read",
  PUSH_SENT: "push_sent",
  PUSH_SENT_AND_READ: "push_sent_and_read",
};

/**
 * Generate notification href based on type and user type
 * @param {string} notificationType - Type of notification
 * @param {string} userType - Type of user (client/provider)
 * @param {string} entityId - Optional entity ID (booking ID or conversation ID)
 * @return {string} URL path (no hash) for in-app navigation
 */
function generateNotificationHref(notificationType, userType, entityId) {
  // Return "/" to make them clickable to homepage (used for in-app navigation)
  if (notificationType === NOTIFICATION_TYPES.GENERIC &&
      (!entityId || entityId === null)) {
    return "/";
  }

  if (!entityId) return "/";

  const isProvider = userType === USER_TYPES.PROVIDER;

  switch (notificationType) {
  case NOTIFICATION_TYPES.CHAT_MESSAGE:
    return isProvider ?
      `/provider/chat/${entityId}` :
      `/client/chat/${entityId}`;

  case NOTIFICATION_TYPES.REVIEW_REMINDER:
  case NOTIFICATION_TYPES.REVIEW_REQUEST:
    return isProvider ?
      `/provider/rate-client/${entityId}` :
      `/client/review/${entityId}`;

  case NOTIFICATION_TYPES.PAYMENT_COMPLETED:
    return `/provider/receipt/${entityId}`;

  case NOTIFICATION_TYPES.SERVICE_COMPLETION_REMINDER:
    return isProvider ?
      `/provider/active-service/${entityId}` :
      `/client/booking/${entityId}`;

  case NOTIFICATION_TYPES.BOOKING_AUTO_CANCELLED_NOT_CHOSEN:
  case NOTIFICATION_TYPES.BOOKING_AUTO_CANCELLED_MISSED_SLOT:
    // Redirect to services page to find new bookings
    return isProvider ? `/provider/bookings` : `/client/home`;

  case NOTIFICATION_TYPES.SERVICE_REMINDER:
    // Redirect to active service or booking details
    return isProvider ?
      `/provider/booking/${entityId}` :
      `/client/booking/${entityId}`;

  default:
    return isProvider ?
      `/provider/booking/${entityId}` :
      `/client/booking/${entityId}`;
  }
}

/**
 * Check if user is spamming notifications (rate limiting)
 * @param {string} userId - User ID
 * @param {string} notificationType - Notification type
 * @return {Promise<boolean>} True if spamming
 */
async function isSpamming(userId, notificationType) {
  const spamKey = `${userId}_${notificationType}`;
  const now = Date.now();
  const windowStart = now - SPAM_PREVENTION_WINDOW;

  try {
    const freqRef = db.collection("notificationFrequency").doc(spamKey);
    const freqDoc = await freqRef.get();

    if (!freqDoc.exists) {
      return false;
    }

    const timestamps = freqDoc.data().timestamps || [];
    const recentTimestamps = timestamps.filter((t) => t > windowStart);

    return recentTimestamps.length >= MAX_NOTIFICATIONS_PER_WINDOW;
  } catch (error) {
    console.error("Error checking spam prevention:", error);
    return false;
  }
}

/**
 * Update notification frequency tracking
 * @param {string} userId - User ID
 * @param {string} notificationType - Notification type
 * @return {Promise<void>} Promise that resolves when frequency is updated
 */
async function updateNotificationFrequency(userId, notificationType) {
  const spamKey = `${userId}_${notificationType}`;
  const now = Date.now();
  const windowStart = now - SPAM_PREVENTION_WINDOW;

  try {
    const freqRef = db.collection("notificationFrequency").doc(spamKey);

    await db.runTransaction(async (transaction) => {
      const freqDoc = await transaction.get(freqRef);

      if (!freqDoc.exists) {
        transaction.set(freqRef, {
          userId,
          notificationType,
          timestamps: [now],
          lastUpdated: FieldValue.serverTimestamp(),
        });
      } else {
        const timestamps = freqDoc.data().timestamps || [];
        const recentTimestamps = timestamps.filter((t) => t > windowStart);
        recentTimestamps.push(now);

        transaction.update(freqRef, {
          timestamps: recentTimestamps,
          lastUpdated: FieldValue.serverTimestamp(),
        });
      }
    });
  } catch (error) {
    console.error("Error updating notification frequency:", error);
    // Don't throw - this is best-effort tracking
  }
}


/**
 * Send OneSignal push notification
 * @param {string} userId - User ID to send notification to
 * @param {object} notification - Notification data
 * @return {Promise<boolean>} True if sent successfully
 */
async function sendOneSignalNotification(userId, notification) {
  try {
    // Get user's OneSignal player IDs from Firestore
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      console.log(`OneSignal: User ${userId} not found`);
      return false;
    }

    const userData = userDoc.data();
    const playerIds = userData.oneSignalPlayerIds || [];

    if (playerIds.length === 0) {
      console.log(`OneSignal: User ${userId} has no registered player IDs`);
      return false;
    }

    // Check if we have the REST API key
    if (!ONESIGNAL_REST_API_KEY) {
      console.error("OneSignal: REST API key not configured");
      return false;
    }

    // Prepare notification payload
    // Normalize href: keep path without hash for in-app navigation (data.href)
    // and build an absolute URL with a hash for push opens (payload.url)
    let hrefPath = notification.href || "/";
    if (typeof hrefPath === "string") {
      // strip an existing leading '/#' or '#' if present
      hrefPath = hrefPath.replace(/^\/?#/, "");
      // ensure leading slash for in-app path
      if (!hrefPath.startsWith("/")) hrefPath = "/" + hrefPath;
    } else {
      hrefPath = "/";
    }

    const payload = {
      app_id: ONESIGNAL_APP_ID,
      include_player_ids: playerIds,
      headings: {en: notification.title},
      contents: {en: notification.message},
      data: {
        notificationId: notification.id,
        type: notification.notificationType,
        relatedEntityId: notification.relatedEntityId,
        metadata: notification.metadata,
        href: hrefPath, // in-app path (no hash)
      },
    };

    // Add URL if available: use base URL + '/#' + hrefPath so push opens with hash routing
    if (hrefPath) {
      // Ensure APP_BASE_URL doesn't end with a slash
      const base = APP_BASE_URL.replace(/\/$/, "");
      payload.url = `${base}/#${hrefPath}`;
    }

    // Send notification via OneSignal REST API
    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("OneSignal: Failed to send notification", result);
      return false;
    }

    console.log(`OneSignal: Notification sent to ${playerIds.length} device(s)`, result);

    // Update notification status to push_sent
    await db.collection("notifications").doc(notification.id).update({
      status: "push_sent",
      updatedAt: FieldValue.serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error("OneSignal: Failed to send push notification", error);
    return false;
  }
}

/**
 * Create a new notification
 * HTTPS Callable Function
 */
exports.createNotification = functions.https.onCall(async (data, context) => {
  console.log("createNotification called");
  // Extract payload from data.data
  const payload = data.data || data;
  const {
    targetUserId,
    userType,
    notificationType,
    title,
    message,
    relatedEntityId,
    metadata,
  } = payload;

  // Authentication (must be authenticated to create notifications)
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  // Validation (mirror Motoko logic)
  if (!targetUserId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Target user ID is required",
    );
  }

  if (!userType || !Object.values(USER_TYPES).includes(userType)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Valid user type is required (client or provider)",
    );
  }

  if (
    !notificationType ||
    !Object.values(NOTIFICATION_TYPES).includes(notificationType)
  ) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Valid notification type is required",
    );
  }

  if (!title || title.length === 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Title is required",
    );
  }

  if (!message || message.length === 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Message is required",
    );
  }

  try {
    // Check spam prevention
    const spamming = await isSpamming(targetUserId, notificationType);
    if (spamming) {
      throw new functions.https.HttpsError(
        "resource-exhausted",
        "Notification rate limit exceeded",
      );
    }

    // Generate notification ID and timestamps
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + NOTIFICATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    );

    // Generate href
    const href = generateNotificationHref(
      notificationType,
      userType,
      relatedEntityId,
    );

    // Create notification document
    const notificationRef = db.collection("notifications").doc();
    const notification = {
      id: notificationRef.id,
      userId: targetUserId,
      userType,
      notificationType,
      title,
      message,
      relatedEntityId: relatedEntityId || null,
      metadata: metadata || null,
      href,
      status: NOTIFICATION_STATUS.UNREAD,
      createdAt: FieldValue.serverTimestamp(),
      readAt: null,
      pushSentAt: null,
      expiresAt,
    };

    // Store in Firestore
    await notificationRef.set(notification);

    // Update notification frequency tracking
    await updateNotificationFrequency(targetUserId, notificationType);

    // Send OneSignal push notification asynchronously (don't wait for it)
    sendOneSignalNotification(targetUserId, {
      ...notification,
      createdAt: now,
    }).catch((error) => {
      console.error("Failed to send OneSignal notification:", error);
    });

    console.log("[createNotification] Function completed successfully");
    return {success: true, notificationId: notificationRef.id};
  } catch (error) {
    console.error("Error in createNotification:", error);

    // Re-throw HttpsError
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get notifications for current user
 * HTTPS Callable Function
 */
exports.getUserNotifications = functions.https.onCall(async (data, context) => {
  console.log("getUserNotifications called");
  // Extract payload from data.data
  const payload = data.data || data;
  const {userId, filter} = payload;

  // Authentication
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  // Use authenticated user's ID if not provided or if not admin
  const targetUserId =
    userId && authInfo.isAdmin ? userId : authInfo.uid;

  try {
    let query = db
      .collection("notifications")
      .where("userId", "==", targetUserId)
      .orderBy("createdAt", "desc");

    // Apply filters if provided
    if (filter) {
      if (filter.userType) {
        query = query.where("userType", "==", filter.userType);
      }

      if (filter.notificationType) {
        query = query.where("notificationType", "==", filter.notificationType);
      }

      if (filter.status) {
        query = query.where("status", "==", filter.status);
      }

      if (filter.limit) {
        query = query.limit(filter.limit);
      }
    }

    const snapshot = await query.get();

    const notifications = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        userType: data.userType,
        notificationType: data.notificationType,
        title: data.title,
        message: data.message,
        relatedEntityId: data.relatedEntityId,
        metadata: data.metadata,
        href: data.href,
        status: data.status,
        createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
        readAt: data.readAt?.toDate().toISOString() || null,
        pushSentAt: data.pushSentAt?.toDate().toISOString() || null,
        expiresAt: data.expiresAt?.toDate().toISOString() || null,
      };
    });

    return {success: true, notifications};
  } catch (error) {
    console.error("Error in getUserNotifications:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Mark notification as read
 * HTTPS Callable Function
 */
exports.markNotificationAsRead = functions.https.onCall(
  async (data, context) => {
    console.log("markNotificationAsRead called");

    // Extract payload from data.data
    const payload = data.data || data;
    const {notificationId} = payload;

    // Authentication
    const authInfo = getAuthInfo(context, data);

    if (!authInfo.hasAuth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated",
      );
    }

    // Validation
    if (!notificationId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Notification ID is required",
      );
    }

    try {
      console.log(`[markNotificationAsRead] Fetching notification ${notificationId}...`);
      const notificationRef = db.collection("notifications").doc(notificationId);

      await db.runTransaction(async (transaction) => {
        const notificationDoc = await transaction.get(notificationRef);

        if (!notificationDoc.exists) {
          throw new functions.https.HttpsError(
            "not-found",
            "Notification not found",
          );
        }

        const notification = notificationDoc.data();

        // Verify ownership
        if (notification.userId !== authInfo.uid && !authInfo.isAdmin) {
          throw new functions.https.HttpsError(
            "permission-denied",
            "You can only mark your own notifications as read",
          );
        }

        // Update status based on current state
        let newStatus = NOTIFICATION_STATUS.READ;
        if (notification.status === NOTIFICATION_STATUS.PUSH_SENT) {
          newStatus = NOTIFICATION_STATUS.PUSH_SENT_AND_READ;
        }

        transaction.update(notificationRef, {
          status: newStatus,
          readAt: FieldValue.serverTimestamp(),
        });
      });

      console.log("[markNotificationAsRead] Function finished successfully.");
      return {success: true};
    } catch (error) {
      console.error("Error in markNotificationAsRead:", error);

      // Re-throw HttpsError
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError("internal", error.message);
    }
  },
);

/**
 * Mark notification as push sent
 * HTTPS Callable Function
 */
exports.markNotificationAsPushSent = functions.https.onCall(
  async (data, context) => {
    console.log("markNotificationAsPushSent called");

    // Extract payload from data.data
    const payload = data.data || data;
    const {notificationId} = payload;

    // Authentication
    const authInfo = getAuthInfo(context, data);

    if (!authInfo.hasAuth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated",
      );
    }

    // Validation
    if (!notificationId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Notification ID is required",
      );
    }

    try {
      const notificationRef = db.collection("notifications").doc(notificationId);

      await db.runTransaction(async (transaction) => {
        const notificationDoc = await transaction.get(notificationRef);

        if (!notificationDoc.exists) {
          throw new functions.https.HttpsError(
            "not-found",
            "Notification not found",
          );
        }

        const notification = notificationDoc.data();

        // Verify ownership
        if (notification.userId !== authInfo.uid && !authInfo.isAdmin) {
          throw new functions.https.HttpsError(
            "permission-denied",
            "You can only update your own notifications",
          );
        }

        // Update status based on current state
        let newStatus = NOTIFICATION_STATUS.PUSH_SENT;
        if (notification.status === NOTIFICATION_STATUS.READ) {
          newStatus = NOTIFICATION_STATUS.PUSH_SENT_AND_READ;
        }

        transaction.update(notificationRef, {
          status: newStatus,
          pushSentAt: FieldValue.serverTimestamp(),
        });
      });

      console.log("[markNotificationAsPushSent] Function finished successfully.");
      return {success: true};
    } catch (error) {
      console.error("Error in markNotificationAsPushSent:", error);

      // Re-throw HttpsError
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError("internal", error.message);
    }
  },
);

/**
 * Get notifications eligible for push (not yet sent)
 * HTTPS Callable Function
 */
exports.getNotificationsForPush = functions.https.onCall(
  async (data, context) => {
    console.log("getNotificationsForPush called");

    // Extract payload from data.data
    const payload = data.data || data;
    const {userId} = payload;

    // Authentication
    const authInfo = getAuthInfo(context, data);

    if (!authInfo.hasAuth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated",
      );
    }

    // Use authenticated user's ID if not provided or if not admin
    const targetUserId = userId && authInfo.isAdmin ? userId : authInfo.uid;

    try {
      const snapshot = await db
        .collection("notifications")
        .where("userId", "==", targetUserId)
        .where("status", "==", NOTIFICATION_STATUS.UNREAD)
        .orderBy("createdAt", "desc")
        .limit(50)
        .get();

      const notifications = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          userType: data.userType,
          notificationType: data.notificationType,
          title: data.title,
          message: data.message,
          relatedEntityId: data.relatedEntityId,
          metadata: data.metadata,
          href: data.href,
          status: data.status,
          createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
          readAt: data.readAt?.toDate().toISOString() || null,
          pushSentAt: data.pushSentAt?.toDate().toISOString() || null,
          expiresAt: data.expiresAt?.toDate().toISOString() || null,
        };
      });

      return {success: true, notifications};
    } catch (error) {
      console.error("Error in getNotificationsForPush:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  },
);

/**
 * Store OneSignal Player ID for user
 * HTTPS Callable Function
 */
exports.storeOneSignalPlayerId = functions.https.onCall(async (data, context) => {
  console.log("storeOneSignalPlayerId called");

  // Extract payload from data.data
  const payload = data.data || data;
  const {playerId} = payload;

  // Authentication
  const authInfo = getAuthInfo(context, data);

  if (!authInfo.hasAuth) {
    console.log("storeOneSignalPlayerId: User not authenticated");
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  // Validation
  if (!playerId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Player ID is required",
    );
  }

  try {
    const userRef = db.collection("users").doc(authInfo.uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      // User document doesn't exist, create it with the player ID
      await userRef.set({
        oneSignalPlayerIds: [playerId],
        oneSignalUpdatedAt: FieldValue.serverTimestamp(),
      }, {merge: true});
    } else {
      // User document exists, add player ID to array if not already present
      const existingPlayerIds = userDoc.data().oneSignalPlayerIds || [];

      if (existingPlayerIds.includes(playerId)) {
        return {success: true, message: "Player ID already registered"};
      }

      // Add new player ID to array
      await userRef.update({
        oneSignalPlayerIds: FieldValue.arrayUnion(playerId),
        oneSignalUpdatedAt: FieldValue.serverTimestamp(),
      });
    }

    console.log("[storeOneSignalPlayerId] Function completed successfully");
    return {success: true};
  } catch (error) {
    console.error("Error in storeOneSignalPlayerId:", error);

    // Handle specific Firestore errors
    if (error.code === "not-found") {
      try {
        await db.collection("users").doc(authInfo.uid).set({
          oneSignalPlayerIds: [playerId],
          oneSignalUpdatedAt: FieldValue.serverTimestamp(),
        }, {merge: true});
        return {success: true};
      } catch (createError) {
        console.error("Error creating user document:", createError);
        throw new functions.https.HttpsError("internal", createError.message);
      }
    }

    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Remove OneSignal Player ID for user
 * HTTPS Callable Function
 */
exports.removeOneSignalPlayerId = functions.https.onCall(async (data, context) => {
  console.log("removeOneSignalPlayerId called");

  // Extract payload from data.data
  const payload = data.data || data;
  const {playerId} = payload;

  // Authentication
  const authInfo = getAuthInfo(context, data);

  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  try {
    const userRef = db.collection("users").doc(authInfo.uid);

    if (playerId) {
      // Remove specific player ID
      await userRef.update({
        oneSignalPlayerIds: FieldValue.arrayRemove(playerId),
        oneSignalUpdatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      // Remove all player IDs
      await userRef.update({
        oneSignalPlayerIds: [],
        oneSignalUpdatedAt: FieldValue.serverTimestamp(),
      });
    }

    console.log("[removeOneSignalPlayerId] Function completed successfully");
    return {success: true};
  } catch (error) {
    console.error("Error in removeOneSignalPlayerId:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get notification statistics
 * HTTPS Callable Function
 */
exports.getNotificationStats = functions.https.onCall(async (data, context) => {
  console.log("getNotificationStats called");
  // Extract payload from data.data
  const payload = data.data || data;
  const {userId} = payload;

  // Authentication
  const authInfo = getAuthInfo(context, data);

  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  // Use authenticated user's ID if not provided or if not admin
  const targetUserId = userId && authInfo.isAdmin ? userId : authInfo.uid;

  try {
    const snapshot = await db
      .collection("notifications")
      .where("userId", "==", targetUserId)
      .get();

    let total = 0;
    let unread = 0;
    let pushSent = 0;
    let read = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      total++;

      switch (data.status) {
      case NOTIFICATION_STATUS.UNREAD:
        unread++;
        break;
      case NOTIFICATION_STATUS.READ:
        read++;
        break;
      case NOTIFICATION_STATUS.PUSH_SENT:
        pushSent++;
        unread++; // Push sent but not read counts as unread
        break;
      case NOTIFICATION_STATUS.PUSH_SENT_AND_READ:
        pushSent++;
        read++;
        break;
      }
    });

    return {
      success: true,
      stats: {total, unread, pushSent, read},
    };
  } catch (error) {
    console.error("Error in getNotificationStats:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Mark all notifications as read
 * HTTPS Callable Function
 */
exports.markAllNotificationsAsRead = functions.https.onCall(
  async (data, context) => {
    console.log("markAllNotificationsAsRead called");
    // Authentication
    const authInfo = getAuthInfo(context, data);

    if (!authInfo.hasAuth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated",
      );
    }

    try {
      const snapshot = await db
        .collection("notifications")
        .where("userId", "==", authInfo.uid)
        .where("status", "in", [
          NOTIFICATION_STATUS.UNREAD,
          NOTIFICATION_STATUS.PUSH_SENT,
        ])
        .get();

      const batch = db.batch();
      let count = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        const newStatus =
          data.status === NOTIFICATION_STATUS.PUSH_SENT ?
            NOTIFICATION_STATUS.PUSH_SENT_AND_READ :
            NOTIFICATION_STATUS.READ;

        batch.update(doc.ref, {
          status: newStatus,
          readAt: FieldValue.serverTimestamp(),
        });
        count++;
      });

      await batch.commit();
      return {success: true, count};
    } catch (error) {
      console.error("Error in markAllNotificationsAsRead:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  },
);

/**
 * Check if user can receive notification (rate limiting check)
 * HTTPS Callable Function
 */
exports.canReceiveNotification = functions.https.onCall(
  async (data, context) => {
    console.log("canReceiveNotification called");

    // Extract payload from data.data
    const payload = data.data || data;
    const {userId, notificationType} = payload;

    // Authentication
    const authInfo = getAuthInfo(context, data);

    if (!authInfo.hasAuth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated",
      );
    }

    // Validation
    if (!userId || !notificationType) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "User ID and notification type are required",
      );
    }

    try {
      const canReceive = !(await isSpamming(userId, notificationType));
      return {success: true, canReceive};
    } catch (error) {
      console.error("Error in canReceiveNotification:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  },
);

/**
 * Delete a notification
 * HTTPS Callable Function
 */
exports.deleteNotification = functions.https.onCall(async (data, context) => {
  // Extract payload from data.data
  const payload = data.data || data;
  const {notificationId} = payload;

  // Authentication
  const authInfo = getAuthInfo(context, data);

  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  // Validation
  if (!notificationId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Notification ID is required",
    );
  }

  try {
    const notificationRef = db.collection("notifications").doc(notificationId);
    const notificationDoc = await notificationRef.get();

    if (!notificationDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Notification not found");
    }

    const notification = notificationDoc.data();

    // Security: Only allow user to delete their own notifications or admin
    if (notification.userId !== authInfo.uid && !authInfo.isAdmin) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Not authorized to delete this notification",
      );
    }

    // Delete the notification
    await notificationRef.delete();

    return {success: true};
  } catch (error) {
    console.error("Error in deleteNotification:", error);

    // Re-throw HttpsError
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Cleanup expired notifications (scheduled function)
 * Runs daily at midnight UTC
 */
exports.cleanupExpiredNotifications = onSchedule("0 0 * * *", async (_event) => {
  console.log("[cleanupExpiredNotifications] scheduled function running...");
  try {
    const now = new Date();
    const snapshot = await db
      .collection("notifications")
      .where("expiresAt", "<=", now)
      .get();

    const batch = db.batch();
    let count = 0;

    snapshot.forEach((doc) => {
      batch.delete(doc.ref);
      count++;
    });

    await batch.commit();

    return {success: true, count};
  } catch (error) {
    console.error("Error cleaning up expired notifications:", error);
    throw error;
  }
});

/**
 * Cleanup old notification frequency entries (scheduled function)
 * Runs every 6 hours
 */
exports.cleanupNotificationFrequency = onSchedule("0 */6 * * *", async (_event) => {
  console.log("[cleanupNotificationFrequency] scheduled function running...");
  try {
    const now = Date.now();
    const windowStart = now - SPAM_PREVENTION_WINDOW;

    const snapshot = await db.collection("notificationFrequency").get();

    const batch = db.batch();
    let count = 0;

    snapshot.forEach((doc) => {
      const timestamps = doc.data().timestamps || [];
      const recentTimestamps = timestamps.filter((t) => t > windowStart);

      if (recentTimestamps.length === 0) {
        batch.delete(doc.ref);
        count++;
      } else if (recentTimestamps.length < timestamps.length) {
        batch.update(doc.ref, {
          timestamps: recentTimestamps,
          lastUpdated: FieldValue.serverTimestamp(),
        });
      }
    });

    await batch.commit();

    return {success: true, count};
  } catch (error) {
    console.error("Error cleaning up notification frequency:", error);
    throw error;
  }
});

// Export helper functions and constants for use in other modules
exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
exports.USER_TYPES = USER_TYPES;
exports.NOTIFICATION_STATUS = NOTIFICATION_STATUS;
exports.generateNotificationHref = generateNotificationHref;
exports.isSpamming = isSpamming;
exports.updateNotificationFrequency = updateNotificationFrequency;
exports.sendOneSignalNotification = sendOneSignalNotification;
