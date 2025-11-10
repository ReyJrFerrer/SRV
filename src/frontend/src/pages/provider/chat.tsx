import React, { useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useChat } from "../../hooks/useChat";

// Components
import BottomNavigation from "../../components/provider/NavigationBar";
import { ProfileImage } from "../../components/common/ProfileImage";

const ProviderChatPage: React.FC = () => {
  const { isAuthenticated, identity } = useAuth();
  const navigate = useNavigate();
  const { conversations, loading, error, markAsRead } = useChat();

  useEffect(() => {
    document.title = "Messages | SRV";
  }, []);

  const handleConversationClick = async (
    conversationId: string,
    otherUserName: string,
    otherUserImageUrl?: string,
  ) => {
    try {
      await markAsRead(conversationId);
      navigate(`/provider/chat/${conversationId}`, {
        state: {
          conversationId,
          otherUserName,
          otherUserImage: otherUserImageUrl,
        },
      });
    } catch (error) {
    }
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

      <main className="mx-auto mt-6 max-w-3xl px-2">
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
            <section className="rounded-2xl bg-white/90 shadow-lg ring-1 ring-blue-100">
              <ul className="divide-y divide-blue-50">
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
