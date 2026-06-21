/**
 * Notification Management Cloud Functions
 *
 * This module handles all notification-related operations
 * Consolidated into a single entrypoint following the Firebase optimization guidelines
 */

const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {getFirestore} = require("../firebase-admin");
const {FieldValue} = require("firebase-admin/firestore");
const {sendEmail} = require("./utils/email");
const {buildEmailTemplate} = require("./utils/emailTemplate");

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

// OneSignal player ID validation (must be a valid UUID, rejects "local-" prefixed dev IDs)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate that a player ID is a proper UUID (not a local-development ID).
 * @param {string} playerId
 * @return {boolean}
 */
function isValidOneSignalPlayerId(playerId) {
  return typeof playerId === "string" && UUID_REGEX.test(playerId);
}

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
  NEW_ONLINE_PROJECT_REQUEST: "new_online_project_request",
  ONLINE_PROJECT_ACCEPTED: "online_project_accepted",
  ONLINE_PROJECT_DECLINED: "online_project_declined",
  ONLINE_PROJECT_COUNTER_OFFER: "online_project_counter_offer",
  ONLINE_PROJECT_CANCELLED: "online_project_cancelled",
  ONLINE_PROJECT_DISPUTED: "online_project_disputed",
  ONLINE_PROJECT_COMPLETED: "online_project_completed",
  DISPUTE_RESOLVED_FOR_CLIENT: "dispute_resolved_for_client",
  DISPUTE_RESOLVED_FOR_PROVIDER: "dispute_resolved_for_provider",
  DISPUTE_DISMISSED: "dispute_dismissed",
  DELIVERABLE_SUBMITTED: "deliverable_submitted",
  MILESTONE_APPROVED: "milestone_approved",
  REVISIONS_REQUESTED: "revisions_requested",
};

// Booking-related notification types that also trigger email delivery
const BOOKING_EMAIL_TYPES = new Set([
  NOTIFICATION_TYPES.BOOKING_ACCEPTED,
  NOTIFICATION_TYPES.BOOKING_DECLINED,
  NOTIFICATION_TYPES.NEW_BOOKING_REQUEST,
  NOTIFICATION_TYPES.BOOKING_CONFIRMATION,
  NOTIFICATION_TYPES.BOOKING_CANCELLED,
  NOTIFICATION_TYPES.BOOKING_COMPLETED,
  NOTIFICATION_TYPES.BOOKING_RESCHEDULED,
  NOTIFICATION_TYPES.SERVICE_RESCHEDULED,
  NOTIFICATION_TYPES.SERVICE_REMINDER,
  NOTIFICATION_TYPES.START_SERVICE,
  NOTIFICATION_TYPES.PAYMENT_RECEIVED,
  NOTIFICATION_TYPES.PAYMENT_FAILED,
  NOTIFICATION_TYPES.PAYMENT_ISSUE,
  NOTIFICATION_TYPES.BOOKING_AUTO_CANCELLED_NOT_CHOSEN,
  NOTIFICATION_TYPES.BOOKING_AUTO_CANCELLED_MISSED_SLOT,
  NOTIFICATION_TYPES.CLIENT_NO_SHOW,
  NOTIFICATION_TYPES.PROVIDER_ON_THE_WAY,
]);

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
 * Get authentication info from context and data
 * @param {Object} context The callable context
 * @param {Object} data The request data
 * @return {Object} Authentication info
 */
function getAuthInfo(context, data) {
  const auth = context.auth || data.auth;
  return {
    uid: auth?.uid || null,
    isAdmin: auth?.token?.isAdmin || false,
    hasAuth: !!auth,
  };
}

/**
 * Generate an href for a notification based on type and user type
 * @param {string} notificationType The type of notification
 * @param {string} userType The user type (client or provider)
 * @param {string} entityId The related entity ID
 * @return {string} The generated href path
 */
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
  case NOTIFICATION_TYPES.NEW_ONLINE_PROJECT_REQUEST:
    return `/provider/online-project/${entityId}`;
  case NOTIFICATION_TYPES.ONLINE_PROJECT_ACCEPTED:
    return isProvider ?
      `/provider/online-project/${entityId}` :
      `/client/online-project/${entityId}`;
  case NOTIFICATION_TYPES.ONLINE_PROJECT_DECLINED:
    return `/client/online-projects`;
  case NOTIFICATION_TYPES.ONLINE_PROJECT_COUNTER_OFFER:
    return `/client/online-project/${entityId}`;
  case NOTIFICATION_TYPES.DELIVERABLE_SUBMITTED:
    return `/client/online-project/${entityId}`;
  case NOTIFICATION_TYPES.MILESTONE_APPROVED:
    return `/provider/online-project/${entityId}`;
  case NOTIFICATION_TYPES.REVISIONS_REQUESTED:
    return `/provider/online-project/${entityId}`;
  case NOTIFICATION_TYPES.ONLINE_PROJECT_COMPLETED:
    return `/client/online-project/${entityId}`;
  case NOTIFICATION_TYPES.ONLINE_PROJECT_CANCELLED:
    return isProvider ? `/provider/online-projects` : `/client/online-projects`;
  case NOTIFICATION_TYPES.ONLINE_PROJECT_DISPUTED:
    return isProvider ?
      `/provider/online-project/${entityId}` :
      `/client/online-project/${entityId}`;
  case NOTIFICATION_TYPES.DISPUTE_RESOLVED_FOR_CLIENT:
    return isProvider ?
      `/provider/online-project/${entityId}` :
      `/client/online-project/${entityId}`;
  case NOTIFICATION_TYPES.DISPUTE_RESOLVED_FOR_PROVIDER:
    return isProvider ?
      `/provider/online-project/${entityId}` :
      `/client/online-project/${entityId}`;
  case NOTIFICATION_TYPES.DISPUTE_DISMISSED:
    return isProvider ?
      `/provider/online-project/${entityId}` :
      `/client/online-project/${entityId}`;
  default:
    return isProvider ? `/provider/booking/${entityId}` : `/client/booking/${entityId}`;
  }
}

/**
 * Check if a user is spamming notifications
 * @param {string} userId The user ID
 * @param {string} notificationType The notification type
 * @return {Promise<boolean>} Whether the user is spamming
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
 * Update the notification frequency tracker for a user
 * @param {string} userId The user ID
 * @param {string} notificationType The notification type
 * @return {Promise<void>}
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
  }
}

/**
 * Send a push notification via OneSignal
 * @param {string} userId The target user ID
 * @param {Object} notification The notification data
 * @return {Promise<void>}
 */
async function sendOneSignalNotification(userId, notification) {
  try {
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      console.log(`OneSignal: User ${userId} not found`);
      return false;
    }

    const userData = userDoc.data();
    const rawPlayerIds = userData.oneSignalPlayerIds || [];
    const playerIds = rawPlayerIds.filter(isValidOneSignalPlayerId);

    if (playerIds.length < rawPlayerIds.length) {
      const filtered = rawPlayerIds.length - playerIds.length;
      console.warn(
        `OneSignal: Filtered out ${filtered} invalid player ID(s) for user ${userId}`,
      );
    }

    if (playerIds.length === 0) {
      console.log(`OneSignal: User ${userId} has no valid registered player IDs`);
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
      headings: {en: notification.title},
      contents: {en: notification.message},
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

/**
 * Parse a date value assuming Philippine timezone (UTC+8) when no timezone is specified.
 * @param {string|Date|Object} value The date value from Firestore
 * @return {Date} A Date object in UTC representing the correct Philippine time
 */
function parsePhilippineDate(value) {
  if (!value) return null;
  let isoString =
    typeof value === "string" ?
      value :
      value.toDate ?
        value.toDate().toISOString() :
        value.toISOString ?
          value.toISOString() :
          String(value);

  // If the string lacks timezone info, append +08:00 (Asia/Manila)
  if (!isoString.match(/[Zz]|[+-]\d{2}:?\d{2}$/)) {
    isoString = isoString + "+08:00";
  }

  return new Date(isoString);
}

/**
 * Build booking details for email enrichment
 * Fetches related booking, service, packages, and contact info
 * @param {Object} notification The notification object
 * @return {Promise<Object|null>} Booking details or null
 */
async function buildBookingDetailsForEmail(notification) {
  const bookingId = notification.relatedEntityId;
  if (!bookingId) return null;

  try {
    const bookingDoc = await db.collection("bookings").doc(bookingId).get();
    if (!bookingDoc.exists) return null;
    const booking = bookingDoc.data();

    // Service name
    let serviceName = booking.serviceName || "Service";
    if (booking.serviceId) {
      try {
        const serviceDoc = await db.collection("services").doc(booking.serviceId).get();
        if (serviceDoc.exists) {
          serviceName = serviceDoc.data().title || serviceName;
        }
      } catch (e) {
        console.error("Error fetching service for email:", e);
      }
    }

    // Package names
    const packageNames = [];
    if (
      booking.servicePackageIds &&
      Array.isArray(booking.servicePackageIds) &&
      booking.servicePackageIds.length > 0
    ) {
      for (const packageId of booking.servicePackageIds) {
        try {
          const pkgDoc = await db.collection("service_packages").doc(packageId).get();
          if (pkgDoc.exists && pkgDoc.data().name) {
            packageNames.push(pkgDoc.data().name);
          }
        } catch (e) {
          console.error("Error fetching package for email:", e);
        }
      }
    }

    // Contact info of the OTHER party
    const recipientUserType = notification.userType;
    const otherUserId =
      recipientUserType === USER_TYPES.CLIENT ?
        booking.providerId :
        booking.clientId;
    let contactInfo = null;
    if (otherUserId) {
      try {
        const otherUserDoc = await db.collection("users").doc(otherUserId).get();
        if (otherUserDoc.exists) {
          const otherUser = otherUserDoc.data();
          contactInfo = {
            role: recipientUserType === USER_TYPES.CLIENT ? "Provider" : "Client",
            name: otherUser.name || "User",
            phone: otherUser.phone || null,
            email: otherUser.email || null,
          };
        }
      } catch (e) {
        console.error("Error fetching contact user for email:", e);
      }
    }

    // Location
    const location =
      typeof booking.location === "string" ?
        booking.location :
        booking.location?.address ||
          booking.location?.formattedAddress ||
          null;

    let mapsUrl = null;
    if (location) {
      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        location,
      )}`;
    }

    // Dates — parse with explicit Asia/Manila timezone handling
    let date = null;
    let timeRange = null;
    if (booking.requestedDate) {
      try {
        const requestedDate = parsePhilippineDate(booking.requestedDate);
        date = requestedDate.toLocaleDateString("en-PH", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          timeZone: "Asia/Manila",
        });
        if (booking.scheduledDate) {
          const scheduledDate = parsePhilippineDate(booking.scheduledDate);
          const startTime = requestedDate.toLocaleTimeString("en-PH", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Manila",
          });
          const endTime = scheduledDate.toLocaleTimeString("en-PH", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Manila",
          });
          timeRange = `${startTime} - ${endTime}`;
        }
      } catch (e) {
        console.error("Error formatting dates for email:", e);
      }
    }

    // Price
    let price = null;
    if (booking.price != null) {
      try {
        price = `₱${Number(booking.price).toLocaleString("en-PH", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      } catch (e) {
        price = `₱${booking.price}`;
      }
    }

    return {
      serviceName,
      packageNames,
      date,
      timeRange,
      location,
      mapsUrl,
      price,
      contactInfo,
    };
  } catch (error) {
    console.error("Error building booking details for email:", error);
    return null;
  }
}

/**
 * Send an email notification for a booking-related notification
 * Fetches the user's email from Firestore and sends a transactional email
 * Fails silently if the user has no email or if sending fails
 * @param {string} userId The target user ID
 * @param {Object} notification The notification object
 * @return {Promise<void>}
 */
async function sendEmailForNotification(userId, notification) {
  try {
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      console.log(`Email: User ${userId} not found, skipping notification email`);
      return;
    }

    const userData = userDoc.data();

    if (!userData.email) {
      console.log(`Email: User ${userId} has no email address, skipping`);
      return;
    }

    const bookingDetails = await buildBookingDetailsForEmail(notification);

    // For chat messages, fetch sender contact info to display in email
    let senderInfo = null;
    if (notification.notificationType === NOTIFICATION_TYPES.CHAT_MESSAGE) {
      const senderId = notification.metadata?.senderId;
      if (senderId) {
        try {
          const senderDoc = await db.collection("users").doc(senderId).get();
          if (senderDoc.exists) {
            const senderData = senderDoc.data();
            const senderRole =
              notification.userType === USER_TYPES.CLIENT ?
                "Provider" :
                "Client";
            senderInfo = {
              name: senderData.name || "User",
              phone: senderData.phone || null,
              role: senderRole,
            };
          }
        } catch (e) {
          console.error("Error fetching sender info for email:", e);
        }
      }
    }

    const {html, text} = buildEmailTemplate({
      name: userData.name || "User",
      title: notification.title,
      message: notification.message,
      href: notification.href || null,
      appBaseUrl: APP_BASE_URL,
      bookingDetails,
      senderInfo,
    });

    await sendEmail({
      to: userData.email,
      subject: notification.title,
      html,
      text,
    });
  } catch (error) {
    console.error(`Email: Failed to send notification email to user ${userId}:`, error);
  }
}

// ============================================================================
// SERVICE LAYER FUNCTIONS (INTERNAL)
// ============================================================================

/**
 * Create a new notification
 * @param {Object} request The callable request
 * @return {Promise<Object>}
 */
async function createNotification_notification(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
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

    let href = generateNotificationHref(notificationType, userType, relatedEntityId);
    if (metadata && metadata.customHref) {
      href = metadata.customHref;
    }

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

    if (BOOKING_EMAIL_TYPES.has(notificationType)) {
      sendEmailForNotification(targetUserId, notification).catch((error) => {
        console.error("Failed to send notification email:", error);
      });
    }

    return {success: true, notificationId: notificationRef.id};
  } catch (error) {
    console.error("Error in createNotification:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Get notifications for a user
 * @param {Object} request The callable request
 * @return {Promise<Object>}
 */
async function getUserNotifications_notification(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {userId, filter} = payload;

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

    return {success: true, notifications};
  } catch (error) {
    console.error("Error in getUserNotifications:", error);
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Mark a notification as read
 * @param {Object} request The callable request
 * @return {Promise<Object>}
 */
async function markNotificationAsRead_notification(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {notificationId} = payload;

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
        throw new HttpsError(
          "permission-denied",
          "You can only mark your own notifications as read",
        );
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

    return {success: true};
  } catch (error) {
    console.error("Error in markNotificationAsRead:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Mark a notification as push sent
 * @param {Object} request The callable request
 * @return {Promise<Object>}
 */
async function markNotificationAsPushSent_notification(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {notificationId} = payload;

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

    return {success: true};
  } catch (error) {
    console.error("Error in markNotificationAsPushSent:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Get notifications that need to be pushed
 * @param {Object} request The callable request
 * @return {Promise<Object>}
 */
async function getNotificationsForPush_notification(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {userId} = payload;

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

    return {success: true, notifications};
  } catch (error) {
    console.error("Error in getNotificationsForPush:", error);
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Store a OneSignal player ID for a user
 * @param {Object} request The callable request
 * @return {Promise<Object>}
 */
async function storeOneSignalPlayerId_notification(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {playerId} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  if (!playerId) {
    throw new HttpsError("invalid-argument", "Player ID is required");
  }

  if (!isValidOneSignalPlayerId(playerId)) {
    console.warn(`OneSignal: Rejecting invalid player ID format: ${playerId}`);
    throw new HttpsError("invalid-argument", "Player ID is not a valid UUID");
  }

  try {
    const userRef = db.collection("users").doc(authInfo.uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      await userRef.set({
        oneSignalPlayerIds: [playerId],
        oneSignalUpdatedAt: FieldValue.serverTimestamp(),
      }, {merge: true});
    } else {
      const existingPlayerIds = userDoc.data().oneSignalPlayerIds || [];

      if (existingPlayerIds.includes(playerId)) {
        return {success: true, message: "Player ID already registered"};
      }

      await userRef.update({
        oneSignalPlayerIds: FieldValue.arrayUnion(playerId),
        oneSignalUpdatedAt: FieldValue.serverTimestamp(),
      });
    }

    return {success: true};
  } catch (error) {
    console.error("Error in storeOneSignalPlayerId:", error);
    if (error.code === "not-found") {
      try {
        await db.collection("users").doc(authInfo.uid).set({
          oneSignalPlayerIds: [playerId],
          oneSignalUpdatedAt: FieldValue.serverTimestamp(),
        }, {merge: true});
        return {success: true};
      } catch (createError) {
        console.error("Error creating user document:", createError);
        throw new HttpsError("internal", createError.message);
      }
    }
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Remove a OneSignal player ID for a user
 * @param {Object} request The callable request
 * @return {Promise<Object>}
 */
async function removeOneSignalPlayerId_notification(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {playerId} = payload;

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

    return {success: true};
  } catch (error) {
    console.error("Error in removeOneSignalPlayerId:", error);
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Get notification statistics for a user
 * @param {Object} request The callable request
 * @return {Promise<Object>}
 */
async function getNotificationStats_notification(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {userId} = payload;

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
      stats: {total, unread, pushSent, read},
    };
  } catch (error) {
    console.error("Error in getNotificationStats:", error);
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Mark all notifications as read for a user
 * @param {Object} request The callable request
 * @return {Promise<Object>}
 */
async function markAllNotificationsAsRead_notification(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};

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
    return {success: true, count};
  } catch (error) {
    console.error("Error in markAllNotificationsAsRead:", error);
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Check if a user can receive a notification type
 * @param {Object} request The callable request
 * @return {Promise<Object>}
 */
async function canReceiveNotification_notification(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {userId, notificationType} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  if (!userId || !notificationType) {
    throw new HttpsError("invalid-argument", "User ID and notification type are required");
  }

  try {
    const canReceive = !(await isSpamming(userId, notificationType));
    return {success: true, canReceive};
  } catch (error) {
    console.error("Error in canReceiveNotification:", error);
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Delete a notification
 * @param {Object} request The callable request
 * @return {Promise<Object>}
 */
async function deleteNotification_notification(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {notificationId} = payload;

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
    return {success: true};
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
    return {success: true, count};
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
    return {success: true, count};
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
  },
  async (request) => {
    const {action} = request.data || {};

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
  },
);

// Export helper functions and constants for use in other modules
exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
exports.USER_TYPES = USER_TYPES;
exports.NOTIFICATION_STATUS = NOTIFICATION_STATUS;
exports.generateNotificationHref = generateNotificationHref;
exports.isSpamming = isSpamming;
exports.updateNotificationFrequency = updateNotificationFrequency;
exports.sendOneSignalNotification = sendOneSignalNotification;
exports.sendEmailForNotification = sendEmailForNotification;
exports.BOOKING_EMAIL_TYPES = BOOKING_EMAIL_TYPES;
