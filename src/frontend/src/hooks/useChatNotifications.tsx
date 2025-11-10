import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import chatCanisterService from "../services/chatCanisterService";

// A key to store the read status in the browser's local storage (fallback)
const HAS_UNREAD_CHATS_KEY = "hasUnreadChats";
// A custom event name to communicate across components when chats are read.
const CHATS_READ_EVENT = "chats-read";

/**
 * A custom hook to manage the state of chat notifications.
 * Integrates with real chat data from useChat hook with localStorage fallback.
 */
export const useChatNotifications = () => {
  const { isAuthenticated, identity } = useAuth();
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [loading, setLoading] = useState(false);

  /**
   * Fetches real unread count from chat canister
   */
  const fetchRealUnreadCount = useCallback(async (): Promise<number> => {
    if (!isAuthenticated || !identity) {
      return 0;
    }

    try {
      const conversations = await chatCanisterService.getMyConversations();
      const currentUserId = identity.getPrincipal().toString();

      return conversations.reduce((total, convoSummary) => {
        // unreadCount is now an object: { [userId: string]: number }
        const count = convoSummary.conversation.unreadCount[currentUserId] || 0;
        return total + count;
      }, 0);
    } catch (error) {
      return 0;
    }
  }, [isAuthenticated, identity]);

  /**
   * Checks localStorage for fallback unread status (for compatibility)
   */
  const checkFallbackUnreadStatus = useCallback((): number => {
    const hasUnread = localStorage.getItem(HAS_UNREAD_CHATS_KEY);
    if (hasUnread !== "false") {
      // Simulate having 2 unread messages for demonstration (fallback)
      return 2;
    }
    return 0;
  }, []);

  /**
   * Updates unread count from real data or fallback
   */
  const updateUnreadCount = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadChatCount(0);
      return;
    }

    setLoading(true);

    try {
      // Try to get real unread count first
      const realCount = await fetchRealUnreadCount();
      setUnreadChatCount(realCount);
    } catch (error) {
      const fallbackCount = checkFallbackUnreadStatus();
      setUnreadChatCount(fallbackCount);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, fetchRealUnreadCount, checkFallbackUnreadStatus]);

  // Initialize and update unread count when authentication changes
  useEffect(() => {
    updateUnreadCount();
  }, [updateUnreadCount]);

  // Listen for chat read events and refresh count
  useEffect(() => {
    const handleChatsRead = () => {
      updateUnreadCount();
    };

    // Listen for the custom event to update the state
    window.addEventListener(CHATS_READ_EVENT, handleChatsRead);

    // Cleanup function: remove the event listener when the component unmounts
    return () => {
      window.removeEventListener(CHATS_READ_EVENT, handleChatsRead);
    };
  }, [updateUnreadCount]);

  /**
   * Marks all chats as read using real chat service or fallback
   */
  const markChatsAsRead = useCallback(async () => {
    if (!isAuthenticated || !identity) {
      // Update localStorage fallback even when not authenticated
      localStorage.setItem(HAS_UNREAD_CHATS_KEY, "false");
      window.dispatchEvent(new CustomEvent(CHATS_READ_EVENT));
      return;
    }

    try {
      // Get all conversations and mark them as read
      const conversations = await chatCanisterService.getMyConversations();

      // Mark each conversation as read (in parallel for better performance)
      await Promise.all(
        conversations.map((conversationSummary) =>
          chatCanisterService.markMessagesAsRead(
            conversationSummary.conversation.id,
          ),
        ),
      );

      // Update local state immediately
      setUnreadChatCount(0);

      // Also update localStorage fallback for compatibility
      localStorage.setItem(HAS_UNREAD_CHATS_KEY, "false");
      window.dispatchEvent(new CustomEvent(CHATS_READ_EVENT));
    } catch (error) {
      // Fallback to localStorage method
      localStorage.setItem(HAS_UNREAD_CHATS_KEY, "false");
      window.dispatchEvent(new CustomEvent(CHATS_READ_EVENT));
    }
  }, [isAuthenticated, identity]);

  /**
   * Refresh unread count manually (useful for polling or manual updates)
   */
  const refreshUnreadCount = useCallback(() => {
    updateUnreadCount();
  }, [updateUnreadCount]);

  return {
    unreadChatCount,
    markChatsAsRead,
    refreshUnreadCount,
    loading,
  };
};
