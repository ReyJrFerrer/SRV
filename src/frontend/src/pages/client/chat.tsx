// SECTION: Imports — dependencies for this page
import React, { useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useChat } from "../../hooks/useChat";
import BottomNavigation from "../../components/client/NavigationBar";
import { ProfileImage } from "../../components/common/ProfileImage";

const ClientChatPage: React.FC = () => {
  const { isAuthenticated, identity } = useAuth();
  const navigate = useNavigate();
  const { conversations, loading, error, markAsRead } = useChat();

  useEffect(() => {
    document.title = "Messages | SRV";
  }, []);

  const DEFAULT_USER_IMAGE = "/default-provider.svg";
  const handleConversationClick = async (
    conversationId: string,
    otherUserName: string,
    otherUserImageUrl?: string,
  ) => {
    try {
      await markAsRead(conversationId);
      const imageToUse = otherUserImageUrl || DEFAULT_USER_IMAGE;
      navigate(`/client/chat/${conversationId}`, {
        state: {
          conversationId,
          otherUserName,
          otherUserImage: imageToUse,
        },
      });
    } catch {}
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-100 pb-20">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-4xl justify-center px-4 py-3">
          <h1 className="text-xl font-extrabold tracking-tight text-black lg:text-2xl">
            Messages
          </h1>
        </div>
      </header>

      <div className="mx-auto mt-6 max-w-2xl px-2 md:px-0">
        {isAuthenticated ? (
          loading ? (
            <div className="m-4 rounded-xl bg-white p-6 text-center shadow-md">
              <p className="text-lg text-gray-600">Loading conversations...</p>
            </div>
          ) : error ? (
            <div className="m-4 rounded-xl bg-white p-6 text-center shadow-md">
              <p className="mb-4 text-lg text-red-600">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          ) : conversations.length > 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white shadow-md">
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
                      conversationSummary.otherUserImageUrl &&
                      conversationSummary.otherUserImageUrl !== ""
                        ? conversationSummary.otherUserImageUrl
                        : "";
                    const unreadCount =
                      conversation.unreadCount[currentUserId] || 0;
                    const formatTimestamp = (dateStr?: string | Date) => {
                      if (!dateStr) return "";
                      const date =
                        typeof dateStr === "string"
                          ? new Date(dateStr)
                          : dateStr;
                      const now = new Date();
                      const diffMs = now.getTime() - date.getTime();
                      const diffHours = diffMs / (1000 * 60 * 60);
                      const diffDays = diffHours / 24;

                      if (diffHours < 1) return "Just now";
                      if (diffHours < 24)
                        return `${Math.floor(diffHours)}h ago`;
                      if (diffDays < 7) return `${Math.floor(diffDays)}d ago`;
                      return date.toLocaleDateString();
                    };

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
                        className="group flex cursor-pointer items-center space-x-4 p-4 transition-all hover:bg-blue-50"
                      >
                        <div className="relative h-14 w-14 flex-shrink-0">
                          <ProfileImage
                            profilePictureUrl={otherUserImageUrl}
                            userName={otherUserName}
                            size="h-14 w-14"
                            className=""
                          />
                          {unreadCount > 0 && (
                            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-xs font-bold text-white shadow-md">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="truncate text-base font-semibold text-blue-900 group-hover:text-yellow-600">
                              {otherUserName}
                            </p>
                            <p
                              className={`ml-2 whitespace-nowrap text-xs ${unreadCount > 0 ? "font-bold text-blue-600" : "text-gray-400"}`}
                            >
                              {formatTimestamp(lastMessage?.createdAt)}
                            </p>
                          </div>
                          <div className="mt-1 flex items-start justify-between">
                            <p className="truncate text-sm text-gray-700 group-hover:text-blue-800">
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
            </div>
          ) : (
            <div className="m-4 rounded-xl bg-white p-6 text-center shadow-md">
              <div className="mb-3 text-4xl">💬</div>
              <p className="mb-4 text-lg text-gray-600">No conversations yet</p>
              <p className="text-sm text-gray-500">
                Your conversations with service providers will appear here after
                booking a service.
              </p>
            </div>
          )
        ) : (
          <div className="m-4 rounded-xl bg-white p-6 text-center shadow-md">
            <p className="mb-4 text-lg text-red-600">
              Please log in to access your messages
            </p>
            <button
              onClick={() => navigate("/login")}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
            >
              Log In
            </button>
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
};

export default ClientChatPage;
