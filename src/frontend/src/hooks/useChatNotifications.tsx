import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import chatCanisterService, {
  FrontendConversationSummary,
  AsyncUnsubscribe,
} from "../services/chatCanisterService";

const CHATS_READ_EVENT = "chats-read";

// Module-level AudioContext so it survives NavigationBar unmount/remount cycles
let sharedAudioCtx: AudioContext | null = null;
let audioPrimerInstalled = false;

function getAudioContext(): AudioContext | null {
  try {
    if (!sharedAudioCtx) {
      sharedAudioCtx = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

function installAudioPrimer() {
  if (audioPrimerInstalled) return;
  audioPrimerInstalled = true;

  const resume = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume();
    }
  };

  document.addEventListener("pointerdown", resume, { once: true });
  document.addEventListener("keydown", resume, { once: true });
  document.addEventListener("touchstart", resume, { once: true });
}

/**
 * Custom hook to manage chat notification state.
 * Subscribes to real-time conversation updates and tracks unread conversation count.
 * Plays a notification sound when new unread conversations arrive.
 */
export const useChatNotifications = () => {
  const { isAuthenticated, identity } = useAuth();
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const conversationsRef = useRef<FrontendConversationSummary[]>([]);
  const unsubscribeRef = useRef<AsyncUnsubscribe | null>(null);
  const prevUnreadMessagesRef = useRef<number>(-1);

  const playNotificationSound = useCallback(() => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      ctx.resume?.();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.25, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.24);
    } catch {}
  }, []);

  // Install global audio primer on first mount
  useEffect(() => {
    installAudioPrimer();
  }, []);

  // Real-time subscription to conversations
  useEffect(() => {
    if (!isAuthenticated || !identity) {
      setUnreadChatCount(0);
      conversationsRef.current = [];
      prevUnreadMessagesRef.current = -1;
      setLoading(false);
      return;
    }

    let cancelled = false;
    const userId = identity.getPrincipal().toString();

    const setup = async () => {
      try {
        const unsubscribe = await chatCanisterService.subscribeToConversationSummaries(
          userId,
          (summaries) => {
            if (cancelled) return;

            conversationsRef.current = summaries;

            const unreadConversations = summaries.reduce((count, s) => {
              const unread = s.conversation.unreadCount?.[userId] || 0;
              return count + (unread > 0 ? 1 : 0);
            }, 0);

            const totalUnreadMessages = summaries.reduce((count, s) => {
              const unread = s.conversation.unreadCount?.[userId] || 0;
              return count + unread;
            }, 0);

            setUnreadChatCount(unreadConversations);
            setLoading(false);

            // Play sound when total unread messages increase (skip initial load)
            if (prevUnreadMessagesRef.current !== -1 && totalUnreadMessages > prevUnreadMessagesRef.current) {
              playNotificationSound();
            }
            prevUnreadMessagesRef.current = totalUnreadMessages;
          },
          () => {
            if (!cancelled) {
              setLoading(false);
            }
          },
        );

        if (cancelled) {
          await unsubscribe();
        } else {
          unsubscribeRef.current = unsubscribe;
        }
      } catch {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    setup();

    return () => {
      cancelled = true;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [isAuthenticated, identity, playNotificationSound]);

  // Sync with chat page mark-as-read events
  useEffect(() => {
    const handleChatsRead = () => {
      // Re-check conversations from the stored ref
      if (!identity) return;
      const userId = identity.getPrincipal().toString();
      const unreadConversations = conversationsRef.current.reduce((count, s) => {
        const unread = s.conversation.unreadCount?.[userId] || 0;
        return count + (unread > 0 ? 1 : 0);
      }, 0);
      const totalUnreadMessages = conversationsRef.current.reduce((count, s) => {
        const unread = s.conversation.unreadCount?.[userId] || 0;
        return count + unread;
      }, 0);
      prevUnreadMessagesRef.current = totalUnreadMessages;
      setUnreadChatCount(unreadConversations);
    };

    window.addEventListener(CHATS_READ_EVENT, handleChatsRead);
    return () => window.removeEventListener(CHATS_READ_EVENT, handleChatsRead);
  }, [identity]);

  /**
   * Mark all conversations as read
   */
  const markChatsAsRead = useCallback(async () => {
    if (!isAuthenticated || !identity) return;

    try {
      const currentUserId = identity.getPrincipal().toString();
      const conversations = conversationsRef.current;

      await Promise.all(
        conversations.map((s) =>
          chatCanisterService.markMessagesAsRead(
            s.conversation.id,
            currentUserId,
          ),
        ),
      );

      setUnreadChatCount(0);
      prevUnreadMessagesRef.current = 0;
      window.dispatchEvent(new CustomEvent(CHATS_READ_EVENT));
    } catch {}
  }, [isAuthenticated, identity]);

  /**
   * Re-fetch conversations manually (forces subscription callback)
   */
  const refreshUnreadCount = useCallback(() => {
    // The real-time subscription handles updates automatically.
    // This is kept for API compatibility.
  }, []);

  return {
    unreadChatCount,
    markChatsAsRead,
    refreshUnreadCount,
    loading,
  };
};

export default useChatNotifications;
