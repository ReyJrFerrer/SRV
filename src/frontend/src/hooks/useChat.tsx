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
  const [backgroundLoading, setBackgroundLoading] = useState(false); // For silent updates
  const [error, setError] = useState<string | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);

  // Cache for user names to avoid repeated API calls
  const [userNameCache, setUserNameCache] = useState<Map<string, string>>(
    new Map(),
  );

  // Auto-refresh interval
  const refreshInterval = useRef<NodeJS.Timeout | null>(null);
  const AUTO_REFRESH_INTERVAL = 5000; // 5 seconds

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
   * Fetch all conversations for the current user
   * @param silent Whether to perform a silent background update
   */
  const fetchConversations = useCallback(
    async (silent: boolean = false) => {
      if (!isAuthenticated || !identity) {
        setConversations([]);
        return;
      }

      if (silent) {
        setBackgroundLoading(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const fetchedConversations =
          await chatCanisterService.getMyConversations();

        // Enhance conversations with user names
        const enhancedConversations =
          await enhanceConversationsWithNames(fetchedConversations);
        setConversations(enhancedConversations);
      } catch (err) {
        //console.error("Failed to fetch conversations:", err);
        if (!silent) {
          setError("Could not load conversations.");
        }
      } finally {
        if (silent) {
          setBackgroundLoading(false);
        } else {
          setLoading(false);
        }
      }
    },
    [isAuthenticated, identity, enhanceConversationsWithNames],
  );

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
   * Load messages for the current conversation
   * @param conversationId The ID of the conversation
   * @param silent Whether to perform a silent background update
   */
  const loadConversation = useCallback(
    async (conversationId: string, silent: boolean = false) => {
      if (!isAuthenticated || !identity) {
        setCurrentConversation(null);
        setMessages([]);
        return;
      }

      if (silent) {
        setBackgroundLoading(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        // Fetch conversation details
        const conversation =
          await chatCanisterService.getConversation(conversationId);
        setCurrentConversation(conversation);

        // Fetch messages for this conversation
        const messagePage = await fetchMessages(conversationId);
        setMessages(messagePage.messages);

        // Mark messages as read
        await chatCanisterService.markMessagesAsRead(conversationId);

        // Refresh conversations to update unread counts (silently)
        await fetchConversations(true);
      } catch (err) {
        //console.error("Failed to load conversation:", err);
        if (!silent) {
          setError("Could not load conversation.");
        }
      } finally {
        if (silent) {
          setBackgroundLoading(false);
        } else {
          setLoading(false);
        }
      }
    },
    [isAuthenticated, identity, fetchMessages, fetchConversations],
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
          // Add the new message to the local state immediately for better UX
          setMessages((prevMessages) => [...prevMessages, newMessage]);

          // Refresh conversations to update last message and timestamps (silently)
          await fetchConversations(true);
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
    [isAuthenticated, identity, currentConversation, fetchConversations],
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
          // Refresh conversations to include the new one (silently)
          await fetchConversations(true);
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
    [isAuthenticated, identity, fetchConversations],
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
        // Refresh conversations to update unread counts (silently)
        await fetchConversations(true);
      } catch (err) {
        //console.error("Failed to mark messages as read:", err);
      }
    },
    [isAuthenticated, identity, fetchConversations],
  );

  /**
   * Get total unread message count across all conversations
   */
  const getUnreadCount = useCallback((): number => {
    if (!identity) return 0;

    return conversations.reduce((total, convoSummary) => {
      const userUnreadEntry = convoSummary.conversation.unreadCount.find(
        (entry) => entry.userId === identity.getPrincipal().toString(),
      );
      return total + (userUnreadEntry?.count || 0);
    }, 0);
  }, [conversations, identity]);

  /**
   * Start auto-refresh for real-time updates
   */
  const startAutoRefresh = useCallback(() => {
    if (refreshInterval.current) {
      clearInterval(refreshInterval.current);
    }

    refreshInterval.current = setInterval(() => {
      if (isAuthenticated && identity) {
        // Silently refresh conversations
        fetchConversations(true).catch;

        // If we have a current conversation, silently refresh its messages
        if (currentConversation) {
          fetchMessages(currentConversation.id).then((messagePage) => {
            setMessages(messagePage.messages);
          }).catch;
        }
      }
    }, AUTO_REFRESH_INTERVAL);
  }, [
    isAuthenticated,
    identity,
    currentConversation,
    fetchConversations,
    fetchMessages,
  ]);

  /**
   * Stop auto-refresh
   */
  const stopAutoRefresh = useCallback(() => {
    if (refreshInterval.current) {
      clearInterval(refreshInterval.current);
      refreshInterval.current = null;
    }
  }, []);

  /**
   * Clear current conversation and messages
   */
  const clearCurrentConversation = useCallback(() => {
    setCurrentConversation(null);
    setMessages([]);
    setError(null);
  }, []);

  // Initialize and fetch conversations on auth state change
  useEffect(() => {
    if (isAuthenticated && identity) {
      fetchConversations(false); // Initial load with loading state
      startAutoRefresh();
    } else {
      setConversations([]);
      clearCurrentConversation();
      stopAutoRefresh();
    }

    // Cleanup on unmount or auth change
    return () => {
      stopAutoRefresh();
    };
  }, [
    isAuthenticated,
    identity,
    fetchConversations,
    startAutoRefresh,
    clearCurrentConversation,
    stopAutoRefresh,
  ]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, []);

  return {
    // State
    conversations,
    currentConversation,
    messages,
    loading, // Only shows for initial loads
    backgroundLoading, // Shows for silent background updates
    error,
    sendingMessage,

    // Actions
    fetchConversations,
    loadConversation,
    sendMessage,
    createConversation,
    markAsRead,
    clearCurrentConversation,

    // Utilities
    getUnreadCount,
    fetchMessages,
    getUserName,

    // Auto-refresh controls
    startAutoRefresh,
    stopAutoRefresh,
  };
};

export default useChat;
