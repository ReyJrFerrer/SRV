const functions = require("firebase-functions");
const admin = require("firebase-admin");

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
    return await db.runTransaction(async (transaction) => {
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
      };
    });
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
 */
exports.getMyConversations = functions.https.onCall(async (data, context) => {
  // Authentication
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  const userId = authInfo.uid;

  try {
    // Find all conversations where user is either client or provider
    const clientConversationsSnapshot = await db
      .collection("conversations")
      .where("clientId", "==", userId)
      .get();

    const providerConversationsSnapshot = await db
      .collection("conversations")
      .where("providerId", "==", userId)
      .get();

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
    // Verify user is part of conversation
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
    if (
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
    // Use transaction for atomic update
    return await db.runTransaction(async (transaction) => {
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

      // Mark all messages as read for this user
      const now = new Date().toISOString();
      const messagesSnapshot = await db
        .collection("messages")
        .where("conversationId", "==", conversationId)
        .where("receiverId", "==", userId)
        .where("readAt", "==", [])
        .get();

      messagesSnapshot.forEach((doc) => {
        transaction.update(doc.ref, {
          status: {Read: null}, // Update status to Read
          readAt: [now], // Array with timestamp mirrors Motoko's optional
        });
      });

      return {
        success: true,
        data: true,
      };
    });
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
