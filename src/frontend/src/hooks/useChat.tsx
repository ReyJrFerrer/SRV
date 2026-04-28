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
import {
  dispatchConversationsUpdated,
  dispatchMessagesUpdated,
  dispatchChatsRead,
} from "../utils/interactionEvents";

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

// Optimistic message status
export type OptimisticMessageStatus = "sending" | "sent" | "failed";

// Optimistic message interface
export interface OptimisticMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: Date;
  status: OptimisticMessageStatus;
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
  const [optimisticMessages, setOptimisticMessages] = useState<
    OptimisticMessage[]
  >([]);
  const [loading, setLoading] = useState(false); // For initial loads only

  // Computed sending status from optimistic messages (for backward compatibility)
  const sendingMessage = optimisticMessages.some((m) => m.status === "sending");
  const [error, setError] = useState<string | null>(null);

  // Cache for user names to avoid repeated API calls without callback churn
  const userNameCacheRef = useRef<Map<string, string>>(new Map());
  const userNamePendingRef = useRef<Map<string, Promise<string>>>(new Map());

  // Real-time listener unsubscribe functions (now async)
  const conversationsUnsubscribe = useRef<AsyncUnsubscribe | null>(null);
  const messagesUnsubscribe = useRef<AsyncUnsubscribe | null>(null);
  const activeConversationIdRef = useRef<string | null>(null);
  const loadConversationRequestIdRef = useRef(0);

  /**
   * Get user name from cache or fetch from auth service
   */
  const getUserName = useCallback(async (userId: string): Promise<string> => {
    // Check cache first
    const cached = userNameCacheRef.current.get(userId);
    if (cached) {
      return cached;
    }

    // Reuse in-flight request for this user to avoid duplicate fetches
    const pending = userNamePendingRef.current.get(userId);
    if (pending) {
      return pending;
    }

    const loadNamePromise = (async (): Promise<string> => {
      try {
        const profile = await authCanisterService.getProfile(userId);
        const userName = profile?.name || `User ${userId.slice(0, 8)}...`;

        userNameCacheRef.current.set(userId, userName);
        return userName;
      } catch (error) {
        const fallbackName = `User ${userId.slice(0, 8)}...`;

        // Cache the fallback name to avoid repeated failed requests
        userNameCacheRef.current.set(userId, fallbackName);
        return fallbackName;
      } finally {
        userNamePendingRef.current.delete(userId);
      }
    })();

    userNamePendingRef.current.set(userId, loadNamePromise);
    return loadNamePromise;
  }, []);

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
   * Setup real-time listener for conversations
   */
  const setupConversationsListener = useCallback(async () => {
    if (!isAuthenticated || !identity || !isMountedRef.current) {
      return;
    }

    const userId = identity.getPrincipal().toString();

    // Cleanup existing listener
    if (conversationsUnsubscribe.current) {
      try {
        await conversationsUnsubscribe.current();
      } catch (error) {}
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

            try {
              // Enhance conversations with user names
              const enhancedConversations =
                await enhanceConversationsWithNames(summaries);

              if (isMountedRef.current) {
                setConversations(enhancedConversations);
                // compute number of conversations that have unread messages for current user
                try {
                  const currentUserId = identity?.getPrincipal().toString();
                  const unreadConversations = enhancedConversations.reduce(
                    (acc, c) => {
                      if (!currentUserId) return acc;
                      const unreadForUser =
                        c.conversation.unreadCount?.[currentUserId] || 0;
                      return acc + (unreadForUser > 0 ? 1 : 0);
                    },
                    0,
                  );
                  dispatchConversationsUpdated({
                    count: enhancedConversations.length,
                    unreadConversations,
                  });
                } catch (e) {}
                setLoading(false);
              }
            } catch (error) {
              if (isMountedRef.current) {
                setError("Could not load conversations.");
                setLoading(false);
              }
            }
          },
          () => {
            if (!isMountedRef.current) return;
            if (isMountedRef.current) {
              setError("Could not load conversations.");
              setLoading(false);
            }
          },
        );
    } catch (error) {
      if (isMountedRef.current) {
        setError("Could not set up conversations listener.");
        setLoading(false);
      }
    }
  }, [isAuthenticated, identity, enhanceConversationsWithNames, isMountedRef]);

  /**
   * Fetch messages for a specific conversation
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
        throw new Error("Could not load messages.");
      }
    },
    [isAuthenticated, identity],
  );

  /**
   * Load messages for the current conversation with real-time listener
   */
  const loadConversation = useCallback(
    async (conversationId: string) => {
      if (!isAuthenticated || !identity) {
        if (isMountedRef.current) {
          loadConversationRequestIdRef.current += 1;
          activeConversationIdRef.current = null;
          setCurrentConversation(null);
          setMessages([]);
        }
        return;
      }

      if (!isMountedRef.current) return;

      const requestId = ++loadConversationRequestIdRef.current;
      activeConversationIdRef.current = conversationId;

      setLoading(true);
      setError(null);

      try {
        // Cleanup existing messages listener
        if (messagesUnsubscribe.current) {
          try {
            await messagesUnsubscribe.current();
          } catch (error) {}
          messagesUnsubscribe.current = null;
        }

        if (!isMountedRef.current) return;

        messagesUnsubscribe.current =
          await chatCanisterService.subscribeToMessages(
            conversationId,
            (rawMessages) => {
              if (!isMountedRef.current) return;
              if (
                loadConversationRequestIdRef.current !== requestId ||
                activeConversationIdRef.current !== conversationId
              ) {
                return;
              }

              try {
                if (isMountedRef.current) {
                  // The service now directly returns FrontendMessage format
                  setMessages(rawMessages as FrontendMessage[]);
                  // notify global listeners messages updated for this conversation
                  try {
                    dispatchMessagesUpdated(conversationId);
                  } catch (e) {}
                  setLoading(false);
                }
              } catch (error) {
                if (isMountedRef.current) {
                  setError("Could not process messages.");
                  setLoading(false);
                }
              }
            },
            () => {
              if (!isMountedRef.current) return;
              if (
                loadConversationRequestIdRef.current !== requestId ||
                activeConversationIdRef.current !== conversationId
              ) {
                return;
              }
              if (isMountedRef.current) {
                setError("Could not load messages.");
                setLoading(false);
              }
            },
          );

        if (
          loadConversationRequestIdRef.current !== requestId ||
          activeConversationIdRef.current !== conversationId
        ) {
          try {
            await messagesUnsubscribe.current?.();
          } catch (error) {}
          messagesUnsubscribe.current = null;
          return;
        }

        // Fetch conversation details after setting up listener
        const conversation =
          await chatCanisterService.getConversation(conversationId);

        if (
          isMountedRef.current &&
          loadConversationRequestIdRef.current === requestId &&
          activeConversationIdRef.current === conversationId
        ) {
          setCurrentConversation(conversation);
        }

        // Mark messages as read
        if (
          isMountedRef.current &&
          loadConversationRequestIdRef.current === requestId &&
          activeConversationIdRef.current === conversationId
        ) {
          await chatCanisterService.markMessagesAsRead(
            conversationId,
            identity.getPrincipal().toString(),
          );
          try {
            dispatchChatsRead();
          } catch (e) {}
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError("Could not load conversation.");
          setLoading(false);
        }
      }
    },
    [isAuthenticated, identity, isMountedRef],
  );

  /**
   * Send a message in the current conversation
   */
  const sendMessage = useCallback(
    async (content: string, receiverId: string, retryMessageId?: string) => {
      if (!isAuthenticated || !identity || !currentConversation) {
        throw new Error("Authentication and active conversation required");
      }

      if (content.trim().length === 0) {
        throw new Error("Message cannot be empty");
      }

      if (content.length > 500) {
        throw new Error("Message cannot exceed 500 characters");
      }

      const currentUserId = identity.getPrincipal().toString();

      // If retrying a failed message, remove the old optimistic message first
      if (retryMessageId) {
        setOptimisticMessages((prev) =>
          prev.filter((m) => m.id !== retryMessageId),
        );
      }

      // Create optimistic message
      const optimisticMsg: OptimisticMessage = {
        id:
          retryMessageId ||
          `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        conversationId: currentConversation.id,
        senderId: currentUserId,
        content: content.trim(),
        createdAt: new Date(),
        status: "sending",
      };

      // Add optimistic message immediately
      setOptimisticMessages((prev) => [...prev, optimisticMsg]);

      setError(null);

      try {
        await chatCanisterService.sendMessage(
          currentConversation.id,
          receiverId,
          content.trim(),
          currentUserId,
        );

        // Update optimistic message status to "sent" instead of removing it.
        // It stays visible with "Sent" text until the real message arrives
        // via subscription, at which point the visibleOptimisticMessages filter
        // will remove it (since it matches the real message by content/time).
        setOptimisticMessages((prev) =>
          prev.map((m) =>
            m.id === optimisticMsg.id
              ? { ...m, status: "sent" as OptimisticMessageStatus }
              : m,
          ),
        );

        return optimisticMsg;
      } catch (err) {
        // Update optimistic message status to failed
        setOptimisticMessages((prev) =>
          prev.map((m) =>
            m.id === optimisticMsg.id
              ? { ...m, status: "failed" as OptimisticMessageStatus }
              : m,
          ),
        );

        setError(
          err instanceof Error ? err.message : "Could not send message.",
        );
        throw err;
      }
    },
    [isAuthenticated, identity, currentConversation],
  );

  /**
   * Retry a failed message
   */
  const retryMessage = useCallback(
    async (messageId: string) => {
      const optimisticMsg = optimisticMessages.find((m) => m.id === messageId);
      if (!optimisticMsg || !currentConversation) {
        return;
      }

      const currentUserId = identity?.getPrincipal().toString();
      if (!currentUserId) return;

      const receiverId =
        currentConversation.clientId === currentUserId
          ? currentConversation.providerId
          : currentConversation.clientId;

      await sendMessage(optimisticMsg.content, receiverId, messageId);
    },
    [optimisticMessages, currentConversation, identity, sendMessage],
  );

  /**
   * Create a new conversation
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

        return newConversation;
      } catch (err) {
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
   */
  const markAsRead = useCallback(
    async (conversationId: string) => {
      if (!isAuthenticated || !identity) {
        return;
      }

      try {
        await chatCanisterService.markMessagesAsRead(
          conversationId,
          identity.getPrincipal().toString(),
        );
        try {
          dispatchChatsRead();
        } catch (e) {}
      } catch (err) {}
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
      const count = convoSummary.conversation.unreadCount?.[currentUserId] || 0;
      return total + (count > 0 ? 1 : 0);
    }, 0);
  }, [conversations, identity]);

  /**
   * Cleanup all real-time listeners
   */
  const cleanupListeners = useCallback(async () => {
    try {
      if (conversationsUnsubscribe.current) {
        await conversationsUnsubscribe.current();
        conversationsUnsubscribe.current = null;
      }
    } catch (error) {}

    try {
      if (messagesUnsubscribe.current) {
        await messagesUnsubscribe.current();
        messagesUnsubscribe.current = null;
      }
    } catch (error) {}
  }, []);

  /**
   * Clear current conversation and messages
   */
  const clearCurrentConversation = useCallback(async () => {
    loadConversationRequestIdRef.current += 1;
    activeConversationIdRef.current = null;

    try {
      if (messagesUnsubscribe.current) {
        await messagesUnsubscribe.current();
        messagesUnsubscribe.current = null;
      }
    } catch (error) {}

    if (isMountedRef.current) {
      setCurrentConversation(null);
      setMessages([]);
      setError(null);
    }
  }, [isMountedRef]);

  // Setup real-time listeners on auth state change
  useEffect(() => {
    if (isAuthenticated && identity && isMountedRef.current) {
      setupConversationsListener();
    } else {
      cleanupListeners();
      if (isMountedRef.current) {
        setConversations([]);
      }
      clearCurrentConversation();
    }

    return () => {
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

  // Filter out optimistic messages that have already arrived via the real-time subscription
  const visibleOptimisticMessages = optimisticMessages.filter((optMsg) => {
    if (optMsg.status === "failed") return true;

    const hasMatchingRealMessage = messages.some((m) => {
      const realContent =
        typeof m.content === "string" ? m.content : m.content?.encryptedText;
      return (
        m.senderId === optMsg.senderId &&
        realContent === optMsg.content &&
        new Date(m.createdAt).getTime() >
          new Date(optMsg.createdAt).getTime() - 5000
      );
    });

    return !hasMatchingRealMessage;
  });

  return {
    conversations,
    currentConversation,
    messages,
    optimisticMessages: visibleOptimisticMessages,
    loading,
    error,
    sendingMessage,
    loadConversation,
    sendMessage,
    retryMessage,
    createConversation,
    markAsRead,
    clearCurrentConversation,
    getUnreadCount,
    fetchMessages,
    getUserName,
  };
};

export default useChat;
