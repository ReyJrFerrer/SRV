// Chat Service (Firebase Cloud Functions & Firestore Real-time)
import { getFirebaseFirestore } from "./firebaseApp";
import {
  collection,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  onSnapshot,
  Unsubscribe,
  doc,
  getDoc,
  getDocs,
  setDoc,
  runTransaction,
  writeBatch,
} from "firebase/firestore";

// Get Firebase instances using proper helpers
const getDb = () => getFirebaseFirestore();

// Custom type for async unsubscribe functions
export type AsyncUnsubscribe = () => Promise<void>;

// Listener state management to prevent overlapping subscriptions
const activeListeners = new Map<
  string,
  {
    unsubscribe: Unsubscribe;
    isTerminating: boolean;
  }
>();

// Helper to safely unsubscribe a listener
const safeUnsubscribe = async (
  listenerId: string,
  delayMs: number = 100,
): Promise<void> => {
  const listener = activeListeners.get(listenerId);
  if (!listener) return;

  if (listener.isTerminating) {
    return;
  }

  listener.isTerminating = true;

  return new Promise((resolve) => {
    setTimeout(() => {
      try {
        listener.unsubscribe();
        activeListeners.delete(listenerId);
      } catch (error) {}
      resolve();
    }, delayMs);
  });
};

// Frontend-compatible interfaces
export interface FrontendMessage {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  messageType: "Text" | "File";
  content: {
    encryptedText: string;
    encryptionKey: string;
  };
  attachment?: {
    fileName: string;
    fileSize: number;
    fileType: string;
    fileUrl: string;
  };
  status: "Sent" | "Delivered" | "Read";
  createdAt: string;
  readAt?: string;
}

export interface FrontendConversation {
  id: string;
  clientId: string;
  providerId: string;
  createdAt: string;
  lastMessageAt?: string;
  isActive: boolean;
  unreadCount: { [userId: string]: number };
  lastMessagePreview?: {
    id: string;
    content: string;
    senderId: string;
    messageType: "Text" | "File";
    createdAt: string;
  };
}

export interface FrontendConversationSummary {
  conversation: FrontendConversation;
  lastMessage?: FrontendMessage[];
}

export interface FrontendMessagePage {
  messages: FrontendMessage[];
  hasMore: boolean;
  nextPageToken?: string;
}

// Helper function to adapt backend message format to frontend format
const adaptBackendMessage = (backendMessage: any): FrontendMessage => {
  const getMessageType = (type: any): "Text" | "File" => {
    if (type?.Text !== undefined) return "Text";
    if (type?.File !== undefined) return "File";
    if (typeof type === "string") return type as "Text" | "File";
    return "Text";
  };

  const getMessageStatus = (status: any): "Sent" | "Delivered" | "Read" => {
    if (status?.Sent !== undefined) return "Sent";
    if (status?.Delivered !== undefined) return "Delivered";
    if (status?.Read !== undefined) return "Read";
    if (typeof status === "string")
      return status as "Sent" | "Delivered" | "Read";
    return "Sent";
  };

  return {
    id: backendMessage.id,
    conversationId: backendMessage.conversationId,
    senderId: backendMessage.senderId,
    receiverId: backendMessage.receiverId,
    messageType: getMessageType(backendMessage.messageType),
    content: {
      encryptedText:
        backendMessage.content?.encryptedText ||
        (typeof backendMessage.content === "string"
          ? backendMessage.content
          : ""),
      encryptionKey: backendMessage.content?.encryptionKey || "",
    },
    attachment:
      backendMessage.attachment && backendMessage.attachment.length > 0
        ? {
            fileName: backendMessage.attachment[0].fileName,
            fileSize: Number(backendMessage.attachment[0].fileSize),
            fileType: backendMessage.attachment[0].fileType,
            fileUrl: backendMessage.attachment[0].fileUrl,
          }
        : undefined,
    status: getMessageStatus(backendMessage.status),
    createdAt: backendMessage.createdAt,
    readAt:
      backendMessage.readAt && backendMessage.readAt.length > 0
        ? backendMessage.readAt[0]
        : undefined,
  };
};

// Helper function to adapt backend conversation format to frontend format
const adaptBackendConversation = (
  backendConversation: any,
): FrontendConversation => {
  return {
    id: backendConversation.id,
    clientId: backendConversation.clientId,
    providerId: backendConversation.providerId,
    createdAt: backendConversation.createdAt,
    lastMessageAt: backendConversation.lastMessageAt || undefined,
    isActive: backendConversation.isActive,
    unreadCount: backendConversation.unreadCount || {},
    lastMessagePreview: backendConversation.lastMessagePreview,
  };
};

// Helper function to adapt backend conversation summary
const adaptBackendConversationSummary = (
  backendSummary: any,
): FrontendConversationSummary => {
  const adapted = {
    conversation: adaptBackendConversation(backendSummary.conversation),
    lastMessage:
      backendSummary.lastMessage &&
      Array.isArray(backendSummary.lastMessage) &&
      backendSummary.lastMessage.length > 0
        ? backendSummary.lastMessage.map(adaptBackendMessage).filter(Boolean)
        : backendSummary.conversation?.lastMessagePreview
          ? [
              {
                id:
                  backendSummary.conversation.lastMessagePreview.id ||
                  "preview",
                conversationId: backendSummary.conversation.id,
                senderId:
                  backendSummary.conversation.lastMessagePreview.senderId,
                receiverId: "", // Not needed for preview
                messageType:
                  backendSummary.conversation.lastMessagePreview.messageType,
                content: {
                  encryptedText:
                    backendSummary.conversation.lastMessagePreview.content,
                  encryptionKey: "",
                },
                status: "Sent", // Default
                createdAt:
                  backendSummary.conversation.lastMessagePreview.createdAt,
              } as FrontendMessage,
            ]
          : undefined,
  };
  return adapted;
};

// Debounce helper function
function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

// Chat Service Functions
export const chatCanisterService = {
  /**
   * Create a new conversation
   */
  async createConversation(
    clientId: string,
    providerId: string,
  ): Promise<FrontendConversation | null> {
    try {
      const db = getDb();

      const existingQuery = query(
        collection(db, "conversations"),
        where("clientId", "==", clientId),
        where("providerId", "==", providerId),
        where("isActive", "==", true),
      );

      const existingConversations = await getDocs(existingQuery);
      if (!existingConversations.empty) {
        const existing = existingConversations.docs[0];
        return adaptBackendConversation({
          id: existing.id,
          ...existing.data(),
        });
      }

      const id =
        Date.now().toString() + Math.random().toString(36).substring(2, 9);
      const now = new Date().toISOString();
      const newConversation = {
        id,
        clientId,
        providerId,
        createdAt: now,
        lastMessageAt: null,
        isActive: true,
        unreadCount: {
          [clientId]: 0,
          [providerId]: 0,
        },
      };

      await setDoc(doc(db, "conversations", id), newConversation);
      return adaptBackendConversation(newConversation);
    } catch (error) {
      throw new Error(`Failed to create conversation: ${error}`);
    }
  },

  /**
   * Send a message in a conversation
   */
  async sendMessage(
    conversationId: string,
    receiverId: string,
    content: string,
    senderId: string,
  ): Promise<FrontendMessage | null> {
    try {
      if (content.length > 500) {
        throw new Error("Message cannot exceed 500 characters");
      }

      if (content.trim().length === 0) {
        throw new Error("Message cannot be empty");
      }

      const db = getDb();
      const messageId =
        Date.now().toString() + Math.random().toString(36).substring(2, 9);
      const now = new Date().toISOString();

      const newMessage = {
        id: messageId,
        conversationId,
        senderId,
        receiverId,
        participants: [senderId, receiverId],
        messageType: { Text: null },
        content: {
          encryptedText: content.trim(),
          encryptionKey: "",
        },
        attachment: [],
        status: { Sent: null },
        createdAt: now,
        readAt: [],
      };

      await runTransaction(db, async (transaction) => {
        const convRef = doc(db, "conversations", conversationId);
        const convDoc = await transaction.get(convRef);
        if (!convDoc.exists()) {
          throw new Error("Conversation not found");
        }

        const convData = convDoc.data();
        const updatedUnreadCount = { ...convData.unreadCount };
        updatedUnreadCount[receiverId] =
          (updatedUnreadCount[receiverId] || 0) + 1;

        transaction.update(convRef, {
          lastMessageAt: now,
          unreadCount: updatedUnreadCount,
          lastMessagePreview: {
            id: messageId,
            content: content.trim(),
            senderId,
            messageType: "Text",
            createdAt: now,
          },
        });

        const messageRef = doc(db, "messages", messageId);
        transaction.set(messageRef, newMessage);
      });

      return adaptBackendMessage(newMessage);
    } catch (error) {
      throw new Error(`Failed to send message: ${error}`);
    }
  },

  /**
   * Get all conversations for the current user
   */
  async getMyConversations(
    userId: string,
  ): Promise<FrontendConversationSummary[]> {
    try {
      const db = getDb();
      const clientQuery = query(
        collection(db, "conversations"),
        where("clientId", "==", userId),
        where("isActive", "==", true),
      );
      const providerQuery = query(
        collection(db, "conversations"),
        where("providerId", "==", userId),
        where("isActive", "==", true),
      );

      const [clientSnap, providerSnap] = await Promise.all([
        getDocs(clientQuery),
        getDocs(providerQuery),
      ]);
      const conversations = new Map();

      clientSnap.forEach((doc) =>
        conversations.set(doc.id, { id: doc.id, ...doc.data() }),
      );
      providerSnap.forEach((doc) =>
        conversations.set(doc.id, { id: doc.id, ...doc.data() }),
      );

      const summaries = Array.from(conversations.values()).map((conv) =>
        adaptBackendConversationSummary({
          conversation: conv,
          lastMessage: [],
        }),
      );

      summaries.sort((a, b) => {
        const timeA = a.conversation.lastMessageAt || a.conversation.createdAt;
        const timeB = b.conversation.lastMessageAt || b.conversation.createdAt;
        return new Date(timeB).getTime() - new Date(timeA).getTime();
      });

      return summaries;
    } catch (error) {
      console.error("Failed to get my conversations:", error);
      return [];
    }
  },

  /**
   * Get messages for a specific conversation with pagination
   */
  async getConversationMessages(
    conversationId: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<FrontendMessagePage> {
    try {
      const db = getDb();
      // Notice: offset is tricky in firestore without a cursor, but we can just fetch limit + offset
      // and slice it. A better approach is usually real-time snapshot anyway.
      // We will maintain simple compatibility for the polling fallback if any is left.
      const messagesQuery = query(
        collection(db, "messages"),
        where("conversationId", "==", conversationId),
        orderBy("createdAt", "desc"),
        firestoreLimit(limit + offset + 1),
      );

      const snapshot = await getDocs(messagesQuery);
      const docs = snapshot.docs.slice(offset);
      const hasMore = docs.length > limit;
      const paginatedDocs = docs.slice(0, limit);

      const messages = paginatedDocs.map((d) => ({ id: d.id, ...d.data() }));
      messages.reverse();

      return {
        messages: messages.map(adaptBackendMessage),
        hasMore,
        nextPageToken: hasMore ? String(offset + limit) : undefined,
      };
    } catch (error) {
      return {
        messages: [],
        hasMore: false,
      };
    }
  },

  /**
   * Mark all messages in a conversation as read
   */
  async markMessagesAsRead(
    conversationId: string,
    currentUserId: string,
  ): Promise<boolean> {
    try {
      const db = getDb();

      await runTransaction(db, async (transaction) => {
        const convRef = doc(db, "conversations", conversationId);
        const convDoc = await transaction.get(convRef);
        if (!convDoc.exists()) return;

        const data = convDoc.data();
        const updatedUnreadCount = { ...data.unreadCount };
        updatedUnreadCount[currentUserId] = 0;

        transaction.update(convRef, { unreadCount: updatedUnreadCount });
      });

      const messagesQuery = query(
        collection(db, "messages"),
        where("conversationId", "==", conversationId),
        where("receiverId", "==", currentUserId),
        where("readAt", "==", []),
      );

      const snapshot = await getDocs(messagesQuery);
      if (!snapshot.empty) {
        const batch = writeBatch(db);
        const now = new Date().toISOString();
        snapshot.forEach((docSnap) => {
          batch.update(docSnap.ref, {
            status: { Read: null },
            readAt: [now],
          });
        });
        await batch.commit();
      }

      return true;
    } catch (error) {
      console.error(`Failed to mark messages as read:`, error);
      return false;
    }
  },

  /**
   * Get a specific conversation by ID
   */
  async getConversation(
    conversationId: string,
  ): Promise<FrontendConversation | null> {
    try {
      const db = getDb();
      const docRef = doc(db, "conversations", conversationId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return null;
      return adaptBackendConversation({ id: docSnap.id, ...docSnap.data() });
    } catch (error) {
      throw new Error(`Failed to fetch conversation: ${error}`);
    }
  },

  /**
   * Subscribe to real-time updates for user's conversations
   */
  async subscribeToConversations(
    userId: string,
    onUpdate: (conversations: any[]) => void,
    onError?: (error: Error) => void,
  ): Promise<AsyncUnsubscribe> {
    const clientListenerId = `conversations-client-${userId}`;
    const providerListenerId = `conversations-provider-${userId}`;

    // Clean up existing listeners
    await Promise.all([
      safeUnsubscribe(clientListenerId),
      safeUnsubscribe(providerListenerId),
    ]);
    let unsubscribed = false;
    const conversationMap = new Map<string, any>();

    // Debounce the update function to prevent rapid updates
    const debouncedUpdate = debounce(() => {
      if (!unsubscribed) {
        try {
          const allConversations = Array.from(conversationMap.values());
          onUpdate(allConversations);
        } catch (error) {}
      }
    }, 200); // 200ms debounce

    try {
      // Query for conversations where user is client
      const clientQuery = query(
        collection(getDb(), "conversations"),
        where("clientId", "==", userId),
      );

      // Listen to client conversations
      const clientUnsubscribe = onSnapshot(
        clientQuery,
        (snapshot) => {
          if (unsubscribed) return;

          try {
            snapshot.docChanges().forEach((change) => {
              const docData = { id: change.doc.id, ...change.doc.data() };
              if (change.type === "added" || change.type === "modified") {
                conversationMap.set(change.doc.id, docData);
              } else if (change.type === "removed") {
                conversationMap.delete(change.doc.id);
              }
            });
            debouncedUpdate();
          } catch (error) {}
        },
        (error) => {
          if (unsubscribed) return;
          if (onError && !unsubscribed) onError(error as Error);
        },
      );

      // Register client listener
      activeListeners.set(clientListenerId, {
        unsubscribe: clientUnsubscribe,
        isTerminating: false,
      });

      // Query for conversations where user is provider
      const providerQuery = query(
        collection(getDb(), "conversations"),
        where("providerId", "==", userId),
      );

      // Listen to provider conversations
      const providerUnsubscribe = onSnapshot(
        providerQuery,
        (snapshot) => {
          if (unsubscribed) return;

          try {
            snapshot.docChanges().forEach((change) => {
              const docData = { id: change.doc.id, ...change.doc.data() };
              if (change.type === "added" || change.type === "modified") {
                conversationMap.set(change.doc.id, docData);
              } else if (change.type === "removed") {
                conversationMap.delete(change.doc.id);
              }
            });
            debouncedUpdate();
          } catch (error) {}
        },
        (error) => {
          if (unsubscribed) return;
          if (onError && !unsubscribed) onError(error as Error);
        },
      );

      // Register provider listener
      activeListeners.set(providerListenerId, {
        unsubscribe: providerUnsubscribe,
        isTerminating: false,
      });

      // Return combined unsubscribe function
      return async () => {
        if (unsubscribed) return;

        unsubscribed = true;

        await Promise.all([
          safeUnsubscribe(clientListenerId),
          safeUnsubscribe(providerListenerId),
        ]);
      };
    } catch (error) {
      if (onError) onError(error as Error);
      return async () => {}; // Return no-op unsubscribe
    }
  },

  /**
   * Subscribe to real-time updates for messages in a conversation
   */
  async subscribeToMessages(
    conversationId: string,
    onUpdate: (messages: any[]) => void,
    onError?: (error: Error) => void,
    messageLimit: number = 50,
  ): Promise<AsyncUnsubscribe> {
    const listenerId = `messages-${conversationId}`;

    // Clean up existing listener for this conversation
    await safeUnsubscribe(listenerId);

    let unsubscribed = false;

    // Debounce the update callback to prevent rapid re-renders
    const debouncedUpdate = debounce((messages: any[]) => {
      if (!unsubscribed) {
        onUpdate(messages);
      }
    }, 200); // 200ms debounce

    try {
      const messagesQuery = query(
        collection(getDb(), "messages"),
        where("conversationId", "==", conversationId),
        orderBy("createdAt", "desc"),
        firestoreLimit(messageLimit),
      );

      const firestoreUnsubscribe = onSnapshot(
        messagesQuery,
        (snapshot) => {
          if (unsubscribed) return;

          try {
            const messages = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            // Reverse to show oldest first (chronological)
            messages.reverse();
            debouncedUpdate(messages);
          } catch (error) {}
        },
        (error) => {
          if (unsubscribed) return;
          if (onError && !unsubscribed) onError(error as Error);
        },
      );

      // Register the listener
      activeListeners.set(listenerId, {
        unsubscribe: firestoreUnsubscribe,
        isTerminating: false,
      });

      // Return cleanup function
      return async () => {
        if (unsubscribed) return;

        unsubscribed = true;
        await safeUnsubscribe(listenerId);
      };
    } catch (error) {
      if (onError) onError(error as Error);
      return async () => {}; // Return no-op unsubscribe
    }
  },

  /**
   * Subscribe to real-time updates for conversation summaries (including last messages)
   */
  async subscribeToConversationSummaries(
    userId: string,
    onUpdate: (summaries: any[]) => void,
    onError?: (error: Error) => void,
  ): Promise<AsyncUnsubscribe> {
    let unsubscribed = false;

    // Debounce the update function
    const updateSummaries = debounce((conversations: any[]) => {
      if (unsubscribed) return;

      try {
        const summaries = conversations.map((conv) => {
          const backendSummary = {
            conversation: conv,
            lastMessage: [],
          };
          return adaptBackendConversationSummary(backendSummary);
        });

        // Sort by last message time (most recent first)
        summaries.sort((a, b) => {
          const timeA =
            a.conversation.lastMessageAt || a.conversation.createdAt;
          const timeB =
            b.conversation.lastMessageAt || b.conversation.createdAt;
          return new Date(timeB).getTime() - new Date(timeA).getTime();
        });

        if (!unsubscribed) {
          onUpdate(summaries);
        }
      } catch (error) {}
    }, 300);

    try {
      const unsubscribe = await this.subscribeToConversations(
        userId,
        (conversations) => {
          if (unsubscribed) return;
          updateSummaries(conversations);
        },
        onError,
      );

      return async () => {
        if (unsubscribed) return;
        unsubscribed = true;
        await unsubscribe();
      };
    } catch (error) {
      if (onError) onError(error as Error);
      return async () => {};
    }
  },
};

export default chatCanisterService;
