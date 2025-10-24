import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import chatCanisterService, {
  FrontendConversationSummary,
  FrontendMessage,
  FrontendConversation,
  FrontendMessagePage,
} from "../services/chatCanisterService";
import { authCanisterService } from "../services/authCanisterService";

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

  // Real-time listener unsubscribe functions
  const conversationsUnsubscribe = useRef<(() => void) | null>(null);
  const messagesUnsubscribe = useRef<(() => void) | null>(null);

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
  const setupConversationsListener = useCallback(() => {
    if (!isAuthenticated || !identity) {
      return;
    }

    const userId = identity.getPrincipal().toString();
    console.log("🔔 [useChat] Setting up conversations listener for:", userId);

    // Cleanup existing listener
    if (conversationsUnsubscribe.current) {
      conversationsUnsubscribe.current();
    }

    setLoading(true);
    setError(null);

    conversationsUnsubscribe.current =
      chatCanisterService.subscribeToConversationSummaries(
        userId,
        async (summaries) => {
          console.log(
            `✅ [useChat] Real-time update: ${summaries.length} conversations`,
          );

          // Enhance conversations with user names
          const enhancedConversations =
            await enhanceConversationsWithNames(summaries);
          setConversations(enhancedConversations);
          setLoading(false);
        },
        (error) => {
          console.error("❌ [useChat] Error in conversations listener:", error);
          setError("Could not load conversations.");
          setLoading(false);
        },
      );
  }, [isAuthenticated, identity, enhanceConversationsWithNames]);

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
   * Load messages for the current conversation with real-time listener
   * @param conversationId The ID of the conversation
   */
  const loadConversation = useCallback(
    async (conversationId: string) => {
      if (!isAuthenticated || !identity) {
        setCurrentConversation(null);
        setMessages([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Cleanup existing messages listener
        if (messagesUnsubscribe.current) {
          messagesUnsubscribe.current();
        }

        // Setup real-time listener for messages
        console.log(
          "🔔 [useChat] Setting up messages listener for:",
          conversationId,
        );
        messagesUnsubscribe.current = chatCanisterService.subscribeToMessages(
          conversationId,
          (rawMessages) => {
            console.log(
              `✅ [useChat] Real-time update: ${rawMessages.length} messages`,
            );
            // Adapt messages to frontend format
            const adaptedMessages = rawMessages.map(adaptBackendMessage);
            setMessages(adaptedMessages);
            setLoading(false);
          },
          (error) => {
            console.error("❌ [useChat] Error in messages listener:", error);
            setError("Could not load messages.");
            setLoading(false);
          },
        );

        // Fetch conversation details after setting up listener
        const conversation =
          await chatCanisterService.getConversation(conversationId);
        setCurrentConversation(conversation);

        // Mark messages as read
        await chatCanisterService.markMessagesAsRead(conversationId);
      } catch (err) {
        console.error("Failed to load conversation:", err);
        setError("Could not load conversation.");
        setLoading(false);
      }
    },
    [isAuthenticated, identity, adaptBackendMessage],
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
  const cleanupListeners = useCallback(() => {
    console.log("🔕 [useChat] Cleaning up all listeners");
    if (conversationsUnsubscribe.current) {
      conversationsUnsubscribe.current();
      conversationsUnsubscribe.current = null;
    }
    if (messagesUnsubscribe.current) {
      messagesUnsubscribe.current();
      messagesUnsubscribe.current = null;
    }
  }, []);

  /**
   * Clear current conversation and messages
   */
  const clearCurrentConversation = useCallback(() => {
    // Cleanup messages listener
    if (messagesUnsubscribe.current) {
      messagesUnsubscribe.current();
      messagesUnsubscribe.current = null;
    }
    setCurrentConversation(null);
    setMessages([]);
    setError(null);
  }, []);

  // Setup real-time listeners on auth state change
  useEffect(() => {
    if (isAuthenticated && identity) {
      setupConversationsListener();
    } else {
      cleanupListeners();
      setConversations([]);
      clearCurrentConversation();
    }

    // Cleanup on unmount or auth change
    return () => {
      cleanupListeners();
    };
  }, [
    isAuthenticated,
    identity,
    setupConversationsListener,
    cleanupListeners,
    clearCurrentConversation,
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
