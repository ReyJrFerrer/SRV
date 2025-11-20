import React, { useEffect, useRef, useState, useCallback } from "react";
import useChat from "../../hooks/useChat";
import { useAuth } from "../../context/AuthContext";
import { ProfileImage } from "../common/ProfileImage";
import { ChatBubbleOvalLeftEllipsisIcon } from "@heroicons/react/24/solid";
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
    getUnreadCount,
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
  const [sending, setSending] = useState(false);
  const location = useLocation();
  const path = location.pathname;
  const shouldHide =
    /\/client\/chat(\/|$)/.test(path) || /\/provider\/chat(\/|$)/.test(path);

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

  // Auto open on new unread message (only when authenticated on desktop)
  useEffect(() => {
    if (!isAuthenticated || !isDesktop) return;
    const unread = getUnreadCount();
    if (unread > prevUnreadRef.current && prevUnreadRef.current !== 0) {
      // A new message arrived
      if (!isVisible) setIsVisible(true);
      if (isMinimized) setIsMinimized(false);
      // Keep in list mode if no active conversation
    }
    prevUnreadRef.current = unread;
  }, [getUnreadCount, isAuthenticated, isDesktop, isVisible, isMinimized]);

  // On first load, prime unread ref
  useEffect(() => {
    prevUnreadRef.current = getUnreadCount();
  }, [getUnreadCount]);

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
  const unreadTotal = getUnreadCount();

  const headerClass =
    unreadTotal > 0
      ? "flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-700 px-3 py-2 text-white"
      : "flex items-center justify-between bg-gray-200 px-3 py-2 text-gray-900";

  const headerUsesDarkText = unreadTotal === 0; // true => use dark text/icon styles

  if (!isAuthenticated || !isDesktop || shouldHide) return null; // Do not render for mobile, unauthenticated, or dedicated chat pages

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[300] select-none">
      {/* Bubble when minimized or not visible */}
      {!isVisible || isMinimized ? (
        <button
          onClick={() => {
            setIsVisible(true);
            setIsMinimized(false);
          }}
          className={`pointer-events-auto relative flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition-colors ${unreadTotal > 0 ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-600 hover:bg-gray-500"}`}
          aria-label="Open messages"
        >
          <span className="sr-only">Open messages</span>
          <ChatBubbleOvalLeftEllipsisIcon className="h-6 w-6" />
          {unreadTotal > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-blue-600">
              {unreadTotal}
            </span>
          )}
        </button>
      ) : null}

      {/* Popup Panel */}
      {isVisible && !isMinimized && (
        <div className="pointer-events-auto flex h-[420px] min-h-0 w-80 flex-col overflow-hidden rounded-xl border border-blue-200 bg-white shadow-2xl">
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
                    className="h-4 w-4"
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
                      className="h-6 w-6 rounded-full border border-white object-cover"
                    />
                  )}
                  <span className="max-w-[120px] truncate text-sm font-semibold">
                    {activeConversation.otherUserName}
                  </span>
                </div>
              ) : (
                <span className="text-sm font-semibold">Conversations</span>
              )}
            </div>
            <div className="flex items-center gap-1">
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
                  className="h-4 w-4"
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
                      const unreadForUser =
                        conversation.unreadCount[conversation.clientId] ||
                        conversation.unreadCount[conversation.providerId] ||
                        0;
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
                          className="group flex cursor-pointer items-start gap-3 px-3 py-2 text-sm hover:bg-blue-50"
                        >
                          <div className="mt-0.5 flex-shrink-0">
                            <ProfileImage
                              profilePictureUrl={summary.otherUserImageUrl}
                              userName={
                                summary.otherUserName ||
                                summary.otherUserId.slice(0, 8)
                              }
                              size="h-8 w-8"
                            />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="truncate font-medium text-gray-900 group-hover:text-blue-700">
                                {summary.otherUserName ||
                                  summary.otherUserId.slice(0, 12)}
                              </span>
                              {unreadForUser > 0 && (
                                <span className="ml-2 rounded-full bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">
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
                            className={`max-w-[70%] rounded-lg px-2 py-1 text-xs shadow ${isMine ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"}`}
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
                  <div className="mb-1 rounded bg-red-50 px-2 py-1 text-[10px] text-red-600">
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
                    className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!messageInput.trim() || sending}
                    className={`rounded px-3 py-1 text-xs font-semibold text-white shadow transition-colors ${sending ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"} disabled:opacity-40`}
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
