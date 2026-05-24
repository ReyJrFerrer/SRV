/**
 * Notification Management Cloud Functions
 *
 * This module handles all notification-related operations
 * Consolidated into a single entrypoint following the Firebase optimization guidelines
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { getFirestore } = require("../firebase-admin");
const { FieldValue } = require("firebase-admin/firestore");

const db = getFirestore();

// OneSignal Configuration
const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID || "7bd5300e-16ce-4334-8462-93e1a1458579";
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY || "";

// Base URL for building absolute push URLs
const APP_BASE_URL = process.env.APP_BASE_URL || "https://srvpinoy.com";

// Constants for spam prevention
const SPAM_PREVENTION_WINDOW = 5 * 60 * 1000;
const MAX_NOTIFICATIONS_PER_WINDOW = 10;
const NOTIFICATION_EXPIRY_DAYS = 30;

// Notification types
const NOTIFICATION_TYPES = {
  BOOKING_ACCEPTED: "booking_accepted",
  BOOKING_DECLINED: "booking_declined",
  REVIEW_REMINDER: "review_reminder",
  GENERIC: "generic",
  NEW_BOOKING_REQUEST: "new_booking_request",
  START_SERVICE: "start_service",
  START_NAVIGATION: "start_navigation",
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

function getAuthInfo(context, data) {
  const auth = context.auth || data.auth;
  return {
    uid: auth?.uid || null,
    isAdmin: auth?.token?.isAdmin || false,
    hasAuth: !!auth,
  };
}

function generateNotificationHref(notificationType, userType, entityId) {
  if (notificationType === NOTIFICATION_TYPES.GENERIC && (!entityId || entityId === null)) {
    return "/";
  }

  if (!entityId) return "/";

  const isProvider = userType === USER_TYPES.PROVIDER;

  switch (notificationType) {
    case NOTIFICATION_TYPES.CHAT_MESSAGE:
      return isProvider ? `/provider/chat/${entityId}` : `/client/chat/${entityId}`;
    case NOTIFICATION_TYPES.REVIEW_REMINDER:
    case NOTIFICATION_TYPES.REVIEW_REQUEST:
      return isProvider ? `/provider/rate-client/${entityId}` : `/client/review/${entityId}`;
    case NOTIFICATION_TYPES.PAYMENT_COMPLETED:
      return `/provider/receipt/${entityId}`;
    case NOTIFICATION_TYPES.SERVICE_COMPLETION_REMINDER:
      return isProvider ? `/provider/active-service/${entityId}` : `/client/booking/${entityId}`;
    case NOTIFICATION_TYPES.START_SERVICE:
      return isProvider ? `/provider/active-service/${entityId}` : `/client/booking/${entityId}`;
    case NOTIFICATION_TYPES.START_NAVIGATION:
      return isProvider ? `/provider/directions/${entityId}` : `/client/booking/${entityId}`;
    case NOTIFICATION_TYPES.BOOKING_AUTO_CANCELLED_NOT_CHOSEN:
    case NOTIFICATION_TYPES.BOOKING_AUTO_CANCELLED_MISSED_SLOT:
      return isProvider ? `/provider/bookings` : `/client/home`;
    case NOTIFICATION_TYPES.SERVICE_REMINDER:
      return isProvider ? `/provider/booking/${entityId}` : `/client/booking/${entityId}`;
    default:
      return isProvider ? `/provider/booking/${entityId}` : `/client/booking/${entityId}`;
  }
}

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
  }
}

async function sendOneSignalNotification(userId, notification) {
  try {
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

    if (!ONESIGNAL_REST_API_KEY) {
      console.error("OneSignal: REST API key not configured");
      return false;
    }

    let hrefPath = notification.href || "/";
    if (typeof hrefPath === "string") {
      hrefPath = hrefPath.replace(/^\/?#/, "");
      if (!hrefPath.startsWith("/")) hrefPath = "/" + hrefPath;
    } else {
      hrefPath = "/";
    }

    const payload = {
      app_id: ONESIGNAL_APP_ID,
      include_player_ids: playerIds,
      headings: { en: notification.title },
      contents: { en: notification.message },
      data: {
        notificationId: notification.id,
        type: notification.notificationType,
        relatedEntityId: notification.relatedEntityId,
        metadata: notification.metadata,
        href: hrefPath,
      },
    };

    if (hrefPath) {
      const base = APP_BASE_URL.replace(/\/$/, "");
      payload.url = `${base}/#${hrefPath}`;
    }

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

// ============================================================================
// SERVICE LAYER FUNCTIONS (INTERNAL)
// ============================================================================

async function createNotification_notification(request) {
  const data = request.data;
  const context = { auth: request.auth, rawRequest: request };
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

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  if (!targetUserId) {
    throw new HttpsError("invalid-argument", "Target user ID is required");
  }

  if (!userType || !Object.values(USER_TYPES).includes(userType)) {
    throw new HttpsError("invalid-argument", "Valid user type is required (client or provider)");
  }

  if (!notificationType || !Object.values(NOTIFICATION_TYPES).includes(notificationType)) {
    throw new HttpsError("invalid-argument", "Valid notification type is required");
  }

  if (!title || title.length === 0) {
    throw new HttpsError("invalid-argument", "Title is required");
  }

  if (!message || message.length === 0) {
    throw new HttpsError("invalid-argument", "Message is required");
  }

  try {
    const spamming = await isSpamming(targetUserId, notificationType);
    if (spamming) {
      throw new HttpsError("resource-exhausted", "Notification rate limit exceeded");
    }

    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + NOTIFICATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    );

    const href = generateNotificationHref(notificationType, userType, relatedEntityId);

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

    await notificationRef.set(notification);
    await updateNotificationFrequency(targetUserId, notificationType);

    sendOneSignalNotification(targetUserId, {
      ...notification,
      createdAt: now,
    }).catch((error) => {
      console.error("Failed to send OneSignal notification:", error);
    });

    return { success: true, notificationId: notificationRef.id };
  } catch (error) {
    console.error("Error in createNotification:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message);
  }
}

async function getUserNotifications_notification(request) {
  const data = request.data;
  const context = { auth: request.auth, rawRequest: request };
  const payload = data.data || data;
  const { userId, filter } = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const targetUserId = userId && authInfo.isAdmin ? userId : authInfo.uid;

  try {
    let query = db
      .collection("notifications")
      .where("userId", "==", targetUserId)
      .orderBy("createdAt", "desc");

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

    return { success: true, notifications };
  } catch (error) {
    console.error("Error in getUserNotifications:", error);
    throw new HttpsError("internal", error.message);
  }
}

async function markNotificationAsRead_notification(request) {
  const data = request.data;
  const context = { auth: request.auth, rawRequest: request };
  const payload = data.data || data;
  const { notificationId } = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  if (!notificationId) {
    throw new HttpsError("invalid-argument", "Notification ID is required");
  }

  try {
    const notificationRef = db.collection("notifications").doc(notificationId);

    await db.runTransaction(async (transaction) => {
      const notificationDoc = await transaction.get(notificationRef);

      if (!notificationDoc.exists) {
        throw new HttpsError("not-found", "Notification not found");
      }

      const notification = notificationDoc.data();

      if (notification.userId !== authInfo.uid && !authInfo.isAdmin) {
        throw new HttpsError("permission-denied", "You can only mark your own notifications as read");
      }

      let newStatus = NOTIFICATION_STATUS.READ;
      if (notification.status === NOTIFICATION_STATUS.PUSH_SENT) {
        newStatus = NOTIFICATION_STATUS.PUSH_SENT_AND_READ;
      }

      transaction.update(notificationRef, {
        status: newStatus,
        readAt: FieldValue.serverTimestamp(),
      });
    });

    return { success: true };
  } catch (error) {
    console.error("Error in markNotificationAsRead:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message);
  }
}

async function markNotificationAsPushSent_notification(request) {
  const data = request.data;
  const context = { auth: request.auth, rawRequest: request };
  const payload = data.data || data;
  const { notificationId } = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  if (!notificationId) {
    throw new HttpsError("invalid-argument", "Notification ID is required");
  }

  try {
    const notificationRef = db.collection("notifications").doc(notificationId);

    await db.runTransaction(async (transaction) => {
      const notificationDoc = await transaction.get(notificationRef);

      if (!notificationDoc.exists) {
        throw new HttpsError("not-found", "Notification not found");
      }

      const notification = notificationDoc.data();

      if (notification.userId !== authInfo.uid && !authInfo.isAdmin) {
        throw new HttpsError("permission-denied", "You can only update your own notifications");
      }

      let newStatus = NOTIFICATION_STATUS.PUSH_SENT;
      if (notification.status === NOTIFICATION_STATUS.READ) {
        newStatus = NOTIFICATION_STATUS.PUSH_SENT_AND_READ;
      }

      transaction.update(notificationRef, {
        status: newStatus,
        pushSentAt: FieldValue.serverTimestamp(),
      });
    });

    return { success: true };
  } catch (error) {
    console.error("Error in markNotificationAsPushSent:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message);
  }
}

async function getNotificationsForPush_notification(request) {
  const data = request.data;
  const context = { auth: request.auth, rawRequest: request };
  const payload = data.data || data;
  const { userId } = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

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

    return { success: true, notifications };
  } catch (error) {
    console.error("Error in getNotificationsForPush:", error);
    throw new HttpsError("internal", error.message);
  }
}

async function storeOneSignalPlayerId_notification(request) {
  const data = request.data;
  const context = { auth: request.auth, rawRequest: request };
  const payload = data.data || data;
  const { playerId } = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  if (!playerId) {
    throw new HttpsError("invalid-argument", "Player ID is required");
  }

  try {
    const userRef = db.collection("users").doc(authInfo.uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      await userRef.set({
        oneSignalPlayerIds: [playerId],
        oneSignalUpdatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    } else {
      const existingPlayerIds = userDoc.data().oneSignalPlayerIds || [];

      if (existingPlayerIds.includes(playerId)) {
        return { success: true, message: "Player ID already registered" };
      }

      await userRef.update({
        oneSignalPlayerIds: FieldValue.arrayUnion(playerId),
        oneSignalUpdatedAt: FieldValue.serverTimestamp(),
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error in storeOneSignalPlayerId:", error);
    if (error.code === "not-found") {
      try {
        await db.collection("users").doc(authInfo.uid).set({
          oneSignalPlayerIds: [playerId],
          oneSignalUpdatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        return { success: true };
      } catch (createError) {
        console.error("Error creating user document:", createError);
        throw new HttpsError("internal", createError.message);
      }
    }
    throw new HttpsError("internal", error.message);
  }
}

async function removeOneSignalPlayerId_notification(request) {
  const data = request.data;
  const context = { auth: request.auth, rawRequest: request };
  const payload = data.data || data;
  const { playerId } = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  try {
    const userRef = db.collection("users").doc(authInfo.uid);

    if (playerId) {
      await userRef.update({
        oneSignalPlayerIds: FieldValue.arrayRemove(playerId),
        oneSignalUpdatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      await userRef.update({
        oneSignalPlayerIds: [],
        oneSignalUpdatedAt: FieldValue.serverTimestamp(),
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error in removeOneSignalPlayerId:", error);
    throw new HttpsError("internal", error.message);
  }
}

async function getNotificationStats_notification(request) {
  const data = request.data;
  const context = { auth: request.auth, rawRequest: request };
  const payload = data.data || data;
  const { userId } = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

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
          unread++;
          break;
        case NOTIFICATION_STATUS.PUSH_SENT_AND_READ:
          pushSent++;
          read++;
          break;
      }
    });

    return {
      success: true,
      stats: { total, unread, pushSent, read },
    };
  } catch (error) {
    console.error("Error in getNotificationStats:", error);
    throw new HttpsError("internal", error.message);
  }
}

async function markAllNotificationsAsRead_notification(request) {
  const data = request.data;
  const context = { auth: request.auth, rawRequest: request };

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
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
    return { success: true, count };
  } catch (error) {
    console.error("Error in markAllNotificationsAsRead:", error);
    throw new HttpsError("internal", error.message);
  }
}

async function canReceiveNotification_notification(request) {
  const data = request.data;
  const context = { auth: request.auth, rawRequest: request };
  const payload = data.data || data;
  const { userId, notificationType } = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  if (!userId || !notificationType) {
    throw new HttpsError("invalid-argument", "User ID and notification type are required");
  }

  try {
    const canReceive = !(await isSpamming(userId, notificationType));
    return { success: true, canReceive };
  } catch (error) {
    console.error("Error in canReceiveNotification:", error);
    throw new HttpsError("internal", error.message);
  }
}

async function deleteNotification_notification(request) {
  const data = request.data;
  const context = { auth: request.auth, rawRequest: request };
  const payload = data.data || data;
  const { notificationId } = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  if (!notificationId) {
    throw new HttpsError("invalid-argument", "Notification ID is required");
  }

  try {
    const notificationRef = db.collection("notifications").doc(notificationId);
    const notificationDoc = await notificationRef.get();

    if (!notificationDoc.exists) {
      throw new HttpsError("not-found", "Notification not found");
    }

    const notification = notificationDoc.data();

    if (notification.userId !== authInfo.uid && !authInfo.isAdmin) {
      throw new HttpsError("permission-denied", "Not authorized to delete this notification");
    }

    await notificationRef.delete();
    return { success: true };
  } catch (error) {
    console.error("Error in deleteNotification:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message);
  }
}

// ============================================================================
// SCHEDULED FUNCTIONS (separate from action router)
// ============================================================================

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
    return { success: true, count };
  } catch (error) {
    console.error("Error cleaning up expired notifications:", error);
    throw error;
  }
});

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
    return { success: true, count };
  } catch (error) {
    console.error("Error cleaning up notification frequency:", error);
    throw error;
  }
});

// ============================================================================
// TRANSPORT LAYER: SINGLE CONSOLIDATED ENTRYPOINT
// ============================================================================

exports.notificationAction = onCall(
  {
    memory: "256MiB",
    concurrency: 80,
    maxInstances: 50,
  },
  async (request) => {
    const { action } = request.data || {};

    if (!action) {
      throw new HttpsError("invalid-argument", "An action must be specified.");
    }

    try {
      switch (action) {
        case "createNotification":
          return await createNotification_notification(request);
        case "getUserNotifications":
          return await getUserNotifications_notification(request);
        case "markNotificationAsRead":
          return await markNotificationAsRead_notification(request);
        case "markNotificationAsPushSent":
          return await markNotificationAsPushSent_notification(request);
        case "getNotificationsForPush":
          return await getNotificationsForPush_notification(request);
        case "storeOneSignalPlayerId":
          return await storeOneSignalPlayerId_notification(request);
        case "removeOneSignalPlayerId":
          return await removeOneSignalPlayerId_notification(request);
        case "getNotificationStats":
          return await getNotificationStats_notification(request);
        case "markAllNotificationsAsRead":
          return await markAllNotificationsAsRead_notification(request);
        case "canReceiveNotification":
          return await canReceiveNotification_notification(request);
        case "deleteNotification":
          return await deleteNotification_notification(request);
        default:
          throw new HttpsError("invalid-argument", `Unknown action: ${action}`);
      }
    } catch (error) {
      console.error(`Error executing action [${action}]:`, error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError("internal", "Internal Server Error");
    }
  }
);

// Export helper functions and constants for use in other modules
exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
exports.USER_TYPES = USER_TYPES;
exports.NOTIFICATION_STATUS = NOTIFICATION_STATUS;
exports.generateNotificationHref = generateNotificationHref;
exports.isSpamming = isSpamming;
exports.updateNotificationFrequency = updateNotificationFrequency;
exports.sendOneSignalNotification = sendOneSignalNotification;