// Chat Service (Firebase Cloud Functions & Firestore Real-time)
import { initializeFirebase } from "./firebaseApp";
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

// Initialize Firebase
const { functions, firestore } = initializeFirebase();

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
    console.log(
      `⏳ [chatCanisterService] Listener ${listenerId} already terminating`,
    );
    return;
  }

  listener.isTerminating = true;

  return new Promise((resolve) => {
    setTimeout(() => {
      try {
        listener.unsubscribe();
        activeListeners.delete(listenerId);
        console.log(
          `✅ [chatCanisterService] Listener ${listenerId} cleaned up`,
        );
      } catch (error) {
        console.error(
          `❌ [chatCanisterService] Error cleaning up listener ${listenerId}:`,
          error,
        );
      }
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
  };
};

// Helper function to adapt backend conversation summary
const adaptBackendConversationSummary = (
  backendSummary: any,
): FrontendConversationSummary => {
  console.log("🔍 [adaptBackendConversationSummary] Input:", {
    conversationId: backendSummary.conversation?.id,
    hasLastMessage: !!backendSummary.lastMessage,
    lastMessageIsArray: Array.isArray(backendSummary.lastMessage),
    lastMessageLength: backendSummary.lastMessage?.length,
    lastMessageContent: backendSummary.lastMessage?.[0]?.content,
  });

  const adapted = {
    conversation: adaptBackendConversation(backendSummary.conversation),
    lastMessage:
      backendSummary.lastMessage &&
      Array.isArray(backendSummary.lastMessage) &&
      backendSummary.lastMessage.length > 0
        ? backendSummary.lastMessage.map(adaptBackendMessage).filter(Boolean)
        : undefined,
  };

  console.log("✅ [adaptBackendConversationSummary] Output:", {
    conversationId: adapted.conversation.id,
    hasLastMessage: !!adapted.lastMessage && adapted.lastMessage.length > 0,
    lastMessageCount: adapted.lastMessage?.length || 0,
    firstMessageContent: adapted.lastMessage?.[0]?.content,
  });

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
    console.log("🚀 [chatCanisterService] createConversation called with:", {
      clientId,
      providerId,
    });
    try {
      const createConversationFn = httpsCallable(
        functions,
        "createConversation",
      );

      const result = await createConversationFn({
        clientId,
        providerId,
      });

      console.log(
        "✅ [chatCanisterService] createConversation raw result:",
        result,
      );
      const responseData = (result.data as { success: boolean; data: any })
        .data;
      console.log(
        "✅ [chatCanisterService] createConversation extracted data:",
        responseData,
      );
      return adaptBackendConversation(responseData);
    } catch (error) {
      console.error(
        "❌ [chatCanisterService] Error creating conversation:",
        error,
      );
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
    console.log("🚀 [chatCanisterService] sendMessage called with:", {
      conversationId,
      receiverId,
      contentLength: content.length,
    });
    try {
      // Validate message length
      if (content.length > 500) {
        throw new Error("Message cannot exceed 500 characters");
      }

      if (content.trim().length === 0) {
        throw new Error("Message cannot be empty");
      }

      const sendMessageFn = httpsCallable(functions, "sendMessage");

      const result = await sendMessageFn({
        conversationId,
        receiverId,
        content: content.trim(),
      });

      console.log("✅ [chatCanisterService] sendMessage raw result:", result);
      const responseData = (result.data as { success: boolean; data: any })
        .data;
      console.log(
        "✅ [chatCanisterService] sendMessage extracted data:",
        responseData,
      );
      return adaptBackendMessage(responseData);
    } catch (error) {
      console.error("❌ [chatCanisterService] Error sending message:", error);
      throw new Error(`Failed to send message: ${error}`);
    }
  },

  /**
   * Get all conversations for the current user
   */
  async getMyConversations(): Promise<FrontendConversationSummary[]> {
    console.log("🚀 [chatCanisterService] getMyConversations called");
    try {
      const getMyConversationsFn = httpsCallable(
        functions,
        "getMyConversations",
      );

      const result = await getMyConversationsFn({});

      console.log(
        "✅ [chatCanisterService] getMyConversations raw result:",
        result,
      );
      const responseData = (result.data as { success: boolean; data: any[] })
        .data;
      console.log(
        `✅ [chatCanisterService] getMyConversations extracted ${responseData?.length ?? 0} conversations.`,
      );

      return (responseData || []).map(adaptBackendConversationSummary);
    } catch (error) {
      console.error(
        "❌ [chatCanisterService] Error fetching conversations:",
        error,
      );
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
    console.log(
      "🚀 [chatCanisterService] getConversationMessages called with:",
      {
        conversationId,
        limit,
        offset,
      },
    );
    try {
      const getConversationMessagesFn = httpsCallable(
        functions,
        "getConversationMessages",
      );

      const result = await getConversationMessagesFn({
        conversationId,
        limit,
        offset,
      });

      console.log(
        "✅ [chatCanisterService] getConversationMessages raw result:",
        result,
      );
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
      console.log(
        `✅ [chatCanisterService] getConversationMessages extracted ${responseData?.messages?.length ?? 0} messages.`,
      );

      return {
        messages: (responseData?.messages || []).map(adaptBackendMessage),
        hasMore: responseData?.hasMore || false,
        nextPageToken:
          responseData?.nextPageToken && responseData.nextPageToken.length > 0
            ? responseData.nextPageToken[0]
            : undefined,
      };
    } catch (error) {
      console.error(
        "❌ [chatCanisterService] Error fetching conversation messages:",
        error,
      );
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
    console.log(
      "🚀 [chatCanisterService] markMessagesAsRead called for conversation:",
      conversationId,
    );
    try {
      const markMessagesAsReadFn = httpsCallable(
        functions,
        "markMessagesAsRead",
      );

      const result = await markMessagesAsReadFn({
        conversationId,
      });

      console.log(
        "✅ [chatCanisterService] markMessagesAsRead raw result:",
        result,
      );
      const responseData = (result.data as { success: boolean; data: boolean })
        .data;
      console.log(
        "✅ [chatCanisterService] markMessagesAsRead extracted data:",
        responseData,
      );
      return responseData;
    } catch (error) {
      console.error(
        "❌ [chatCanisterService] Error marking messages as read:",
        error,
      );
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
    console.log(
      "🚀 [chatCanisterService] getConversation called for conversation:",
      conversationId,
    );
    try {
      const getConversationFn = httpsCallable(functions, "getConversation");

      const result = await getConversationFn({
        conversationId,
      });

      console.log(
        "✅ [chatCanisterService] getConversation raw result:",
        result,
      );
      const responseData = (result.data as { success: boolean; data: any })
        .data;
      console.log(
        "✅ [chatCanisterService] getConversation extracted data:",
        responseData,
      );
      return adaptBackendConversation(responseData);
    } catch (error) {
      console.error(
        "❌ [chatCanisterService] Error fetching conversation:",
        error,
      );
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

    console.log(
      "🔔 [chatCanisterService] Setting up real-time listener for conversations:",
      userId,
    );

    let unsubscribed = false;
    const conversationMap = new Map<string, any>();

    // Debounce the update function to prevent rapid updates
    const debouncedUpdate = debounce(() => {
      if (!unsubscribed) {
        try {
          const allConversations = Array.from(conversationMap.values());
          onUpdate(allConversations);
        } catch (error) {
          console.error(
            "❌ [chatCanisterService] Error in updateConversations callback:",
            error,
          );
        }
      }
    }, 200); // 200ms debounce

    try {
      // Query for conversations where user is client
      const clientQuery = query(
        collection(firestore, "conversations"),
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
          } catch (error) {
            console.error(
              "❌ [chatCanisterService] Error processing client conversations snapshot:",
              error,
            );
          }
        },
        (error) => {
          if (unsubscribed) return;
          console.error(
            "❌ [chatCanisterService] Error in client conversations listener:",
            error,
          );
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
        collection(firestore, "conversations"),
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
          } catch (error) {
            console.error(
              "❌ [chatCanisterService] Error processing provider conversations snapshot:",
              error,
            );
          }
        },
        (error) => {
          if (unsubscribed) return;
          console.error(
            "❌ [chatCanisterService] Error in provider conversations listener:",
            error,
          );
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

        console.log(
          "🔕 [chatCanisterService] Unsubscribing from conversations listener",
        );
        unsubscribed = true;

        await Promise.all([
          safeUnsubscribe(clientListenerId),
          safeUnsubscribe(providerListenerId),
        ]);
      };
    } catch (error) {
      console.error(
        "❌ [chatCanisterService] Error setting up conversations listener:",
        error,
      );
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

    console.log(
      "🔔 [chatCanisterService] Setting up real-time listener for messages:",
      conversationId,
    );

    let unsubscribed = false;

    // Debounce the update callback to prevent rapid re-renders
    const debouncedUpdate = debounce((messages: any[]) => {
      if (!unsubscribed) {
        onUpdate(messages);
      }
    }, 200); // 200ms debounce

    try {
      const messagesQuery = query(
        collection(firestore, "messages"),
        where("conversationId", "==", conversationId),
        orderBy("createdAt", "asc"),
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
            console.log(
              `✅ [chatCanisterService] Real-time update: ${messages.length} messages`,
            );
            debouncedUpdate(messages);
          } catch (error) {
            console.error(
              "❌ [chatCanisterService] Error processing messages snapshot:",
              error,
            );
          }
        },
        (error) => {
          if (unsubscribed) return;
          console.error(
            "❌ [chatCanisterService] Error in messages listener:",
            error,
          );
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

        console.log(
          "🔕 [chatCanisterService] Unsubscribing from messages listener:",
          conversationId,
        );
        unsubscribed = true;
        await safeUnsubscribe(listenerId);
      };
    } catch (error) {
      console.error(
        "❌ [chatCanisterService] Error setting up messages listener:",
        error,
      );
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
    console.log(
      "🔔 [chatCanisterService] Setting up real-time listener for conversation summaries:",
      userId,
    );

    let unsubscribed = false;
    const conversationMap = new Map<string, any>();
    const lastMessageMap = new Map<string, any>();
    let messageUnsubscribers = new Map<string, Unsubscribe>();
    let conversationsUnsubscribe: AsyncUnsubscribe | null = null;

    // Debounce the update function to prevent too many rapid updates
    const updateSummaries = debounce(() => {
      if (unsubscribed) return;

      try {
        const summaries = Array.from(conversationMap.values()).map((conv) => ({
          conversation: conv,
          lastMessage: lastMessageMap.has(conv.id)
            ? [lastMessageMap.get(conv.id)]
            : [],
        }));

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
      } catch (error) {
        console.error(
          "❌ [chatCanisterService] Error in updateSummaries:",
          error,
        );
      }
    }, 300); // 300ms debounce

    // Subscribe to each conversation's last message
    const subscribeToLastMessage = (conversationId: string) => {
      if (unsubscribed) return;

      try {
        const lastMessageQuery = query(
          collection(firestore, "messages"),
          where("conversationId", "==", conversationId),
          orderBy("createdAt", "desc"),
          firestoreLimit(1),
        );

        const unsubscribe = onSnapshot(
          lastMessageQuery,
          (snapshot) => {
            if (unsubscribed) return;

            try {
              if (!snapshot.empty) {
                const lastMessage = {
                  id: snapshot.docs[0].id,
                  ...snapshot.docs[0].data(),
                };
                lastMessageMap.set(conversationId, lastMessage);
              } else {
                lastMessageMap.delete(conversationId);
              }
              updateSummaries();
            } catch (error) {
              console.error(
                "❌ [chatCanisterService] Error processing last message snapshot:",
                error,
              );
            }
          },
          (error) => {
            if (unsubscribed) return;
            console.error(
              "❌ [chatCanisterService] Error in last message listener:",
              error,
            );
          },
        );

        messageUnsubscribers.set(conversationId, unsubscribe);
      } catch (error) {
        console.error(
          "❌ [chatCanisterService] Error subscribing to last message:",
          error,
        );
      }
    };

    // Main conversations listener
    try {
      conversationsUnsubscribe = await this.subscribeToConversations(
        userId,
        (conversations) => {
          if (unsubscribed) return;

          try {
            // Update conversation map
            conversations.forEach((conv) => {
              conversationMap.set(conv.id, conv);

              // Subscribe to last message if not already subscribed
              if (!messageUnsubscribers.has(conv.id) && !unsubscribed) {
                subscribeToLastMessage(conv.id);
              }
            });

            // Clean up removed conversations
            conversationMap.forEach((_, convId) => {
              if (!conversations.find((c) => c.id === convId)) {
                conversationMap.delete(convId);
                lastMessageMap.delete(convId);
                const unsub = messageUnsubscribers.get(convId);
                if (unsub) {
                  try {
                    unsub();
                  } catch (error) {
                    console.error(
                      "❌ [chatCanisterService] Error unsubscribing message listener:",
                      error,
                    );
                  }
                  messageUnsubscribers.delete(convId);
                }
              }
            });

            updateSummaries();
          } catch (error) {
            console.error(
              "❌ [chatCanisterService] Error processing conversations update:",
              error,
            );
          }
        },
        onError,
      );
    } catch (error) {
      console.error(
        "❌ [chatCanisterService] Error setting up conversation summaries listener:",
        error,
      );
      if (onError) onError(error as Error);
      return async () => {}; // Return no-op unsubscribe
    }

    // Return combined unsubscribe function
    return async () => {
      if (unsubscribed) return; // Prevent double unsubscribe

      console.log(
        "🔕 [chatCanisterService] Unsubscribing from conversation summaries listener",
      );
      unsubscribed = true;

      try {
        if (conversationsUnsubscribe) {
          await conversationsUnsubscribe();
          conversationsUnsubscribe = null;
        }

        messageUnsubscribers.forEach((unsub, convId) => {
          try {
            unsub();
          } catch (error) {
            console.error(
              `❌ [chatCanisterService] Error unsubscribing message listener for ${convId}:`,
              error,
            );
          }
        });
        messageUnsubscribers.clear();
      } catch (error) {
        console.error(
          "❌ [chatCanisterService] Error during conversation summaries unsubscribe:",
          error,
        );
      }
    };
  },
};

export default chatCanisterService;
