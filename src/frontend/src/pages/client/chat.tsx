import React, { useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useChat } from "../../hooks/useChat";

// Components
import BottomNavigation from "../../components/client/BottomNavigation";
import { ProfileImage } from "../../components/common/ProfileImage";

const ClientChatPage: React.FC = () => {
  const { isAuthenticated, identity } = useAuth();
  const navigate = useNavigate();
  const { conversations, loading, error, markAsRead } = useChat();

  // Set the document title when the component mounts
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
      // Mark conversation as read when clicked
      await markAsRead(conversationId);

      // Use default image if none is provided
      const imageToUse = otherUserImageUrl || DEFAULT_USER_IMAGE;

      // Navigate to the specific chat page and pass conversation info in the state
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
          <h1 className="text-2xl font-extrabold tracking-tight text-black">
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
                {/* Sort conversations by most recent message (received or replied) */}
                {conversations
                  .slice() // copy array to avoid mutating original
                  .sort((a, b) => {
                    const aTime = a.lastMessage?.createdAt
                      ? new Date(a.lastMessage.createdAt).getTime()
                      : 0;
                    const bTime = b.lastMessage?.createdAt
                      ? new Date(b.lastMessage.createdAt).getTime()
                      : 0;
                    return bTime - aTime;
                  })
                  .map((conversationSummary) => {
                    const conversation = conversationSummary.conversation;
                    const lastMessage = conversationSummary.lastMessage;

                    // Use the enhanced data from useChat hook
                    const currentUserId =
                      identity?.getPrincipal().toString() || "";
                    const otherUserId = conversationSummary.otherUserId;
                    const otherUserName =
                      conversationSummary.otherUserName ||
                      `User ${otherUserId.slice(0, 8)}...`;
                    // Use otherUserImageUrl (profile image) if available, fallback to default-provider image
                    const otherUserImageUrl =
                      conversationSummary.otherUserImageUrl &&
                      conversationSummary.otherUserImageUrl !== ""
                        ? conversationSummary.otherUserImageUrl
                        : "";

                    // Get unread count for current user
                    const unreadEntry = conversation.unreadCount.find(
                      (entry) => entry.userId === currentUserId,
                    );
                    const unreadCount = unreadEntry?.count || 0;

                    // Format timestamp
                    const formatTimestamp = (date?: Date) => {
                      if (!date) return "";
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
                            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-xs font-bold text-white shadow-md">
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
                              className={`ml-2 text-xs whitespace-nowrap ${unreadCount > 0 ? "font-bold text-blue-600" : "text-gray-400"}`}
                            >
                              {formatTimestamp(lastMessage?.createdAt)}
                            </p>
                          </div>
                          <div className="mt-1 flex items-start justify-between">
                            <p className="truncate text-sm text-gray-700 group-hover:text-blue-800">
                              {lastMessage?.content || (
                                <span className="text-gray-400 italic">
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
