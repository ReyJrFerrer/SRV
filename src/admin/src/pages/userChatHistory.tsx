import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { adminServiceCanister } from "../services/adminServiceCanister";
import { authCanisterService } from "../../../frontend/src/services/authCanisterService";
import { ArrowLeftIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { ProfileImage } from "../../../frontend/src/components/common/ProfileImage";

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
}

export const UserChatHistoryPage: React.FC = () => {
  const { id: userId, conversationId } = useParams<{ id: string; conversationId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const DEFAULT_USER_IMAGE = "/default-provider.svg";
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otherUserName, setOtherUserName] = useState<string>("");
  const [otherUserId, setOtherUserId] = useState<string>("");
  const [otherUserImage, setOtherUserImage] = useState<string>(DEFAULT_USER_IMAGE);
  const [userName, setUserName] = useState<string>("");
  const [userImage, setUserImage] = useState<string>(DEFAULT_USER_IMAGE);

  useEffect(() => {
    if (conversationId && userId) {
      // Get data from navigation state or fetch
      if (location.state) {
        setOtherUserName(location.state.otherUserName || "");
        setOtherUserId(location.state.otherUserId || "");
        const navImage = location.state.otherUserImage;
        const isDefault = !navImage || navImage === DEFAULT_USER_IMAGE;
        setOtherUserImage(isDefault ? DEFAULT_USER_IMAGE : navImage);
      }
      loadMessages();
      loadOtherUserProfile();
      loadUserProfile(); // Load the user's own profile
    }
  }, [conversationId, userId, location.state]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadMessages = async () => {
    if (!conversationId) return;
    setLoading(true);
    setError(null);
    try {
      const messagesArray = await adminServiceCanister.getConversationMessages(
        conversationId,
        100,
        0,
      );
      setMessages(messagesArray || []);
    } catch (e) {
      console.error("Error loading messages:", e);
      setError("Failed to load messages.");
    } finally {
      setLoading(false);
    }
  };

  const loadOtherUserProfile = async () => {
    if (!userId || !conversationId) return;
    
    try {
      // First try to get other user ID from conversation if not in state
      if (!otherUserId) {
        const conversations = await adminServiceCanister.getUserConversations(userId);
        const conv = conversations.find((c: any) => c.conversation.id === conversationId);
        if (conv) {
          const otherId = conv.conversation.clientId === userId
            ? conv.conversation.providerId
            : conv.conversation.clientId;
          setOtherUserId(otherId);
        }
      }

      const profileUserId = otherUserId || location.state?.otherUserId;
      if (profileUserId) {
        const profile = await authCanisterService.getProfile(profileUserId);
        if (profile) {
          if (!otherUserName) {
            setOtherUserName(profile.name);
          }
          // Only update if profilePicture exists (like client/provider does)
          if (
            profile.profilePicture &&
            profile.profilePicture.imageUrl
          ) {
            setOtherUserImage(profile.profilePicture.imageUrl);
          }
          // If null, don't call setState - stays as DEFAULT_USER_IMAGE
        }
      }
    } catch (e) {
      // Silently fail - user will see default avatar
    }
  };

  const loadUserProfile = async () => {
    if (!userId) return;
    
    try {
      const profile = await authCanisterService.getProfile(userId);
      if (profile) {
        setUserName(profile.name);
        // Only update if profilePicture exists (like client/provider does)
        if (
          profile.profilePicture &&
          profile.profilePicture.imageUrl
        ) {
          setUserImage(profile.profilePicture.imageUrl);
        }
        // If null, don't call setState - stays as DEFAULT_USER_IMAGE
      }
    } catch (e) {
      // Silently fail - user will see default avatar
    }
  };

  const handleRefresh = async () => {
    await loadMessages();
  };

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
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isFromUser = (senderId: string): boolean => {
    return senderId === userId;
  };

  if (!userId || !conversationId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg text-red-600">Missing required parameters</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gradient-to-b from-blue-50 to-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center border-b border-gray-200 bg-white p-3 shadow-sm">
        <button
          onClick={() => navigate(-1)}
          className="rounded-full p-2 hover:bg-gray-100"
        >
          <ArrowLeftIcon className="h-6 w-6 text-gray-700" />
        </button>
        <div className="ml-3 flex flex-1 items-center justify-between">
          <div className="flex items-center">
            <div className="relative h-11 w-11">
              <ProfileImage
                profilePictureUrl={
                  otherUserImage !== DEFAULT_USER_IMAGE
                    ? otherUserImage
                    : undefined
                }
                userName={otherUserName || "User"}
                size="h-11 w-11"
              />
            </div>
            <div className="ml-3">
              <h1 className="text-lg font-bold text-black">{otherUserName || "Chat"}</h1>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="rounded-full p-2 text-gray-400 hover:text-gray-600 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh messages"
          >
            <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* Messages Area */}
      <main className="flex-1 space-y-4 overflow-y-auto p-4">
        {loading && messages.length === 0 ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"></div>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
            {error}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-lg italic text-gray-500">
              No messages in this conversation yet.
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const fromUser = isFromUser(message.senderId);
            return (
              <div
                key={message.id}
                className={`flex items-end gap-2 ${fromUser ? "justify-end" : "justify-start"}`}
              >
                {/* Avatar (for other user only) */}
                {!fromUser && (
                  <div className="relative h-9 w-9 flex-shrink-0">
                    <ProfileImage
                      profilePictureUrl={
                        otherUserImage !== DEFAULT_USER_IMAGE
                          ? otherUserImage
                          : undefined
                      }
                      userName={otherUserName || "User"}
                      size="h-9 w-9"
                    />
                  </div>
                )}
                {/* Message bubble */}
                <div
                  className={`max-w-xs rounded-2xl px-5 py-3 shadow-sm md:max-w-md lg:max-w-lg ${
                    fromUser
                      ? "rounded-br-none bg-blue-600 text-white"
                      : "rounded-bl-none border border-gray-200 bg-white text-gray-800"
                  }`}
                  style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
                >
                  <p className="overflow-wrap-anywhere break-words text-base leading-snug">
                    {message.content}
                  </p>
                  <p
                    className={`mt-1 text-right text-xs ${
                      fromUser ? "text-blue-100" : "text-gray-400"
                    }`}
                  >
                    {formatTimestamp(message.createdAt)}
                  </p>
                </div>
                {/* Avatar (for user only) */}
                {fromUser && (
                  <div className="relative h-9 w-9 flex-shrink-0">
                    <ProfileImage
                      profilePictureUrl={
                        userImage !== DEFAULT_USER_IMAGE
                          ? userImage
                          : undefined
                      }
                      userName={userName || "User"}
                      size="h-9 w-9"
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </main>
    </div>
  );
};

