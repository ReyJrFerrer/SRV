const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {getFirestore} = require("../firebase-admin");
const {FieldValue} = require("firebase-admin/firestore");
const {
  NOTIFICATION_TYPES,
  USER_TYPES,
  generateNotificationHref,
  sendOneSignalNotification,
  sendEmailForNotification,
} = require("./notification");

const db = getFirestore();

const CHAT_EMAIL_COOLDOWN_MS = 60 * 60 * 1000;

/**
 * Generates a unique ID based on timestamp and random string.
 * @return {string} Unique identifier
 */
function generateId() {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

/**
 * Checks whether a chat email notification can be sent for a given
 * receiver+conversation pair. Returns true if at least one hour has
 * elapsed since the last email for that pair, and atomically updates
 * the cooldown timestamp.
 * @param {string} receiverId The receiving user's ID
 * @param {string} conversationId The conversation ID
 * @return {Promise<boolean>} Whether the email may be sent
 */
async function canSendChatEmail(receiverId, conversationId) {
  const cooldownKey = `${receiverId}_${conversationId}`;
  const cooldownRef = db.collection("chatEmailCooldowns").doc(cooldownKey);
  const now = Date.now();

  try {
    let allowed = false;

    await db.runTransaction(async (transaction) => {
      const cooldownDoc = await transaction.get(cooldownRef);

      if (!cooldownDoc.exists) {
        transaction.set(cooldownRef, {
          receiverId,
          conversationId,
          lastEmailSentAt: FieldValue.serverTimestamp(),
        });
        allowed = true;
        return;
      }

      const data = cooldownDoc.data();
      const lastSent = data.lastEmailSentAt?.toMillis?.() ?? 0;

      if (now - lastSent >= CHAT_EMAIL_COOLDOWN_MS) {
        transaction.update(cooldownRef, {
          lastEmailSentAt: FieldValue.serverTimestamp(),
        });
        allowed = true;
      }
    });

    return allowed;
  } catch (error) {
    console.error("Error checking chat email cooldown:", error);
    return false;
  }
}

/**
 * Triggered when a new message is created.
 * Creates an in-app notification and sends a push notification.
 */
exports.onMessageCreated = onDocumentCreated(
  {document: "messages/{messageId}", database: "srvefirestore"},
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const message = snap.data();
    const {conversationId, senderId, receiverId, content} = message;
    const hasAttachment =
      Array.isArray(message.attachment) && message.attachment.length > 0;

    if ((!content || !content.encryptedText) && !hasAttachment) return;

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
        let messagePreview;
        if (content && content.encryptedText) {
          const textContent = content.encryptedText;
          messagePreview =
            textContent.trim().substring(0, 50) +
            (textContent.length > 50 ? "..." : "");
        } else if (hasAttachment) {
          const att = message.attachment[0];
          const fileType = att?.fileType || "";
          if (fileType.startsWith("image/")) messagePreview = "📷 Photo";
          else if (fileType.startsWith("video/")) messagePreview = "🎥 Video";
          else if (fileType === "application/pdf") messagePreview = "📄 PDF";
          else messagePreview = `📎 ${att?.fileName || "Attachment"}`;
        } else {
          messagePreview = "New message";
        }

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

        // Send email notification (non-blocking, rate-limited to 1 per hour per conversation)
        canSendChatEmail(receiverId, conversationId).then((allowed) => {
          if (!allowed) {
            console.log(
              `Chat email skipped for ${receiverId} (conversation ${conversationId}): 
              cooldown active`,
            );
            return;
          }
          sendEmailForNotification(receiverId, notificationData).catch(
            (error) => {
              console.error(
                "Failed to send email notification for chat message:",
                error,
              );
            },
          );
        }).catch((error) => {
          console.error(
            "Failed to check chat email cooldown:",
            error,
          );
        });

        console.log(
          `Chat notification created and push/email initiated for ${receiverId}`,
        );
      }
    } catch (notificationError) {
      console.error("Error creating chat notification:", notificationError);
    }
  },
);
