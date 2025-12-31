// Chat Service (Firebase Cloud Functions & Firestore Real-time)
import { getFirebaseFunctions, getFirebaseFirestore } from "./firebaseApp";
import { httpsCallable } from "firebase/functions";
import {
  collection,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";

// Get Firebase instances using proper helpers
const getFunctions = () => getFirebaseFunctions();
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
    return "Text";
  };

  const getMessageStatus = (status: any): "Sent" | "Delivered" | "Read" => {
    if (status?.Sent !== undefined) return "Sent";
    if (status?.Delivered !== undefined) return "Delivered";
    if (status?.Read !== undefined) return "Read";
    return "Sent";
  };

  return {
    id: backendMessage.id,
    conversationId: backendMessage.conversationId,
    senderId: backendMessage.senderId,
    receiverId: backendMessage.receiverId,
    messageType: getMessageType(backendMessage.messageType),
    content: {
      encryptedText: backendMessage.content?.encryptedText || "",
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
   * Create a new conversation (usually called after booking completion)
   * @param clientId Principal ID of the client
   * @param providerId Principal ID of the service provider
   */
  async createConversation(
    clientId: string,
    providerId: string,
  ): Promise<FrontendConversation | null> {
    try {
      const createConversationFn = httpsCallable(
        getFunctions(),
        "createConversation",
      );

      const result = await createConversationFn({
        clientId,
        providerId,
      });
      const responseData = (result.data as { success: boolean; data: any })
        .data;
      return adaptBackendConversation(responseData);
    } catch (error) {
      throw new Error(`Failed to create conversation: ${error}`);
    }
  },

  /**
   * Send a message in a conversation
   * @param conversationId ID of the conversation
   * @param receiverId Principal ID of the message receiver
   * @param content Message content (max 500 characters)
   */
  async sendMessage(
    conversationId: string,
    receiverId: string,
    content: string,
  ): Promise<FrontendMessage | null> {
    try {
      // Validate message length
      if (content.length > 500) {
        throw new Error("Message cannot exceed 500 characters");
      }

      if (content.trim().length === 0) {
        throw new Error("Message cannot be empty");
      }

      const sendMessageFn = httpsCallable(getFunctions(), "sendMessage");

      const result = await sendMessageFn({
        conversationId,
        receiverId,
        content: content.trim(),
      });

      const responseData = (result.data as { success: boolean; data: any })
        .data;
      return adaptBackendMessage(responseData);
    } catch (error) {
      throw new Error(`Failed to send message: ${error}`);
    }
  },

  /**
   * Get all conversations for the current user
   */
  async getMyConversations(): Promise<FrontendConversationSummary[]> {
    try {
      const getMyConversationsFn = httpsCallable(
        getFunctions(),
        "getMyConversations",
      );

      const result = await getMyConversationsFn({});

      const responseData = (result.data as { success: boolean; data: any[] })
        .data;
      return (responseData || []).map(adaptBackendConversationSummary);
    } catch (error) {
      return [];
    }
  },

  /**
   * Get messages for a specific conversation with pagination
   * @param conversationId ID of the conversation
   * @param limit Number of messages to fetch (default: 20)
   * @param offset Starting position for pagination (default: 0)
   */
  async getConversationMessages(
    conversationId: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<FrontendMessagePage> {
    try {
      const getConversationMessagesFn = httpsCallable(
        getFunctions(),
        "getConversationMessages",
      );

      const result = await getConversationMessagesFn({
        conversationId,
        limit,
        offset,
      });

      const responseData = (
        result.data as {
          success: boolean;
          data: {
            messages: any[];
            hasMore: boolean;
            nextPageToken: string[];
          };
        }
      ).data;
      return {
        messages: (responseData?.messages || []).map(adaptBackendMessage),
        hasMore: responseData?.hasMore || false,
        nextPageToken:
          responseData?.nextPageToken && responseData.nextPageToken.length > 0
            ? responseData.nextPageToken[0]
            : undefined,
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
   * @param conversationId ID of the conversation
   */
  async markMessagesAsRead(conversationId: string): Promise<boolean> {
    try {
      const markMessagesAsReadFn = httpsCallable(
        getFunctions(),
        "markMessagesAsRead",
      );

      const result = await markMessagesAsReadFn({
        conversationId,
      });

      const responseData = (result.data as { success: boolean; data: boolean })
        .data;

      return responseData;
    } catch (error) {
      throw new Error(`Failed to mark messages as read: ${error}`);
    }
  },

  /**
   * Get a specific conversation by ID
   * @param conversationId ID of the conversation
   */
  async getConversation(
    conversationId: string,
  ): Promise<FrontendConversation | null> {
    try {
      const getConversationFn = httpsCallable(
        getFunctions(),
        "getConversation",
      );

      const result = await getConversationFn({
        conversationId,
      });
      const responseData = (result.data as { success: boolean; data: any })
        .data;
      return adaptBackendConversation(responseData);
    } catch (error) {
      throw new Error(`Failed to fetch conversation: ${error}`);
    }
  },

  /**
   * Subscribe to real-time updates for user's conversations
   * @param userId Current user's ID
   * @param onUpdate Callback function to handle conversation updates
   * @returns Unsubscribe function to stop listening
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
   * @param conversationId ID of the conversation
   * @param onUpdate Callback function to handle message updates
   * @param messageLimit Maximum number of messages to listen to (default: 50)
   * @returns Unsubscribe function to stop listening
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
   * @param userId Current user's ID
   * @param onUpdate Callback function to handle conversation summary updates
   * @returns Unsubscribe function to stop listening
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
          // Use the helper to adapt the conversation summary
          // We construct a backend-like summary object to reuse the adapter
          const backendSummary = {
            conversation: conv,
            lastMessage: [], // The adapter will look at conversation.lastMessagePreview
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
      // Just subscribe to conversations. The lastMessagePreview is now inside the conversation document.
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
