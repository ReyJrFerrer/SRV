import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { ArrowLeftIcon, PaperAirplaneIcon } from "@heroicons/react/24/solid";
import BottomNavigation from "../../../components/provider/NavigationBar";
import { useChat } from "../../../hooks/useChat";
import { useAuth } from "../../../context/AuthContext";
import { ProfileImage } from "../../../components/common/ProfileImage";
import { authCanisterService } from "../../../services/authCanisterService";

const ConversationPage: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { identity } = useAuth();
  const {
    currentConversation,
    messages,
    sendMessage,
    loadConversation,
    markAsRead,
    sendingMessage,
    getUserName,
  } = useChat();

  const [messageText, setMessageText] = useState("");
  const [otherUserName, setOtherUserName] = useState<string>("");
  const [otherUserImageUrl, setOtherUserImageUrl] = useState<
    string | undefined
  >(undefined);

  // Get conversation info from location state or use defaults
  useEffect(() => {
    if (location.state?.otherUserName) {
      setOtherUserName(location.state.otherUserName);
    } else if (location.state?.conversationId) {
      setOtherUserName("Chat");
    } else {
      setOtherUserName(clientId || "Client");
    }

    if (location.state?.otherUserImage) {
      setOtherUserImageUrl(location.state.otherUserImage);
    }
  }, [location.state, clientId]);

  // Load conversation when conversationId changes
  useEffect(() => {
    const conversationId = location.state?.conversationId || clientId;
    if (conversationId && identity) {
      // Use non-silent load for initial conversation loading
      loadConversation(conversationId);
    }
  }, [clientId, location.state?.conversationId, identity, loadConversation]);

  // Update user name when conversation loads
  useEffect(() => {
    if (currentConversation && identity) {
      const currentUserId = identity.getPrincipal().toString();
      const otherUserId =
        currentConversation.clientId === currentUserId
          ? currentConversation.providerId
          : currentConversation.clientId;

      // Fetch the other user's name
      getUserName(otherUserId).then(setOtherUserName).catch();

      // Fetch the other user's profile picture if not already set
      if (!otherUserImageUrl) {
        fetchOtherUserProfile(otherUserId);
      }
    }
  }, [currentConversation, identity, getUserName, otherUserImageUrl]);

  // Function to fetch the other user's profile picture
  const fetchOtherUserProfile = async (userId: string) => {
    try {
      const profile = await authCanisterService.getProfile(userId);
      if (
        profile &&
        profile.profilePicture &&
        profile.profilePicture.imageUrl
      ) {
        setOtherUserImageUrl(profile.profilePicture.imageUrl);
      }
    } catch (error) {
    }
  };

  // Mark messages as read when conversation loads
  useEffect(() => {
    if (currentConversation && messages.length > 0) {
      markAsRead(currentConversation.id);
    }
  }, [currentConversation, messages, markAsRead]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle sending a new message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !messageText.trim() ||
      !currentConversation ||
      !identity ||
      sendingMessage
    )
      return;

    try {
      // Determine the receiver ID (the other participant in the conversation)
      const currentUserId = identity.getPrincipal().toString();
      const receiverId =
        currentConversation.clientId === currentUserId
          ? currentConversation.providerId
          : currentConversation.clientId;

      await sendMessage(messageText.trim(), receiverId);
      setMessageText("");
    } catch (error) {
    }
  };

  const handleReportClick = () => {
    navigate("/provider/report");
  };

  // Format timestamp for display
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

  // Determine if message is from current user
  const isFromCurrentUser = (senderId: string): boolean => {
    if (!identity) return false;
    return senderId === identity.getPrincipal().toString();
  };

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center border-b border-gray-200 bg-white p-3">
        <button
          onClick={() => navigate(-1)}
          className="rounded-full p-2 hover:bg-gray-100"
        >
          <ArrowLeftIcon className="h-6 w-6 text-gray-700" />
        </button>
        <div className="ml-3 flex flex-1 items-center justify-between">
          <div className="relative h-10 w-10">
            <ProfileImage
              profilePictureUrl={otherUserImageUrl}
              userName={otherUserName}
              size="h-10 w-10"
            />
          </div>
          <div className="ml-3 flex flex-1 items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {otherUserName}
              </h1>
            </div>
            <button
              onClick={handleReportClick}
              className="group relative flex items-center justify-center rounded-lg bg-gray-100 p-2 text-gray-500 shadow-sm transition-colors hover:bg-red-100 hover:text-red-600"
              title="Report this user"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <main className="flex-1 space-y-4 overflow-y-auto p-4 pb-32">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-gray-500">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const fromCurrentUser = isFromCurrentUser(message.senderId);
            return (
              <div
                key={message.id}
                className={`flex items-end gap-2 ${fromCurrentUser ? "justify-end" : "justify-start"}`}
              >
                {!fromCurrentUser && (
                  <div className="relative h-8 w-8 flex-shrink-0">
                    <ProfileImage
                      profilePictureUrl={otherUserImageUrl}
                      userName={otherUserName}
                      size="h-8 w-8"
                    />
                  </div>
                )}
                <div
                  className={`max-w-xs rounded-2xl px-4 py-2 md:max-w-md lg:max-w-lg ${
                    fromCurrentUser
                      ? "rounded-br-none bg-blue-600 text-white"
                      : "rounded-bl-none border border-gray-200 bg-white text-gray-800"
                  }`}
                >
                  <p className="text-sm">
                    {typeof message.content === "string"
                      ? message.content
                      : message.content.encryptedText}
                  </p>
                  <p
                    className={`mt-1 text-right text-xs ${
                      fromCurrentUser ? "text-blue-100" : "text-gray-400"
                    }`}
                  >
                    {formatTimestamp(message.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Message Input */}
      <footer className="fixed bottom-16 left-0 z-20 w-full border-t border-gray-200 bg-white p-3 md:bottom-0">
        <form
          onSubmit={handleSendMessage}
          className="mx-auto flex max-w-3xl items-center gap-3"
        >
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Type a message..."
            maxLength={500}
            disabled={sendingMessage || !currentConversation}
            className="w-full flex-1 rounded-full border border-transparent bg-gray-100 px-4 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={
              sendingMessage || !messageText.trim() || !currentConversation
            }
            className="rounded-full bg-blue-600 p-3 text-white transition-colors hover:bg-blue-700 disabled:bg-gray-300"
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        </form>
        {messageText.length > 400 && (
          <p className="mt-1 text-center text-xs text-gray-500">
            {500 - messageText.length} characters remaining
          </p>
        )}
      </footer>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 z-30 w-full">
        <BottomNavigation />
      </div>
    </div>
  );
};

export default ConversationPage;
