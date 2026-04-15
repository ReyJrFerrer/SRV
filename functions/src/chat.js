const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const {FieldValue} = require("firebase-admin/firestore");
const {
  NOTIFICATION_TYPES,
  USER_TYPES,
  generateNotificationHref,
  sendOneSignalNotification,
} = require("./notification");

const db = admin.firestore();

/**
 * Generates a unique ID based on timestamp and random string.
 * @return {string} Unique identifier
 */
function generateId() {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

/**
 * Triggered when a new message is created.
 * Creates an in-app notification and sends a push notification.
 */
exports.onMessageCreated = onDocumentCreated(
  "messages/{messageId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const message = snap.data();
    const {conversationId, senderId, receiverId, content} = message;

    if (!content || !content.encryptedText) return;

    try {
      const senderDoc = await db.collection("users").doc(senderId).get();
      const receiverDoc = await db.collection("users").doc(receiverId).get();
      const conversationDoc = await db
        .collection("conversations")
        .doc(conversationId)
        .get();

      if (senderDoc.exists && receiverDoc.exists && conversationDoc.exists) {
        const senderData = senderDoc.data();
        const conversation = conversationDoc.data();

        // Determine user types based on conversation roles
        const receiverUserType =
          receiverId === conversation.clientId ?
            USER_TYPES.CLIENT :
            USER_TYPES.PROVIDER;

        const senderName =
          senderData.displayName || senderData.name || "Someone";
        const textContent = content.encryptedText;
        const messagePreview =
          textContent.trim().substring(0, 50) +
          (textContent.length > 50 ? "..." : "");

        // Create notification in Firestore
        const notificationId = generateId();
        const notificationData = {
          id: notificationId,
          userId: receiverId,
          userType: receiverUserType,
          notificationType: NOTIFICATION_TYPES.CHAT_MESSAGE,
          title: `New message from ${senderName}`,
          message: messagePreview,
          href: generateNotificationHref(
            NOTIFICATION_TYPES.CHAT_MESSAGE,
            receiverUserType,
            conversationId,
          ),
          relatedEntityId: conversationId,
          status: "unread",
          createdAt: FieldValue.serverTimestamp(),
          metadata: {
            senderId: senderId,
            senderName: senderName,
            conversationId: conversationId,
            messageId: snap.id,
          },
        };

        await db
          .collection("notifications")
          .doc(notificationId)
          .set(notificationData);

        console.log(`Chat notification created in Firestore:`, {
          notificationId,
          userId: receiverId,
          userType: receiverUserType,
          type: NOTIFICATION_TYPES.CHAT_MESSAGE,
          title: notificationData.title,
        });

        // Send OneSignal push notification (non-blocking)
        sendOneSignalNotification(receiverId, notificationData).catch(
          (error) => {
            console.error(
              "Failed to send OneSignal notification for chat message:",
              error,
            );
          },
        );

        console.log(
          `Chat notification created and push initiated for ${receiverId}`,
        );
      }
    } catch (notificationError) {
      console.error("Error creating chat notification:", notificationError);
    }
  },
);
