import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import useChat from "../../hooks/useChat";
import { useAuth } from "../../context/AuthContext";
import { ProfileImage } from "../common/ProfileImage";
import {
  ChatBubbleOvalLeftEllipsisIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
} from "@heroicons/react/24/solid";
import { useLocation } from "react-router-dom";

type ViewMode = "list" | "conversation";

interface ActiveConversationState {
  conversationId: string;
  otherUserId: string;
  otherUserName: string;
  otherUserImageUrl?: string;
}

const DESKTOP_MIN_WIDTH = 1024; // Tailwind lg breakpoint

const GlobalChatDock: React.FC = () => {
  const { isAuthenticated, identity } = useAuth();
  const {
    conversations,
    messages,
    loadConversation,
    sendMessage,
    markAsRead,
    clearCurrentConversation,
    error,
  } = useChat();

  // Dock visibility & state
  const [isVisible, setIsVisible] = useState(false); // open vs closed (bubble hidden)
  const [isMinimized, setIsMinimized] = useState(false); // popup minimized to bubble
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [activeConversation, setActiveConversation] =
    useState<ActiveConversationState | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [isDesktop, setIsDesktop] = useState<boolean>(
    window.innerWidth >= DESKTOP_MIN_WIDTH,
  );
  const prevUnreadRef = useRef<number>(0);
  const prevUnreadMapRef = useRef<Map<string, number>>(new Map());
  const defaultTitleRef = useRef<string>(document.title);
  const [sending, setSending] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ensureAudioReady = useCallback(() => {
    try {
      let ctx = audioCtxRef.current;
      if (!ctx) {
        ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioCtxRef.current = ctx as AudioContext;
      }
      ctx.resume?.();
    } catch {
      // ignore
    }
  }, []);
  const location = useLocation();
  const path = location.pathname;
  const shouldHide =
    /\/client\/chat(\/|$)/.test(path) ||
    /\/provider\/chat(\/|$)/.test(path) ||
    /\/create-profile/.test(path);

  // Current user principal
  const myPrincipal = identity?.getPrincipal().toString();

  // Sound toggle persisted
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem("chatSoundEnabled");
      return v !== "false"; // default on
    } catch {
      return true;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("chatSoundEnabled", soundEnabled ? "true" : "false");
    } catch {}
  }, [soundEnabled]);

  const playMessageSound = useCallback(() => {
    try {
      if (!soundEnabled) return;
      ensureAudioReady();
      const ctx = audioCtxRef.current!;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880; // A5
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.25, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.24);
    } catch {
      // ignore audio errors
    }
  }, [soundEnabled, ensureAudioReady]);

  // Track window resize to disable on mobile
  useEffect(() => {
    const handleResize = () => {
      const desktopNow = window.innerWidth >= DESKTOP_MIN_WIDTH;
      setIsDesktop(desktopNow);
      if (!desktopNow) {
        // Reset when leaving desktop
        setIsVisible(false);
        setIsMinimized(false);
        setActiveConversation(null);
        clearCurrentConversation();
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [clearCurrentConversation]);

  // Persist minimized state across sessions via localStorage
  useEffect(() => {
    const storedMin = localStorage.getItem("chatDockMinimized");
    if (storedMin === "true") setIsMinimized(true);
  }, []);
  useEffect(() => {
    localStorage.setItem("chatDockMinimized", isMinimized ? "true" : "false");
  }, [isMinimized]);

  const openConversation = useCallback(
    async (c: ActiveConversationState) => {
      setActiveConversation(c);
      setViewMode("conversation");
      setIsVisible(true);
      setIsMinimized(false);
      await loadConversation(c.conversationId);
      await markAsRead(c.conversationId);
    },
    [loadConversation, markAsRead],
  );

  // Detect new conversations and auto-open the latest if not minimized
  const prevConversationIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const currentIds = new Set(conversations.map((c) => c.conversation.id));
    const newlyAdded: string[] = [];
    currentIds.forEach((id) => {
      if (!prevConversationIdsRef.current.has(id)) newlyAdded.push(id);
    });
    if (newlyAdded.length > 0 && !isMinimized) {
      const newSummary = conversations.find((s) =>
        newlyAdded.includes(s.conversation.id),
      );
      if (newSummary) {
        openConversation({
          conversationId: newSummary.conversation.id,
          otherUserId: newSummary.otherUserId,
          otherUserName:
            newSummary.otherUserName || newSummary.otherUserId.slice(0, 8),
          otherUserImageUrl: newSummary.otherUserImageUrl,
        });
      } else {
        setIsVisible(true);
      }
    }
    prevConversationIdsRef.current = currentIds;
  }, [conversations, isMinimized, openConversation]);

  // Compute unread total for current user only
  const unreadTotal = useMemo(() => {
    try {
      return conversations.reduce((sum, summary) => {
        const c = summary.conversation;
        if (!c || !c.unreadCount) return sum;
        if (myPrincipal === c.clientId) {
          return sum + (c.unreadCount[c.clientId] || 0);
        } else if (myPrincipal === c.providerId) {
          return sum + (c.unreadCount[c.providerId] || 0);
        }
        return sum;
      }, 0);
    } catch {
      return 0;
    }
  }, [conversations, myPrincipal]);

  // Auto open on new unread message (only when authenticated on desktop)
  useEffect(() => {
    if (!isAuthenticated || !isDesktop) return;
    const unread = unreadTotal;
    if (unread > prevUnreadRef.current) {
      // A new message arrived
      if (!isVisible) setIsVisible(true);
      if (isMinimized) setIsMinimized(false);
      playMessageSound();
      // Keep in list mode if no active conversation
    }
    prevUnreadRef.current = unread;
  }, [
    unreadTotal,
    isAuthenticated,
    isDesktop,
    isVisible,
    isMinimized,
    playMessageSound,
  ]);

  // On first load, prime unread ref
  useEffect(() => {
    prevUnreadRef.current = unreadTotal;
  }, [unreadTotal]);

  // Restore title on unmount
  useEffect(() => {
    return () => {
      try {
        document.title = defaultTitleRef.current;
      } catch {}
    };
  }, []);

  // Update tab title with sender name when a new unread appears
  useEffect(() => {
    if (!isAuthenticated || !isDesktop) return;
    let updated = false;
    conversations.forEach((summary) => {
      const c = summary.conversation;
      if (!c || !c.unreadCount) return;
      let unreadForUser = 0;
      if (myPrincipal === c.clientId) unreadForUser = c.unreadCount[c.clientId] || 0;
      else if (myPrincipal === c.providerId) unreadForUser = c.unreadCount[c.providerId] || 0;
      const prev = prevUnreadMapRef.current.get(c.id) || 0;
      if (!updated && unreadForUser > prev) {
        const sender = summary.otherUserName || summary.otherUserId.slice(0, 8);
        try {
          document.title = `(${unreadTotal}) ${sender} sent you a message`;
        } catch {}
        updated = true;
      }
      prevUnreadMapRef.current.set(c.id, unreadForUser);
    });
    if (!updated && unreadTotal === 0) {
      try {
        document.title = defaultTitleRef.current;
      } catch {}
    }
  }, [conversations, myPrincipal, isAuthenticated, isDesktop, unreadTotal]);

  const handleSend = async () => {
    if (!activeConversation || !messageInput.trim() || sending) return;
    const content = messageInput.trim();
    setSending(true);
    try {
      await sendMessage(content, activeConversation.otherUserId);
      setMessageInput("");
      // Refresh to ensure other chat pages reflect immediately
      await loadConversation(activeConversation.conversationId);
    } catch {
      // Keep input for retry
    } finally {
      setSending(false);
    }
  };

  const handleBackToList = () => {
    setViewMode("list");
    setActiveConversation(null);
    clearCurrentConversation();
  };

  // Determine unread totals and header style based on active conversation and overall unseen conversations
  // use memoized unreadTotal computed above

  const headerClass =
    unreadTotal > 0
      ? "flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-700 px-3 py-2 text-white"
      : "flex items-center justify-between bg-gray-200 px-3 py-2 text-gray-900";

  const headerUsesDarkText = unreadTotal === 0; // true => use dark text/icon styles

  if (!isAuthenticated || !isDesktop || shouldHide) return null; // Do not render for mobile, unauthenticated, or dedicated chat pages

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[300] select-none">
      {/* Bubble when minimized or not visible */}
      {!isVisible || isMinimized ? (
        <button
          onClick={() => {
            setIsVisible(true);
            setIsMinimized(false);
            ensureAudioReady();
          }}
          className={`pointer-events-auto relative flex h-16 w-16 items-center justify-center rounded-full text-white shadow-lg transition-colors ${unreadTotal > 0 ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-600 hover:bg-gray-500"}`}
          aria-label="Open messages"
        >
          <span className="sr-only">Open messages</span>
          <ChatBubbleOvalLeftEllipsisIcon className="h-7 w-7" />
          {unreadTotal > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-bold text-blue-600">
              {unreadTotal}
            </span>
          )}
        </button>
      ) : null}

      {/* Popup Panel */}
      {isVisible && !isMinimized && (
        <div className="pointer-events-auto flex h-[560px] min-h-0 w-96 flex-col overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-2xl">
          {/* Header */}
          <div className={headerClass}>
            <div className="flex items-center gap-2">
              {viewMode === "conversation" && activeConversation ? (
                <button
                  onClick={handleBackToList}
                  aria-label="Back to conversations"
                  className={
                    headerUsesDarkText
                      ? "rounded p-1 text-gray-600 hover:bg-gray-200"
                      : "rounded p-1 text-white/90 hover:bg-blue-500"
                  }
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-5 w-5"
                  >
                    <path
                      fillRule="evenodd"
                      d="M11.78 5.22a.75.75 0 0 1 0 1.06L7.31 10.75H19.5a.75.75 0 0 1 0 1.5H7.31l4.47 4.47a.75.75 0 1 1-1.06 1.06l-5.75-5.75a.75.75 0 0 1 0-1.06l5.75-5.75a.75.75 0 0 1 1.06 0Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              ) : null}
              {viewMode === "conversation" && activeConversation ? (
                <div className="flex items-center gap-2">
                  {activeConversation.otherUserImageUrl && (
                    <img
                      src={activeConversation.otherUserImageUrl}
                      alt={activeConversation.otherUserName}
                      className="h-7 w-7 rounded-full border border-white object-cover"
                    />
                  )}
                  <span className="max-w-[160px] truncate text-base font-semibold">
                    {activeConversation.otherUserName}
                  </span>
                </div>
              ) : (
                <span className="text-base font-semibold">Conversations</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSoundEnabled((v) => !v)}
                aria-label={soundEnabled ? "Disable sound" : "Enable sound"}
                className={
                  headerUsesDarkText
                    ? "rounded p-1 text-gray-600 hover:bg-gray-200"
                    : "rounded p-1 text-white/90 hover:bg-blue-500"
                }
                title={soundEnabled ? "Sound on" : "Sound off"}
                onMouseDown={ensureAudioReady}
              >
                {soundEnabled ? (
                  <SpeakerWaveIcon className="h-5 w-5" />
                ) : (
                  <SpeakerXMarkIcon className="h-5 w-5" />
                )}
              </button>
              <button
                onClick={() => setIsMinimized(true)}
                aria-label="Minimize chat"
                className={
                  headerUsesDarkText
                    ? "rounded p-1 text-gray-600 hover:bg-gray-200"
                    : "rounded p-1 text-white/90 hover:bg-blue-500"
                }
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-5 w-5"
                >
                  <path d="M5 18.75a.75.75 0 0 1 .75-.75h12.5a.75.75 0 0 1 0 1.5H5.75a.75.75 0 0 1-.75-.75Z" />
                </svg>
              </button>
            </div>
          </div>
          {/* Body */}
          {viewMode === "list" && (
            <div className="min-h-0 flex-1 overflow-y-auto bg-white">
              {conversations.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  No conversations yet.
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {conversations
                    .slice()
                    .sort((a, b) => {
                      const aTime = a.lastMessage?.[0]?.createdAt
                        ? new Date(a.lastMessage[0].createdAt).getTime()
                        : 0;
                      const bTime = b.lastMessage?.[0]?.createdAt
                        ? new Date(b.lastMessage[0].createdAt).getTime()
                        : 0;
                      return bTime - aTime;
                    })
                    .map((summary) => {
                      const conversation = summary.conversation;
                      const last = summary.lastMessage?.[0];
                      const unreadForUser = (() => {
                        try {
                          if (myPrincipal === conversation.clientId) {
                            return (
                              conversation.unreadCount[conversation.clientId] ||
                              0
                            );
                          }
                          if (myPrincipal === conversation.providerId) {
                            return (
                              conversation.unreadCount[
                                conversation.providerId
                              ] || 0
                            );
                          }
                          return 0;
                        } catch {
                          return 0;
                        }
                      })();
                      return (
                        <li
                          key={conversation.id}
                          onClick={() =>
                            openConversation({
                              conversationId: conversation.id,
                              otherUserId: summary.otherUserId,
                              otherUserName:
                                summary.otherUserName ||
                                summary.otherUserId.slice(0, 8),
                              otherUserImageUrl: summary.otherUserImageUrl,
                            })
                          }
                          className="group flex cursor-pointer items-start gap-3 px-4 py-3 text-base hover:bg-blue-50"
                        >
                          <div className="mt-0.5 flex-shrink-0">
                            <ProfileImage
                              profilePictureUrl={summary.otherUserImageUrl}
                              userName={
                                summary.otherUserName ||
                                summary.otherUserId.slice(0, 8)
                              }
                              size="h-10 w-10"
                            />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="truncate font-medium text-gray-900 group-hover:text-blue-700">
                                {summary.otherUserName ||
                                  summary.otherUserId.slice(0, 12)}
                              </span>
                              {unreadForUser > 0 && (
                                <span className="ml-2 rounded-full bg-blue-600 px-2.5 py-0.5 text-sm font-bold text-white">
                                  {unreadForUser}
                                </span>
                              )}
                            </div>
                            <p className="truncate text-xs text-gray-500">
                              {last?.content?.encryptedText || "No messages"}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                </ul>
              )}
            </div>
          )}
          {viewMode === "conversation" && activeConversation && (
            <div className="flex min-h-0 flex-1 flex-col bg-white">
              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
                {messages.length === 0 ? (
                  <div className="text-center text-xs text-gray-500">
                    No messages yet.
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {messages.map((m) => {
                      const myPrincipal = identity?.getPrincipal().toString();
                      const isMine = m.senderId === myPrincipal;
                      return (
                        <li
                          key={m.id}
                          className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                        >
                          <span
                            className={`max-w-[70%] rounded-lg px-3 py-2 text-sm shadow ${isMine ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"}`}
                          >
                            {typeof m.content === "string"
                              ? m.content
                              : m.content?.encryptedText || ""}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <div className="border-t border-gray-200 p-2">
                {error && (
                  <div className="mb-1 rounded bg-red-50 px-3 py-1.5 text-[11px] text-red-600">
                    {error}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Type a message..."
                    className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!messageInput.trim() || sending}
                    className={`rounded px-4 py-2 text-sm font-semibold text-white shadow transition-colors ${sending ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"} disabled:opacity-40`}
                  >
                    {sending ? "Sending..." : "Send"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalChatDock;
