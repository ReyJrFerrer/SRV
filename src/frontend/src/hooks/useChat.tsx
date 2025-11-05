import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import chatCanisterService, {
  FrontendConversationSummary,
  FrontendMessage,
  FrontendConversation,
  FrontendMessagePage,
  AsyncUnsubscribe,
} from "../services/chatCanisterService";
import { authCanisterService } from "../services/authCanisterService";

/**
 * Custom hook to track if component is still mounted
 * Prevents state updates after component unmount
 */
const useIsMounted = () => {
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return isMountedRef;
};

// Enhanced conversation summary with user name and profile image URL
export interface EnhancedConversationSummary
  extends FrontendConversationSummary {
  otherUserName?: string;
  otherUserId: string;
  otherUserImageUrl?: string; // Raw profile picture URL from backend
}

/**
 * Custom hook to manage chat functionality including conversations and messaging
 */
export const useChat = () => {
  const { isAuthenticated, identity } = useAuth();
  const isMountedRef = useIsMounted();

  // State management
  const [conversations, setConversations] = useState<
    EnhancedConversationSummary[]
  >([]);
  const [currentConversation, setCurrentConversation] =
    useState<FrontendConversation | null>(null);
  const [messages, setMessages] = useState<FrontendMessage[]>([]);
  const [loading, setLoading] = useState(false); // For initial loads only
  const [error, setError] = useState<string | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);

  // Cache for user names to avoid repeated API calls
  const [userNameCache, setUserNameCache] = useState<Map<string, string>>(
    new Map(),
  );

  // Real-time listener unsubscribe functions (now async)
  const conversationsUnsubscribe = useRef<AsyncUnsubscribe | null>(null);
  const messagesUnsubscribe = useRef<AsyncUnsubscribe | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Get user name from cache or fetch from auth service
   */
  const getUserName = useCallback(
    async (userId: string): Promise<string> => {
      // Check cache first
      if (userNameCache.has(userId)) {
        return userNameCache.get(userId)!;
      }

      try {
        const profile = await authCanisterService.getProfile(userId);
        const userName = profile?.name || `User ${userId.slice(0, 8)}...`;

        // Update cache
        setUserNameCache((prev) => new Map(prev).set(userId, userName));

        return userName;
      } catch (error) {
        //console.error("Failed to fetch user name:", error);
        const fallbackName = `User ${userId.slice(0, 8)}...`;

        // Cache the fallback name to avoid repeated failed requests
        setUserNameCache((prev) => new Map(prev).set(userId, fallbackName));

        return fallbackName;
      }
    },
    [userNameCache],
  );

  /**
   * Enhance conversation summaries with user names
   */
  const enhanceConversationsWithNames = useCallback(
    async (
      conversationSummaries: FrontendConversationSummary[],
    ): Promise<EnhancedConversationSummary[]> => {
      if (!identity) return [];

      const currentUserId = identity.getPrincipal().toString();

      const enhancedConversations = await Promise.all(
        conversationSummaries.map(
          async (summary): Promise<EnhancedConversationSummary> => {
            const conversation = summary.conversation;

            // Determine the other user ID
            const otherUserId =
              conversation.clientId === currentUserId
                ? conversation.providerId
                : conversation.clientId;

            // Fetch the other user's name
            const otherUserName = await getUserName(otherUserId);

            // Fetch the other user's profile for image
            let otherUserImageUrl: string | undefined = undefined;
            try {
              const profile = await authCanisterService.getProfile(otherUserId);
              if (
                profile &&
                profile.profilePicture &&
                profile.profilePicture.imageUrl
              ) {
                otherUserImageUrl = profile.profilePicture.imageUrl;
              }
            } catch (e) {
              // ignore image fetch errors, fallback to undefined
            }

            return {
              ...summary,
              otherUserId,
              otherUserName,
              otherUserImageUrl,
            };
          },
        ),
      );

      return enhancedConversations;
    },
    [identity, getUserName],
  );

  /**
   * Adapt backend message format to frontend format
   */
  const adaptBackendMessage = useCallback(
    (backendMessage: any): FrontendMessage => {
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
        content:
          backendMessage.content?.encryptedText || backendMessage.content,
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
    },
    [],
  );

  /**
   * Setup real-time listener for conversations
   */
  const setupConversationsListener = useCallback(async () => {
    if (!isAuthenticated || !identity || !isMountedRef.current) {
      return;
    }

    const userId = identity.getPrincipal().toString();
    console.log("🔔 [useChat] Setting up conversations listener for:", userId);

    // Cleanup existing listener
    if (conversationsUnsubscribe.current) {
      console.log("🔄 [useChat] Cleaning up existing conversations listener");
      try {
        await conversationsUnsubscribe.current();
      } catch (error) {
        console.error("❌ [useChat] Error cleaning up listener:", error);
      }
      conversationsUnsubscribe.current = null;
    }

    if (!isMountedRef.current) return;

    setLoading(true);
    setError(null);

    try {
      conversationsUnsubscribe.current =
        await chatCanisterService.subscribeToConversationSummaries(
          userId,
          async (summaries) => {
            if (!isMountedRef.current) return;

            console.log(
              `✅ [useChat] Real-time update: ${summaries.length} conversations`,
            );

            try {
              // Enhance conversations with user names
              const enhancedConversations =
                await enhanceConversationsWithNames(summaries);

              if (isMountedRef.current) {
                setConversations(enhancedConversations);
                setLoading(false);
              }
            } catch (error) {
              console.error(
                "❌ [useChat] Error enhancing conversations:",
                error,
              );
              if (isMountedRef.current) {
                setError("Could not load conversations.");
                setLoading(false);
              }
            }
          },
          (error) => {
            if (!isMountedRef.current) return;

            console.error(
              "❌ [useChat] Error in conversations listener:",
              error,
            );
            if (isMountedRef.current) {
              setError("Could not load conversations.");
              setLoading(false);
            }
          },
        );
    } catch (error) {
      console.error(
        "❌ [useChat] Error setting up conversations listener:",
        error,
      );
      if (isMountedRef.current) {
        setError("Could not set up conversations listener.");
        setLoading(false);
      }
    }
  }, [isAuthenticated, identity, enhanceConversationsWithNames, isMountedRef]);

  /**
   * Fetch messages for a specific conversation
   * @param conversationId The ID of the conversation
   * @param limit Number of messages to fetch (default: 50)
   * @param offset Starting position for pagination (default: 0)
   */
  const fetchMessages = useCallback(
    async (
      conversationId: string,
      limit: number = 50,
      offset: number = 0,
    ): Promise<FrontendMessagePage> => {
      if (!isAuthenticated || !identity) {
        throw new Error("Authentication required");
      }

      try {
        const messagePage = await chatCanisterService.getConversationMessages(
          conversationId,
          limit,
          offset,
        );
        return messagePage;
      } catch (err) {
        //console.error("Failed to fetch messages:", err);
        throw new Error("Could not load messages.");
      }
    },
    [isAuthenticated, identity],
  );

  /**
   * Load messages for the current conversation with real-time listener + polling fallback
   * @param conversationId The ID of the conversation
   */
  const loadConversation = useCallback(
    async (conversationId: string) => {
      if (!isAuthenticated || !identity) {
        if (isMountedRef.current) {
          setCurrentConversation(null);
          setMessages([]);
        }
        return;
      }

      if (!isMountedRef.current) return;

      setLoading(true);
      setError(null);

      try {
        // Cleanup existing messages listener
        if (messagesUnsubscribe.current) {
          console.log("🔄 [useChat] Cleaning up existing messages listener");
          try {
            await messagesUnsubscribe.current();
          } catch (error) {
            console.error(
              "❌ [useChat] Error cleaning up messages listener:",
              error,
            );
          }
          messagesUnsubscribe.current = null;
        }

        if (!isMountedRef.current) return;

        // Setup real-time listener for messages
        console.log(
          "🔔 [useChat] Setting up messages listener for:",
          conversationId,
        );
        messagesUnsubscribe.current =
          await chatCanisterService.subscribeToMessages(
            conversationId,
            (rawMessages) => {
              if (!isMountedRef.current) return;

              console.log(
                `✅ [useChat] Real-time update: ${rawMessages.length} messages`,
              );

              try {
                // Adapt messages to frontend format
                const adaptedMessages = rawMessages.map(adaptBackendMessage);
                if (isMountedRef.current) {
                  setMessages(adaptedMessages);
                  setLoading(false);
                }
              } catch (error) {
                console.error("❌ [useChat] Error adapting messages:", error);
                if (isMountedRef.current) {
                  setError("Could not process messages.");
                  setLoading(false);
                }
              }
            },
            (error) => {
              if (!isMountedRef.current) return;

              console.error("❌ [useChat] Error in messages listener:", error);
              if (isMountedRef.current) {
                setError("Could not load messages.");
                setLoading(false);
              }
            },
          );

        // Setup polling fallback (3 seconds)
        console.log("⏰ [useChat] Starting polling mechanism for:", conversationId);
        
        // Clear any existing polling interval
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }

        pollingIntervalRef.current = setInterval(async () => {
          if (!isMountedRef.current) {
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            return;
          }

          try {
            console.log("🔄 [useChat] Polling for new messages...");
            const messagePage = await chatCanisterService.getConversationMessages(
              conversationId,
              50,
              0,
            );

            if (isMountedRef.current && messagePage.messages.length > 0) {
              const adaptedMessages = messagePage.messages.map(adaptBackendMessage);
              setMessages(adaptedMessages);
              console.log(`✅ [useChat] Polling update: ${adaptedMessages.length} messages`);
            }
          } catch (error) {
            console.error("❌ [useChat] Error polling messages:", error);
            // Don't set error state for polling failures, just log it
          }
        }, 3000);

        // Fetch conversation details after setting up listener
        const conversation =
          await chatCanisterService.getConversation(conversationId);

        if (isMountedRef.current) {
          setCurrentConversation(conversation);
        }

        // Mark messages as read
        if (isMountedRef.current) {
          await chatCanisterService.markMessagesAsRead(conversationId);
        }
      } catch (err) {
        console.error("Failed to load conversation:", err);
        if (isMountedRef.current) {
          setError("Could not load conversation.");
          setLoading(false);
        }
      }
    },
    [isAuthenticated, identity, adaptBackendMessage, isMountedRef],
  );

  /**
   * Send a message in the current conversation
   * @param content The message content (max 500 characters)
   * @param receiverId The receiver's Principal ID
   */
  const sendMessage = useCallback(
    async (content: string, receiverId: string) => {
      if (!isAuthenticated || !identity || !currentConversation) {
        throw new Error("Authentication and active conversation required");
      }

      // Validate message content
      if (content.trim().length === 0) {
        throw new Error("Message cannot be empty");
      }

      if (content.length > 500) {
        throw new Error("Message cannot exceed 500 characters");
      }

      setSendingMessage(true);
      setError(null);

      try {
        const newMessage = await chatCanisterService.sendMessage(
          currentConversation.id,
          receiverId,
          content.trim(),
        );

        if (newMessage) {
          // Real-time listener will automatically update the messages
          // No need to manually update state
        }

        return newMessage;
      } catch (err) {
        //console.error("Failed to send message:", err);
        setError(
          err instanceof Error ? err.message : "Could not send message.",
        );
        throw err;
      } finally {
        setSendingMessage(false);
      }
    },
    [isAuthenticated, identity, currentConversation],
  );

  /**
   * Create a new conversation
   * @param clientId Client's Principal ID
   * @param providerId Provider's Principal ID
   * @param bookingId Booking ID that initiated this conversation
   */
  const createConversation = useCallback(
    async (clientId: string, providerId: string) => {
      if (!isAuthenticated || !identity) {
        throw new Error("Authentication required");
      }

      setLoading(true);
      setError(null);

      try {
        const newConversation = await chatCanisterService.createConversation(
          clientId,
          providerId,
        );

        if (newConversation) {
          // Real-time listener will automatically add the new conversation
          // No need to manually refresh
        }

        return newConversation;
      } catch (err) {
        //console.error("Failed to create conversation:", err);
        setError("Could not create conversation.");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [isAuthenticated, identity],
  );

  /**
   * Mark messages in a conversation as read
   * @param conversationId The ID of the conversation
   */
  const markAsRead = useCallback(
    async (conversationId: string) => {
      if (!isAuthenticated || !identity) {
        return;
      }

      try {
        await chatCanisterService.markMessagesAsRead(conversationId);
        // Real-time listener will automatically update unread counts
      } catch (err) {
        console.error("Failed to mark messages as read:", err);
      }
    },
    [isAuthenticated, identity],
  );

  /**
   * Get total unread message count across all conversations
   */
  const getUnreadCount = useCallback((): number => {
    if (!identity) return 0;

    const currentUserId = identity.getPrincipal().toString();

    return conversations.reduce((total, convoSummary) => {
      // unreadCount is now an object: { [userId: string]: number }
      const count = convoSummary.conversation.unreadCount[currentUserId] || 0;
      return total + count;
    }, 0);
  }, [conversations, identity]);

  /**
   * Cleanup all real-time listeners
   */
  const cleanupListeners = useCallback(async () => {
    console.log("🔕 [useChat] Cleaning up all listeners");

    try {
      if (conversationsUnsubscribe.current) {
        await conversationsUnsubscribe.current();
        conversationsUnsubscribe.current = null;
      }
    } catch (error) {
      console.error(
        "❌ [useChat] Error cleaning up conversations listener:",
        error,
      );
    }

    try {
      if (messagesUnsubscribe.current) {
        await messagesUnsubscribe.current();
        messagesUnsubscribe.current = null;
      }
    } catch (error) {
      console.error("❌ [useChat] Error cleaning up messages listener:", error);
    }
  }, []);

  /**
   * Clear current conversation and messages
   */
  const clearCurrentConversation = useCallback(async () => {
    // Clear polling interval
    if (pollingIntervalRef.current) {
      console.log("⏹️ [useChat] Stopping polling mechanism");
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    // Cleanup messages listener
    try {
      if (messagesUnsubscribe.current) {
        await messagesUnsubscribe.current();
        messagesUnsubscribe.current = null;
      }
    } catch (error) {
      console.error("❌ [useChat] Error cleaning up messages listener:", error);
    }

    if (isMountedRef.current) {
      setCurrentConversation(null);
      setMessages([]);
      setError(null);
    }
  }, [isMountedRef]);

  // Setup real-time listeners on auth state change
  useEffect(() => {
    console.log("🔄 [useChat] Auth state changed, updating listeners");

    if (isAuthenticated && identity && isMountedRef.current) {
      setupConversationsListener();
    } else {
      cleanupListeners();
      if (isMountedRef.current) {
        setConversations([]);
      }
      clearCurrentConversation();
    }

    // Cleanup on unmount or auth change
    return () => {
      console.log(
        "🔕 [useChat] Cleaning up listeners (unmount or auth change)",
      );
      cleanupListeners();
    };
  }, [
    isAuthenticated,
    identity,
    setupConversationsListener,
    cleanupListeners,
    clearCurrentConversation,
    isMountedRef,
  ]);

  return {
    // State
    conversations,
    currentConversation,
    messages,
    loading, // Only shows for initial loads
    error,
    sendingMessage,

    // Actions
    loadConversation,
    sendMessage,
    createConversation,
    markAsRead,
    clearCurrentConversation,

    // Utilities
    getUnreadCount,
    fetchMessages,
    getUserName,
  };
};

export default useChat;
