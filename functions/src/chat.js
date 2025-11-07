const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {
  NOTIFICATION_TYPES,
  USER_TYPES,
  generateNotificationHref,
  sendOneSignalNotification,
} = require("./notification");

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

/**
 * Generate a unique ID for conversations and messages
 * @return {string} Unique ID
 */
function generateId() {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

/**
 * Create a new conversation (called after booking completion)
 * Mirrors: createConversation(clientId: Principal, providerId: Principal)
 */
exports.createConversation = functions.https.onCall(async (data, context) => {
  // Extract payload
  const payload = data.data || data;
  const {clientId, providerId} = payload;

  // Authentication
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  // Validation (mirror Motoko validation)
  if (!clientId || !providerId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Both clientId and providerId are required",
    );
  }

  if (clientId === providerId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Cannot create conversation with yourself",
    );
  }

  try {
    const conversationId = generateId();
    const now = new Date().toISOString();

    // Check if conversation already exists between these users
    const existingConversations = await db
      .collection("conversations")
      .where("clientId", "==", clientId)
      .where("providerId", "==", providerId)
      .where("isActive", "==", true)
      .get();

    if (!existingConversations.empty) {
      // Return existing conversation
      const existing = existingConversations.docs[0];
      return {
        success: true,
        data: {
          id: existing.id,
          ...existing.data(),
          createdAt: existing.data().createdAt,
          lastMessageAt: existing.data().lastMessageAt || null,
        },
      };
    }

    // Create new conversation
    const newConversation = {
      id: conversationId,
      clientId: clientId,
      providerId: providerId,
      createdAt: now,
      lastMessageAt: null,
      isActive: true,
      unreadCount: {
        [clientId]: 0,
        [providerId]: 0,
      },
    };

    await db.collection("conversations").doc(conversationId).set(newConversation);

    return {
      success: true,
      data: newConversation,
    };
  } catch (error) {
    console.error("Error creating conversation:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Send a message in a conversation
 * Mirrors: sendMessage(conversationId: Text, receiverId: Principal, content: Text)
 */
exports.sendMessage = functions.https.onCall(async (data, context) => {
  // Extract payload
  const payload = data.data || data;
  const {conversationId, receiverId, content} = payload;

  // Authentication
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  const senderId = authInfo.uid;

  // Validation (mirror Motoko validation)
  if (!conversationId || !receiverId || !content) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "conversationId, receiverId, and content are required",
    );
  }

  if (content.length > 500) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Message cannot exceed 500 characters",
    );
  }

  if (content.trim().length === 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Message cannot be empty",
    );
  }

  if (senderId === receiverId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Cannot send message to yourself",
    );
  }

  try {
    // Use Firestore transaction for atomic updates
    const result = await db.runTransaction(async (transaction) => {
      const conversationRef = db.collection("conversations").doc(conversationId);
      const conversationDoc = await transaction.get(conversationRef);

      if (!conversationDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "Conversation not found",
        );
      }

      const conversation = conversationDoc.data();

      // Verify conversation is active
      if (!conversation.isActive) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Conversation is not active",
        );
      }

      // Verify sender is part of conversation
      if (
        senderId !== conversation.clientId &&
        senderId !== conversation.providerId
      ) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Unauthorized to send message in this conversation",
        );
      }

      // Verify receiver is part of conversation
      if (
        receiverId !== conversation.clientId &&
        receiverId !== conversation.providerId
      ) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Receiver not part of this conversation",
        );
      }

      const messageId = generateId();
      const now = new Date().toISOString();

      // Create message document
      const newMessage = {
        id: messageId,
        conversationId: conversationId,
        senderId: senderId,
        receiverId: receiverId,
        messageType: {Text: null}, // Mirror Motoko variant structure
        content: {
          encryptedText: content.trim(), // Not actually encrypted for now
          encryptionKey: "", // Placeholder for future encryption
        },
        attachment: [], // Empty array mirrors Motoko's null
        status: {Sent: null}, // Mirror Motoko variant structure
        createdAt: now,
        readAt: [], // Empty array mirrors Motoko's null
      };

      const messageRef = db.collection("messages").doc(messageId);
      transaction.set(messageRef, newMessage);

      // Update conversation
      const updatedUnreadCount = {...conversation.unreadCount};
      updatedUnreadCount[receiverId] = (updatedUnreadCount[receiverId] || 0) + 1;

      transaction.update(conversationRef, {
        lastMessageAt: now,
        unreadCount: updatedUnreadCount,
      });

      return {
        success: true,
        data: newMessage,
        conversation: conversation,
      };
    });

    // After transaction, create and send notification
    // Determine sender and receiver names and user types
    try {
      const senderDoc = await db.collection("users").doc(senderId).get();
      const receiverDoc = await db.collection("users").doc(receiverId).get();

      if (senderDoc.exists && receiverDoc.exists) {
        const senderData = senderDoc.data();
        const conversation = result.conversation;

        // Determine user types based on conversation roles
        const receiverUserType =
          receiverId === conversation.clientId ?
            USER_TYPES.CLIENT :
            USER_TYPES.PROVIDER;

        const senderName = senderData.displayName || senderData.name || "Someone";
        const messagePreview = content.trim().substring(0, 50) +
          (content.length > 50 ? "..." : "");

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
          createdAt: new Date(),
          metadata: {
            senderId: senderId,
            senderName: senderName,
            conversationId: conversationId,
            messageId: result.data.id,
          },
        };

        await db.collection("notifications").doc(notificationId).set(notificationData);

        // Send OneSignal push notification (non-blocking)
        sendOneSignalNotification(receiverId, notificationData).catch((error) => {
          console.error("Failed to send OneSignal notification for chat message:", error);
        });

        console.log(`Chat notification created and sent to ${receiverId}`);
      }
    } catch (notificationError) {
      // Don't fail the message send if notification fails
      console.error("Error creating chat notification:", notificationError);
    }

    return {
      success: result.success,
      data: result.data,
    };
  } catch (error) {
    console.error("Error sending message:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get all conversations for the current user
 * Mirrors: getMyConversations()
 * Admin override: If userId is provided in data and user is admin, use that userId
 */
exports.getMyConversations = functions.https.onCall(async (data, context) => {
  // Extract payload
  const payload = data.data || data;
  const {userId: requestedUserId} = payload;

  // Authentication
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  // Use requested userId if admin, otherwise use authenticated user's ID
  const userId = (authInfo.isAdmin && requestedUserId) ? requestedUserId : authInfo.uid;

  // Log for debugging admin queries
  if (authInfo.isAdmin && requestedUserId) {
    console.log(`[getMyConversations] Admin query for userId: ${userId}`);
  }

  try {
    // Find all conversations where user is either client or provider
    const clientConversationsSnapshot = await db
      .collection("conversations")
      .where("clientId", "==", userId)
      .where("isActive", "==", true)
      .get();

    const providerConversationsSnapshot = await db
      .collection("conversations")
      .where("providerId", "==", userId)
      .where("isActive", "==", true)
      .get();

    console.log(`[getMyConversations] Found ${clientConversationsSnapshot.size} 
      client conversations and ${providerConversationsSnapshot.size} 
      provider conversations for userId: ${userId}`);

    // Combine and deduplicate conversations
    const conversationMap = new Map();

    clientConversationsSnapshot.forEach((doc) => {
      conversationMap.set(doc.id, {id: doc.id, ...doc.data()});
    });

    providerConversationsSnapshot.forEach((doc) => {
      conversationMap.set(doc.id, {id: doc.id, ...doc.data()});
    });

    // Fetch last message for each conversation
    const conversationSummaries = await Promise.all(
      Array.from(conversationMap.values()).map(async (conversation) => {
        // Get last message
        const messagesSnapshot = await db
          .collection("messages")
          .where("conversationId", "==", conversation.id)
          .orderBy("createdAt", "desc")
          .limit(1)
          .get();

        const lastMessage = messagesSnapshot.empty ?
          [] :
          [{id: messagesSnapshot.docs[0].id, ...messagesSnapshot.docs[0].data()}];

        return {
          conversation: conversation,
          lastMessage: lastMessage, // Array mirrors Motoko's optional
        };
      }),
    );

    // Sort by last message time (most recent first)
    conversationSummaries.sort((a, b) => {
      const timeA = a.conversation.lastMessageAt || a.conversation.createdAt;
      const timeB = b.conversation.lastMessageAt || b.conversation.createdAt;
      return new Date(timeB) - new Date(timeA);
    });

    return {
      success: true,
      data: conversationSummaries,
    };
  } catch (error) {
    console.error("Error fetching conversations:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get messages for a specific conversation with pagination
 * Mirrors: getConversationMessages(conversationId: Text, limit: Nat, offset: Nat)
 */
exports.getConversationMessages = functions.https.onCall(async (data, context) => {
  // Extract payload
  const payload = data.data || data;
  const {conversationId, limit = 20, offset = 0} = payload;

  // Authentication
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  const userId = authInfo.uid;

  // Validation
  if (!conversationId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "conversationId is required",
    );
  }

  try {
    // Verify user is part of conversation (unless admin)
    const conversationDoc = await db
      .collection("conversations")
      .doc(conversationId)
      .get();

    if (!conversationDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Conversation not found",
      );
    }

    const conversation = conversationDoc.data();
    // Admin can view any conversation, otherwise check if user is part of conversation
    if (
      !authInfo.isAdmin &&
      userId !== conversation.clientId &&
      userId !== conversation.providerId
    ) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Unauthorized to view this conversation",
      );
    }

    // Fetch messages with pagination
    // Order by createdAt descending to get most recent first
    const messagesSnapshot = await db
      .collection("messages")
      .where("conversationId", "==", conversationId)
      .orderBy("createdAt", "desc")
      .limit(limit + 1) // Fetch one extra to check if there are more
      .offset(offset)
      .get();

    const hasMore = messagesSnapshot.docs.length > limit;
    const messages = messagesSnapshot.docs
      .slice(0, limit)
      .map((doc) => ({id: doc.id, ...doc.data()}));

    // Reverse to get chronological order (oldest first)
    messages.reverse();

    const nextPageToken = hasMore ? [(offset + limit).toString()] : [];

    return {
      success: true,
      data: {
        messages: messages,
        hasMore: hasMore,
        nextPageToken: nextPageToken, // Array mirrors Motoko's optional
      },
    };
  } catch (error) {
    console.error("Error fetching conversation messages:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Mark all messages in a conversation as read
 * Mirrors: markMessagesAsRead(conversationId: Text)
 */
exports.markMessagesAsRead = functions.https.onCall(async (data, context) => {
  // Extract payload
  const payload = data.data || data;
  const {conversationId} = payload;

  // Authentication
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  const userId = authInfo.uid;

  // Validation
  if (!conversationId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "conversationId is required",
    );
  }

  try {
    // Step 1: Atomically update the unread count in a transaction.
    // This is a quick operation to avoid lock contention.
    await db.runTransaction(async (transaction) => {
      const conversationRef = db.collection("conversations").doc(conversationId);
      const conversationDoc = await transaction.get(conversationRef);

      if (!conversationDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "Conversation not found",
        );
      }

      const conversation = conversationDoc.data();

      // Verify user is part of conversation
      if (
        userId !== conversation.clientId &&
        userId !== conversation.providerId
      ) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Unauthorized to mark messages in this conversation",
        );
      }

      // Reset unread count for the current user
      const updatedUnreadCount = {...conversation.unreadCount};
      updatedUnreadCount[userId] = 0;

      transaction.update(conversationRef, {
        unreadCount: updatedUnreadCount,
      });
    });

    // Step 2: Update all messages outside the transaction using a batched write.
    // This is much more efficient for bulk updates and avoids timeouts.
    const messagesSnapshot = await db
      .collection("messages")
      .where("conversationId", "==", conversationId)
      .where("receiverId", "==", userId)
      .where("readAt", "==", [])
      .get();

    if (!messagesSnapshot.empty) {
      const batch = db.batch();
      const now = new Date().toISOString();
      messagesSnapshot.forEach((doc) => {
        batch.update(doc.ref, {
          status: {Read: null},
          readAt: [now],
        });
      });
      await batch.commit();
    }

    return {success: true, data: true};
  } catch (error) {
    console.error("Error marking messages as read:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get a specific conversation by ID
 * Mirrors: getConversation(conversationId: Text)
 */
exports.getConversation = functions.https.onCall(async (data, context) => {
  // Extract payload
  const payload = data.data || data;
  const {conversationId} = payload;

  // Authentication
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  const userId = authInfo.uid;

  // Validation
  if (!conversationId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "conversationId is required",
    );
  }

  try {
    const conversationDoc = await db
      .collection("conversations")
      .doc(conversationId)
      .get();

    if (!conversationDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Conversation not found",
      );
    }

    const conversation = conversationDoc.data();

    // Verify user is part of conversation
    if (
      userId !== conversation.clientId &&
      userId !== conversation.providerId
    ) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Unauthorized to view this conversation",
      );
    }

    return {
      success: true,
      data: {
        id: conversationDoc.id,
        ...conversation,
      },
    };
  } catch (error) {
    console.error("Error fetching conversation:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", error.message);
  }
});
