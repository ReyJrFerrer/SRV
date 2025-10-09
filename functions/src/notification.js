const functions = require("firebase-functions");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const {FieldValue} = require("firebase-admin/firestore");

const db = admin.firestore();

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

// Constants for spam prevention (matching Motoko logic)
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
 * @param {string} bookingId - Optional booking ID
 * @return {string} URL href
 */
function generateNotificationHref(notificationType, userType, bookingId) {
  if (!bookingId) return "/";

  const isProvider = userType === USER_TYPES.PROVIDER;

  switch (notificationType) {
  case NOTIFICATION_TYPES.REVIEW_REMINDER:
  case NOTIFICATION_TYPES.REVIEW_REQUEST:
    return isProvider ?
      `/provider/booking/${bookingId}` :
      `/client/review/${bookingId}`;

  case NOTIFICATION_TYPES.PAYMENT_COMPLETED:
    return `/provider/receipt/${bookingId}`;

  case NOTIFICATION_TYPES.SERVICE_COMPLETION_REMINDER:
    return `/provider/active-service/${bookingId}`;

  default:
    return isProvider ?
      `/provider/booking/${bookingId}` :
      `/client/booking/${bookingId}`;
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
    return false; // Fail open to avoid blocking legitimate notifications
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
 * Send FCM push notification
 * @param {string} userId - User ID to send notification to
 * @param {object} notification - Notification data
 * @return {Promise<boolean>} True if sent successfully
 */
async function sendFCMNotification(userId, notification) {
  try {
    // Get user's FCM token from Firestore
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      console.warn(`User ${userId} not found for FCM notification`);
      return false;
    }

    const fcmToken = userDoc.data().fcmToken;

    if (!fcmToken) {
      console.info(`User ${userId} has no FCM token registered`);
      return false;
    }

    // Prepare FCM message
    const message = {
      token: fcmToken,
      notification: {
        title: notification.title,
        body: notification.message,
      },
      data: {
        notificationId: notification.id,
        type: notification.notificationType,
        userType: notification.userType,
        href: notification.href || "/",
        bookingId: notification.relatedEntityId || "",
        timestamp: notification.createdAt.toISOString(),
      },
      android: {
        priority: "high",
        notification: {
          icon: "logo",
          sound: "default",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
          },
        },
      },
      webpush: {
        notification: {
          icon: "/logo.svg",
          badge: "/logo.svg",
          requireInteraction:
            notification.notificationType ===
              NOTIFICATION_TYPES.NEW_BOOKING_REQUEST ||
            notification.notificationType ===
              NOTIFICATION_TYPES.BOOKING_ACCEPTED ||
            notification.notificationType === NOTIFICATION_TYPES.PAYMENT_COMPLETED,
        },
        fcmOptions: {
          link: notification.href || "/",
        },
      },
    };

    // Send via FCM
    await admin.messaging().send(message);
    console.log(`FCM notification sent to user ${userId}`);

    return true;
  } catch (error) {
    console.error("Error sending FCM notification:", error);

    // If token is invalid, remove it from user document
    if (
      error.code === "messaging/invalid-registration-token" ||
      error.code === "messaging/registration-token-not-registered"
    ) {
      try {
        await db.collection("users").doc(userId).update({
          fcmToken: FieldValue.delete(),
        });
        console.log(`Removed invalid FCM token for user ${userId}`);
      } catch (updateError) {
        console.error("Error removing invalid FCM token:", updateError);
      }
    }

    return false;
  }
}

/**
 * Create a new notification
 * HTTPS Callable Function
 */
exports.createNotification = functions.https.onCall(async (data, context) => {
  console.log("🚀 [createNotification] called");
  const safeDataForLog = {
    targetUserId: data.data?.targetUserId,
    userType: data.data?.userType,
    notificationType: data.data?.notificationType,
    title: data.data?.title,
    message: data.data?.message,
    relatedEntityId: data.data?.relatedEntityId,
    metadata: data.data?.metadata ? "Present" : "Missing",
  };
  console.log("📦 [createNotification] Received payload:", JSON.stringify(safeDataForLog, null, 2));

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
  console.log("🔐 [createNotification] Auth info:", authInfo);
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  // Validation (mirror Motoko logic)
  if (!targetUserId) {
    console.error("❌ [createNotification] Validation failed: Missing targetUserId.");
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Target user ID is required",
    );
  }

  if (!userType || !Object.values(USER_TYPES).includes(userType)) {
    console.error(`❌ [createNotification] Validation failed: Invalid userType: ${userType}.`);
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Valid user type is required (client or provider)",
    );
  }

  if (
    !notificationType ||
    !Object.values(NOTIFICATION_TYPES).includes(notificationType)
  ) {
    console.error(`❌ [createNotification] Validation failed: 
      Invalid notificationType: ${notificationType}.`);
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Valid notification type is required",
    );
  }

  if (!title || title.length === 0) {
    console.error("❌ [createNotification] Validation failed: Missing title.");
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Title is required",
    );
  }

  if (!message || message.length === 0) {
    console.error("❌ [createNotification] Validation failed: Missing message.");
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Message is required",
    );
  }

  try {
    // Check spam prevention
    console.log(`🛡️ [createNotification] Checking spam prevention for user ${targetUserId}...`);
    const spamming = await isSpamming(targetUserId, notificationType);
    if (spamming) {
      console.warn(`⚠️ [createNotification] Notification rate 
        limit exceeded for user ${targetUserId}.`);
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
    console.log(`📝 [createNotification] Creating notification document ${notificationRef.id}...`);
    await notificationRef.set(notification);

    // Update notification frequency tracking
    await updateNotificationFrequency(targetUserId, notificationType);

    // Send FCM push notification asynchronously (don't wait for it)
    sendFCMNotification(targetUserId, {
      ...notification,
      createdAt: now,
    }).catch((error) => {
      console.error("Failed to send FCM notification:", error);
    });

    console.log("✅ [createNotification] Function finished successfully.");
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
  console.log("🚀 [getUserNotifications] called");
  const safeDataForLog = {
    userId: data.data?.userId,
    filter: data.data?.filter,
  };
  console.log("📦 [getUserNotifications] Received payload:"
    , JSON.stringify(safeDataForLog, null, 2));

  // Extract payload from data.data
  const payload = data.data || data;
  const {userId, filter} = payload;

  // Authentication
  const authInfo = getAuthInfo(context, data);
  console.log("🔐 [getUserNotifications] Auth info:", authInfo);
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
    console.log(`📝 [getUserNotifications] Fetching notifications for user ${targetUserId}...`);

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

    console.log(`✅ [getUserNotifications] Found ${notifications.length} notifications.`);
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
    console.log("🚀 [markNotificationAsRead] called");
    const safeDataForLog = {notificationId: data.data?.notificationId};
    console.log("📦 [markNotificationAsRead] Received payload:"
      , JSON.stringify(safeDataForLog, null, 2));

    // Extract payload from data.data
    const payload = data.data || data;
    const {notificationId} = payload;

    // Authentication
    const authInfo = getAuthInfo(context, data);
    console.log("🔐 [markNotificationAsRead] Auth info:", authInfo);

    if (!authInfo.hasAuth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated",
      );
    }

    // Validation
    if (!notificationId) {
      console.error("❌ [markNotificationAsRead] Validation failed: Missing notificationId.");
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Notification ID is required",
      );
    }

    try {
      console.log(`📝 [markNotificationAsRead] Fetching notification ${notificationId}...`);
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

        // Verify ownership (unless admin)
        if (notification.userId !== authInfo.uid && !authInfo.isAdmin) {
          console.error(`❌ [markNotificationAsRead] Permission denied. 
            User ${authInfo.uid} cannot access notification for user ${notification.userId}.`);
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

        console.log(`📝 [markNotificationAsRead] Updating notification 
          ${notificationId} to status ${newStatus}.`);
        transaction.update(notificationRef, {
          status: newStatus,
          readAt: FieldValue.serverTimestamp(),
        });
      });

      console.log("✅ [markNotificationAsRead] Function finished successfully.");
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
    console.log("🚀 [markNotificationAsPushSent] called");
    const safeDataForLog = {notificationId: data.data?.notificationId};
    console.log("📦 [markNotificationAsPushSent] Received payload:"
      , JSON.stringify(safeDataForLog, null, 2));

    // Extract payload from data.data
    const payload = data.data || data;
    const {notificationId} = payload;

    // Authentication
    const authInfo = getAuthInfo(context, data);
    console.log("🔐 [markNotificationAsPushSent] Auth info:", authInfo);

    if (!authInfo.hasAuth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated",
      );
    }

    // Validation
    if (!notificationId) {
      console.error("❌ [markNotificationAsPushSent] Validation failed: Missing notificationId.");
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Notification ID is required",
      );
    }

    try {
      console.log(`📝 [markNotificationAsPushSent] Fetching notification ${notificationId}...`);
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

        // Verify ownership (unless admin)
        if (notification.userId !== authInfo.uid && !authInfo.isAdmin) {
          console.error(`❌ [markNotificationAsPushSent] Permission denied. 
            User ${authInfo.uid} cannot access notification for user ${notification.userId}.`);
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

        console.log(`📝 [markNotificationAsPushSent] Updating notification 
          ${notificationId} to status ${newStatus}.`);
        transaction.update(notificationRef, {
          status: newStatus,
          pushSentAt: FieldValue.serverTimestamp(),
        });
      });

      console.log("✅ [markNotificationAsPushSent] Function finished successfully.");
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
    console.log("🚀 [getNotificationsForPush] called");
    const safeDataForLog = {userId: data.data?.userId};
    console.log("📦 [getNotificationsForPush] Received payload:"
      , JSON.stringify(safeDataForLog, null, 2));

    // Extract payload from data.data
    const payload = data.data || data;
    const {userId} = payload;

    // Authentication
    const authInfo = getAuthInfo(context, data);
    console.log("🔐 [getNotificationsForPush] Auth info:", authInfo);

    if (!authInfo.hasAuth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated",
      );
    }

    // Use authenticated user's ID if not provided or if not admin
    const targetUserId = userId && authInfo.isAdmin ? userId : authInfo.uid;

    try {
      console.log(`📝 [getNotificationsForPush] 
        Fetching unread notifications for user ${targetUserId}...`);
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

      console.log(`✅ [getNotificationsForPush] 
        Found ${notifications.length} notifications to push.`);
      return {success: true, notifications};
    } catch (error) {
      console.error("Error in getNotificationsForPush:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  },
);

/**
 * Store FCM token for user
 * HTTPS Callable Function
 */
exports.storeFCMToken = functions.https.onCall(async (data, context) => {
  console.log("🚀 [storeFCMToken] called");
  const safeDataForLog = {fcmToken: data.data?.fcmToken ? "Present" : "Missing"};
  console.log("📦 [storeFCMToken] Received payload:", JSON.stringify(safeDataForLog, null, 2));

  // Extract payload from data.data
  const payload = data.data || data;
  const {fcmToken} = payload;

  // Authentication
  const authInfo = getAuthInfo(context, data);
  console.log("🔐 [storeFCMToken] Auth info:", authInfo);

  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  // Validation
  if (!fcmToken) {
    console.error("❌ [storeFCMToken] Validation failed: Missing fcmToken.");
    throw new functions.https.HttpsError(
      "invalid-argument",
      "FCM token is required",
    );
  }

  try {
    console.log(`📝 [storeFCMToken] Storing FCM token for user ${authInfo.uid}...`);
    await db.collection("users").doc(authInfo.uid).update({
      fcmToken,
      fcmTokenUpdatedAt: FieldValue.serverTimestamp(),
    });

    console.log("✅ [storeFCMToken] Function finished successfully.");
    return {success: true};
  } catch (error) {
    console.error("Error in storeFCMToken:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Remove FCM token for user
 * HTTPS Callable Function
 */
exports.removeFCMToken = functions.https.onCall(async (data, context) => {
  console.log("🚀 [removeFCMToken] called");

  // Authentication
  const authInfo = getAuthInfo(context, data);
  console.log("🔐 [removeFCMToken] Auth info:", authInfo);

  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  try {
    console.log(`📝 [removeFCMToken] Removing FCM token for user ${authInfo.uid}...`);
    await db.collection("users").doc(authInfo.uid).update({
      fcmToken: FieldValue.delete(),
      fcmTokenUpdatedAt: FieldValue.serverTimestamp(),
    });

    console.log("✅ [removeFCMToken] Function finished successfully.");
    return {success: true};
  } catch (error) {
    console.error("Error in removeFCMToken:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get notification statistics
 * HTTPS Callable Function
 */
exports.getNotificationStats = functions.https.onCall(async (data, context) => {
  console.log("🚀 [getNotificationStats] called");
  const safeDataForLog = {userId: data.data?.userId};
  console.log("📦 [getNotificationStats] Received payload:"
    , JSON.stringify(safeDataForLog, null, 2));

  // Extract payload from data.data
  const payload = data.data || data;
  const {userId} = payload;

  // Authentication
  const authInfo = getAuthInfo(context, data);
  console.log("🔐 [getNotificationStats] Auth info:", authInfo);

  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  // Use authenticated user's ID if not provided or if not admin
  const targetUserId = userId && authInfo.isAdmin ? userId : authInfo.uid;

  try {
    console.log(`📝 [getNotificationStats] Fetching notification stats for user ${targetUserId}...`);
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

    console.log(`✅ [getNotificationStats] Stats calculated:`, {total, unread, pushSent, read});
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
    console.log("🚀 [markAllNotificationsAsRead] called");

    // Authentication
    const authInfo = getAuthInfo(context, data);
    console.log("🔐 [markAllNotificationsAsRead] Auth info:", authInfo);

    if (!authInfo.hasAuth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated",
      );
    }

    try {
      console.log(`📝 [markAllNotificationsAsRead] 
        Fetching unread notifications for user ${authInfo.uid}...`);
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
      console.log(`✅ [markAllNotificationsAsRead] Marked ${count} notifications as read.`);
      console.log("✅ [markAllNotificationsAsRead] Function finished successfully.");
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
    console.log("🚀 [canReceiveNotification] called");
    const safeDataForLog = {userId: data.data?.userId,
      notificationType: data.data?.notificationType};
    console.log("📦 [canReceiveNotification] Received payload:"
      , JSON.stringify(safeDataForLog, null, 2));

    // Extract payload from data.data
    const payload = data.data || data;
    const {userId, notificationType} = payload;

    // Authentication
    const authInfo = getAuthInfo(context, data);
    console.log("🔐 [canReceiveNotification] Auth info:", authInfo);

    if (!authInfo.hasAuth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated",
      );
    }

    // Validation
    if (!userId || !notificationType) {
      console.error(`❌ [canReceiveNotification] Validation failed: 
        Missing userId or notificationType.`);
      throw new functions.https.HttpsError(
        "invalid-argument",
        "User ID and notification type are required",
      );
    }

    try {
      console.log(`🛡️ [canReceiveNotification] Checking rate limit for user ${userId}...`);
      const canReceive = !(await isSpamming(userId, notificationType));
      console.log(`✅ [canReceiveNotification] Can receive: ${canReceive}`);
      return {success: true, canReceive};
    } catch (error) {
      console.error("Error in canReceiveNotification:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  },
);

/**
 * Cleanup expired notifications (scheduled function)
 * Runs daily at midnight UTC
 */
exports.cleanupExpiredNotifications = onSchedule("0 0 * * *", async (_event) => {
  console.log("🚀 [cleanupExpiredNotifications] scheduled function running...");
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

    console.log(`✅ [cleanupExpiredNotifications] Cleaned up ${count} expired notifications.`);
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
  console.log("🚀 [cleanupNotificationFrequency] scheduled function running...");
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

    console.log(`✅ [cleanupNotificationFrequency] 
      Cleaned up ${count} old notification frequency entries.`);
    return {success: true, count};
  } catch (error) {
    console.error("Error cleaning up notification frequency:", error);
    throw error;
  }
});

// Export helper functions and constants for use in other modules
// (Adding to existing exports object, not replacing it)
exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
exports.USER_TYPES = USER_TYPES;
exports.NOTIFICATION_STATUS = NOTIFICATION_STATUS;
exports.generateNotificationHref = generateNotificationHref;
exports.isSpamming = isSpamming;
exports.updateNotificationFrequency = updateNotificationFrequency;
exports.sendFCMNotification = sendFCMNotification;
