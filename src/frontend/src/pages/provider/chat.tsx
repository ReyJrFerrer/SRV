import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useChat } from "../../hooks/useChat";

// Components
import BottomNavigation from "../../components/provider/NavigationBar";
import { ProfileImage } from "../../components/common/ProfileImage";
import { dispatchChatsRead } from "../../utils/interactionEvents";
import { PaperAirplaneIcon } from "@heroicons/react/24/solid";

const ProviderChatPage: React.FC = () => {
  const { isAuthenticated, identity } = useAuth();
  const [, setTick] = React.useState(0);
  const navigate = useNavigate();
  const {
    conversations,
    loading,
    error,
    markAsRead,
    loadConversation,
    currentConversation,
    messages,
    sendMessage,
    sendingMessage,
  } = useChat();
  const [isDesktop, setIsDesktop] = useState<boolean>(
    window.innerWidth >= 1024,
  );
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [selectedOtherUserName, setSelectedOtherUserName] =
    useState<string>("");
  const [selectedOtherUserImageUrl, setSelectedOtherUserImageUrl] =
    useState<string>("");
  const [messageText, setMessageText] = useState<string>("");
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onConv = () => setTick((t) => t + 1);
    const onMsg = () => setTick((t) => t + 1);
    window.addEventListener("conversations-updated", onConv);
    window.addEventListener("messages-updated", onMsg);
    return () => {
      window.removeEventListener("conversations-updated", onConv);
      window.removeEventListener("messages-updated", onMsg);
    };
  }, []);

  useEffect(() => {
    document.title = "Messages | SRV";
  }, []);

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Auto-select most recent conversation on desktop
  useEffect(() => {
    if (!isDesktop) return;
    if (selectedConversationId) return;
    if (!conversations || conversations.length === 0) return;

    const sorted = conversations.slice().sort((a, b) => {
      const aTime = a.lastMessage?.[0]?.createdAt
        ? new Date(a.lastMessage[0].createdAt).getTime()
        : 0;
      const bTime = b.lastMessage?.[0]?.createdAt
        ? new Date(b.lastMessage[0].createdAt).getTime()
        : 0;
      return bTime - aTime;
    });

    const top = sorted[0];
    if (!top) return;
    const conversationId = top.conversation.id;
    const otherUserId = top.otherUserId;
    const otherUserName =
      top.otherUserName || `User ${otherUserId.slice(0, 8)}...`;
    const imageToUse =
      top.otherUserImageUrl && top.otherUserImageUrl !== ""
        ? top.otherUserImageUrl
        : "/default-client.svg";

    setSelectedConversationId(conversationId);
    setSelectedOtherUserName(otherUserName);
    setSelectedOtherUserImageUrl(imageToUse);
    loadConversation(conversationId);
    markAsRead(conversationId)
      .then(() => dispatchChatsRead())
      .catch(() => {});
  }, [
    isDesktop,
    conversations,
    selectedConversationId,
    loadConversation,
    markAsRead,
  ]);

  // Scroll to bottom on message updates
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, selectedConversationId]);

  const handleConversationClick = async (
    conversationId: string,
    otherUserName: string,
    otherUserImageUrl?: string,
  ) => {
    try {
      await markAsRead(conversationId);
      // Trigger refresh of unread chat badges globally
      dispatchChatsRead();
      const imageToUse = otherUserImageUrl || "/default-client.svg";
      if (isDesktop) {
        setSelectedConversationId(conversationId);
        setSelectedOtherUserName(otherUserName);
        setSelectedOtherUserImageUrl(imageToUse);
        loadConversation(conversationId);
      } else {
        navigate(`/provider/chat/${conversationId}`, {
          state: {
            conversationId,
            otherUserName,
            otherUserImage: imageToUse,
          },
        });
      }
    } catch (error) {}
  };

  // Helper for timestamp formatting (accepts string or Date)
  const formatTimestamp = (dateStr?: string | Date) => {
    if (!dateStr) return "";
    const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffHours / 24;

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
    if (diffDays < 7) return `${Math.floor(diffDays)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-gray-50 pb-24">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex w-full items-center justify-center px-4 py-3">
          <h1 className="text-xl font-extrabold tracking-tight text-black lg:text-2xl">
            Messages
          </h1>
          {/* Add a button for starting a new chat in the future */}
          {/* <button className="rounded-full bg-blue-600 px-3 py-1 text-white font-semibold shadow hover:bg-blue-700 transition-colors text-sm">
            New Chat
          </button> */}
        </div>
      </header>

      <main className="mt-0 w-full px-2 md:px-4">
        {isAuthenticated ? (
          loading ? (
            <div className="m-4 rounded-2xl bg-white/80 p-8 text-center shadow-lg">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
              <p className="text-lg font-medium text-blue-700">
                Loading conversations...
              </p>
            </div>
          ) : error ? (
            <div className="m-4 rounded-2xl bg-white/80 p-8 text-center shadow-lg">
              <p className="mb-4 text-lg text-red-600">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white shadow transition-colors hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          ) : conversations.length > 0 ? (
            <section
              className={`w-full rounded-2xl bg-white/90 shadow-lg ring-1 ring-blue-100 ${isDesktop ? "md:flex md:h-[85vh] md:overflow-hidden" : ""}`}
            >
              <ul
                className={`${isDesktop ? "md:w-[420px] md:flex-shrink-0 md:h-full md:overflow-y-auto" : ""} divide-y divide-blue-50`}
              >
                {conversations
                  .slice() // copy array to avoid mutating original
                  .sort((a, b) => {
                    const aTime = a.lastMessage?.[0]?.createdAt
                      ? new Date(a.lastMessage[0].createdAt).getTime()
                      : 0;
                    const bTime = b.lastMessage?.[0]?.createdAt
                      ? new Date(b.lastMessage[0].createdAt).getTime()
                      : 0;
                    return bTime - aTime;
                  })
                  .map((conversationSummary) => {
                    const conversation = conversationSummary.conversation;
                    const lastMessage =
                      conversationSummary.lastMessage?.[0] || undefined;
                    const currentUserId =
                      identity?.getPrincipal().toString() || "";
                    const otherUserId = conversationSummary.otherUserId;
                    const otherUserName =
                      conversationSummary.otherUserName ||
                      `User ${otherUserId.slice(0, 8)}...`;
                    const otherUserImageUrl =
                      conversationSummary.otherUserImageUrl;
                    // Get unread count for current user (unreadCount is now an object)
                    const unreadCount =
                      conversation.unreadCount[currentUserId] || 0;

                    return (
                      <li
                        key={conversation.id}
                        onClick={() =>
                          handleConversationClick(
                            conversation.id,
                            otherUserName,
                            otherUserImageUrl,
                          )
                        }
                        className={`group flex cursor-pointer items-center space-x-4 px-5 py-4 transition-colors hover:bg-blue-50/70 ${
                          unreadCount > 0 ? "bg-blue-50/60" : ""
                        }`}
                      >
                        <div className="relative h-14 w-14 flex-shrink-0">
                          <ProfileImage
                            profilePictureUrl={otherUserImageUrl}
                            userName={otherUserName}
                            size="h-14 w-14"
                            className="ring-2 ring-blue-200 transition group-hover:ring-blue-400"
                          />
                          {unreadCount > 0 && (
                            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p
                              className={`truncate text-base font-semibold ${unreadCount > 0 ? "text-blue-900" : "text-gray-900"}`}
                            >
                              {otherUserName}
                            </p>
                            <p
                              className={`ml-2 text-xs ${unreadCount > 0 ? "font-bold text-blue-600" : "text-gray-400"}`}
                            >
                              {formatTimestamp(lastMessage?.createdAt)}
                            </p>
                          </div>
                          <div className="mt-1 flex items-start justify-between">
                            <p
                              className={`truncate text-sm ${unreadCount > 0 ? "font-medium text-blue-800" : "text-gray-500"}`}
                            >
                              {lastMessage?.content?.encryptedText ? (
                                lastMessage.content.encryptedText
                              ) : (
                                <span className="italic text-gray-400">
                                  No messages yet
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </li>
                    );
                  })}
              </ul>
              {isDesktop && (
                <div className="md:flex md:flex-1 md:flex-col md:border-l md:border-blue-100 md:overflow-hidden">
                  {selectedConversationId ? (
                    <div className="flex h-full flex-col">
                      {/* Header */}
                      <div className="flex items-center justify-between border-b border-blue-100 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-10">
                            <ProfileImage
                              profilePictureUrl={selectedOtherUserImageUrl}
                              userName={selectedOtherUserName}
                              size="h-10 w-10"
                            />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {selectedOtherUserName}
                            </p>
                          </div>
                        </div>
                      </div>
                      {/* Messages */}
                      <div
                        ref={messagesContainerRef}
                        className="flex-1 space-y-4 overflow-y-auto p-4"
                      >
                        {messages.length === 0 ? (
                          <div className="flex h-full items-center justify-center">
                            <p className="text-gray-500">
                              No messages yet. Start the conversation!
                            </p>
                          </div>
                        ) : (
                          messages.map((message) => {
                            const isMine =
                              identity?.getPrincipal().toString() ===
                              message.senderId;
                            return (
                              <div
                                key={message.id}
                                className={`flex items-end gap-2 ${isMine ? "justify-end" : "justify-start"}`}
                              >
                                {!isMine && (
                                  <div className="relative h-8 w-8 flex-shrink-0">
                                    <ProfileImage
                                      profilePictureUrl={
                                        selectedOtherUserImageUrl
                                      }
                                      userName={selectedOtherUserName}
                                      size="h-8 w-8"
                                    />
                                  </div>
                                )}
                                <div
                                  className={`max-w-xs rounded-2xl px-4 py-2 md:max-w-2xl xl:max-w-3xl ${isMine ? "rounded-br-none bg-blue-600 text-white" : "rounded-bl-none border border-gray-200 bg-white text-gray-800"}`}
                                >
                                  <p className="text-sm">
                                    {typeof message.content === "string"
                                      ? message.content
                                      : message.content?.encryptedText}
                                  </p>
                                  <p
                                    className={`mt-1 text-right text-xs ${isMine ? "text-blue-100" : "text-gray-400"}`}
                                  >
                                    {formatTimestamp(message.createdAt)}
                                  </p>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                      {/* Composer */}
                      <div className="border-t border-blue-100 p-3 md:sticky md:bottom-0 md:bg-white">
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (
                              !messageText.trim() ||
                              !currentConversation ||
                              !identity ||
                              sendingMessage
                            )
                              return;
                            const currentUserId = identity
                              .getPrincipal()
                              .toString();
                            const receiverId =
                              currentConversation.clientId === currentUserId
                                ? currentConversation.providerId
                                : currentConversation.clientId;
                            sendMessage(messageText.trim(), receiverId)
                              .then(() => setMessageText(""))
                              .catch(() => {});
                          }}
                          className="flex items-center gap-3"
                        >
                          <input
                            type="text"
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            placeholder="Type a message..."
                            maxLength={500}
                            disabled={sendingMessage || !currentConversation}
                            className="w-full flex-1 rounded-full border border-transparent bg-gray-100 px-4 py-2 text-base focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                          />
                          <button
                            type="submit"
                            disabled={
                              sendingMessage ||
                              !messageText.trim() ||
                              !currentConversation
                            }
                            className="rounded-full bg-blue-600 p-3 text-white shadow transition-colors hover:bg-blue-700 disabled:bg-gray-300"
                          >
                            <PaperAirplaneIcon className="h-5 w-5" />
                          </button>
                        </form>
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center p-8 text-gray-500">
                      Select a conversation to view messages
                    </div>
                  )}
                </div>
              )}
            </section>
          ) : (
            <div className="m-4 rounded-2xl bg-white/80 p-8 text-center shadow-lg">
              <div className="mb-3 text-4xl">💬</div>
              <p className="mb-2 text-lg font-semibold text-blue-900">
                No conversations yet
              </p>
              <p className="text-sm text-gray-500">
                Your conversations with service providers will appear here after
                booking a service.
              </p>
            </div>
          )
        ) : (
          <div className="m-4 rounded-2xl bg-white/80 p-8 text-center shadow-lg">
            <div className="mb-3 text-4xl">🔒</div>
            <p className="mb-2 text-lg font-semibold text-red-600">
              Please log in to access your messages
            </p>
            <button
              onClick={() => navigate("/login")}
              className="rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white shadow transition-colors hover:bg-blue-700"
            >
              Log In
            </button>
          </div>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
};

export default ProviderChatPage;
