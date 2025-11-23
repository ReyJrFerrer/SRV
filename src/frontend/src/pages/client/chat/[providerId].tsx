// SECTION: Imports — dependencies for this page
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { ArrowLeftIcon, PaperAirplaneIcon } from "@heroicons/react/24/solid";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import BottomNavigation from "../../../components/client/NavigationBar";
import { useChat } from "../../../hooks/useChat";
import { useAuth } from "../../../context/AuthContext";
import authCanisterService from "../../../services/authCanisterService";
import { ProfileImage } from "../../../components/common/ProfileImage";

const ConversationPage: React.FC = () => {
  const DEFAULT_USER_IMAGE = "/default-provider.svg";
  const { providerId } = useParams<{ providerId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { identity } = useAuth();
  const {
    currentConversation,
    messages,
    error,
    sendMessage,
    loadConversation,
    markAsRead,
    sendingMessage,
    getUserName,
  } = useChat();
  const [messageText, setMessageText] = useState("");
  const [otherUserName, setOtherUserName] = useState<string>("");
  const [otherUserImage, setOtherUserImage] =
    useState<string>(DEFAULT_USER_IMAGE);
  const servicePreview =
    (location.state?.servicePreview as
      | {
        id: string;
        name: string;
        imageUrl?: string;
        price?: number;
        bookingsCount?: number;
      }
      | undefined) ?? undefined;
  const [showServicePreview, setShowServicePreview] =
    useState<boolean>(!!servicePreview);

  useEffect(() => {
    let isMounted = true;
    if (location.state?.otherUserName) {
      setOtherUserName(location.state.otherUserName);
    } else if (location.state?.conversationId) {
      setOtherUserName("Chat");
    } else {
      setOtherUserName(providerId || "Provider");
    }
    const navImage = location.state?.otherUserImage;
    const isDefault = !navImage || navImage === DEFAULT_USER_IMAGE;
    setOtherUserImage(isDefault ? DEFAULT_USER_IMAGE : navImage);
    const principalRegex = /^[a-z0-9\-]{27,63}$/i;
    if (isDefault && providerId && principalRegex.test(providerId)) {
      authCanisterService
        .getProfile(providerId)
        .then((profile) => {
          if (
            isMounted &&
            profile &&
            profile.profilePicture &&
            profile.profilePicture.imageUrl
          ) {
            setOtherUserImage(profile.profilePicture.imageUrl);
          }
        })
        .catch(() => { });
    }
    return () => {
      isMounted = false;
    };
  }, [location.state, providerId]);

  useEffect(() => {
    const conversationId = location.state?.conversationId || providerId;
    if (conversationId && identity) {
      loadConversation(conversationId);
    }
  }, [providerId, location.state?.conversationId, identity, loadConversation]);

  useEffect(() => {
    if (currentConversation && identity) {
      const currentUserId = identity.getPrincipal().toString();
      const otherUserId =
        currentConversation.clientId === currentUserId
          ? currentConversation.providerId
          : currentConversation.clientId;

      getUserName(otherUserId).then(setOtherUserName);

      if (otherUserImage === DEFAULT_USER_IMAGE) {
        fetchOtherUserProfile(otherUserId);
      }
    }
  }, [currentConversation, identity, getUserName, otherUserImage]);

  const fetchOtherUserProfile = async (userId: string) => {
    try {
      const profile = await authCanisterService.getProfile(userId);
      if (
        profile &&
        profile.profilePicture &&
        profile.profilePicture.imageUrl
      ) {
        setOtherUserImage(profile.profilePicture.imageUrl);
      }
    } catch (error) { }
  };

  useEffect(() => {
    if (currentConversation && messages.length > 0) {
      markAsRead(currentConversation.id);
    }
  }, [currentConversation, messages, markAsRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      const currentUserId = identity.getPrincipal().toString();
      const receiverId =
        currentConversation.clientId === currentUserId
          ? currentConversation.providerId
          : currentConversation.clientId;
      await sendMessage(messageText.trim(), receiverId);
      setMessageText("");
    } catch { }
  };

  const handleReportClick = () => {
    navigate("/client/report");
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
    return date.toLocaleDateString();
  };

  const isFromCurrentUser = (senderId: string): boolean => {
    if (!identity) return false;
    return senderId === identity.getPrincipal().toString();
  };

  if (error) {
    return (
      <div className="flex h-screen flex-col bg-gradient-to-b from-blue-50 to-gray-100">
        <header className="sticky top-0 z-10 flex items-center border-b border-gray-200 bg-white p-3 shadow-sm">
          <button
            onClick={() => navigate("/client/chat")}
            className="rounded-full p-2 hover:bg-blue-100"
          >
            <ArrowLeftIcon className="h-6 w-6 text-gray-700" />
          </button>
          <div className="ml-3">
            <h1 className="text-lg font-bold text-blue-900">Error</h1>
          </div>
        </header>
        <main className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <p className="mb-4 text-red-600">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </main>
        <div className="fixed bottom-0 left-0 z-30 w-full">
          <BottomNavigation />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gradient-to-b from-blue-50 to-gray-100">
      <header className="sticky top-0 z-10 flex items-center border-b border-gray-200 bg-white p-3 shadow-sm">
        <button
          onClick={() => navigate(-1)}
          className="rounded-full p-2 hover:bg-yellow-100"
        >
          <ArrowLeftIcon className="h-6 w-6 text-gray-700 hover:text-yellow-600" />
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
                userName={otherUserName}
                size="h-11 w-11"
              />
            </div>
            <div className="ml-3">
              <h1 className="text-lg font-bold text-black">{otherUserName}</h1>
            </div>
          </div>
          <button
            onClick={handleReportClick}
            className="group relative flex items-center justify-center rounded-lg bg-gray-100 p-2 text-gray-500 shadow-sm transition-colors hover:bg-red-100 hover:text-red-600"
            title="Report this user"
          >
            <ExclamationTriangleIcon className="h-5 w-5" />
          </button>
        </div>
      </header>

      {showServicePreview && servicePreview && (
        <div className="z-10 border-b border-gray-200 bg-white/95 p-3 shadow-sm backdrop-blur">
          <div
            role="button"
            onClick={() => navigate(`/client/service/${servicePreview.id}`)}
            className="relative flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm hover:bg-gray-50"
          >
            <img
              src={servicePreview.imageUrl || "/default-provider.svg"}
              alt={servicePreview.name}
              className="h-14 w-14 rounded-lg object-cover"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "/default-provider.svg";
              }}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-900">
                {servicePreview.name}
              </p>
              {typeof servicePreview.price === "number" &&
                !isNaN(servicePreview.price) && (
                  <p className="mt-0.5 text-sm font-bold text-blue-700">
                    ₱{servicePreview.price.toLocaleString()}
                  </p>
                )}
              {typeof servicePreview.bookingsCount === "number" && (
                <p className="mt-0.5 text-xs text-gray-500">
                  {servicePreview.bookingsCount} booking
                  {servicePreview.bookingsCount !== 1 ? "s" : ""}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/client/book/${servicePreview.id}`);
                }}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white shadow hover:bg-blue-700"
              >
                Book Now
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowServicePreview(false);
                }}
                aria-label="Close"
                className="rounded-full bg-gray-100 p-1.5 text-gray-500 hover:bg-gray-200"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 space-y-4 overflow-y-auto p-4 pb-32">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-lg italic text-gray-500">
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
                  <div className="relative h-9 w-9 flex-shrink-0">
                    <ProfileImage
                      profilePictureUrl={
                        otherUserImage !== DEFAULT_USER_IMAGE
                          ? otherUserImage
                          : undefined
                      }
                      userName={otherUserName}
                      size="h-9 w-9"
                    />
                  </div>
                )}
                <div
                  className={`max-w-xs rounded-2xl px-5 py-3 shadow-sm md:max-w-md lg:max-w-lg ${fromCurrentUser
                      ? "rounded-br-none bg-blue-600 text-white"
                      : "rounded-bl-none border border-gray-200 bg-white text-gray-800"
                    }`}
                  style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
                >
                  <p className="overflow-wrap-anywhere break-words text-base leading-snug">
                    {typeof message.content === "string"
                      ? message.content
                      : message.content.encryptedText}
                  </p>
                  <p
                    className={`mt-1 text-right text-xs ${fromCurrentUser ? "text-blue-100" : "text-gray-400"
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

      <div className="sticky bottom-0 left-0 z-30 mb-0 flex w-full flex-col md:bottom-0 md:mb-0">
        <div className="border-t border-gray-200 bg-white p-3 shadow-md">
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
              className="w-full flex-1 rounded-full border border-transparent bg-gray-100 px-4 py-2 text-base focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={
                sendingMessage || !messageText.trim() || !currentConversation
              }
              className="rounded-full bg-blue-600 p-3 text-white shadow transition-colors hover:bg-blue-700 disabled:bg-gray-300"
            >
              <PaperAirplaneIcon className="h-5 w-5" />
            </button>
          </form>

          {messageText.length > 400 && (
            <p className="mt-1 text-center text-xs text-gray-500">
              {500 - messageText.length} characters remaining
            </p>
          )}
        </div>
      </div>

      <div className="w-full">
        <BottomNavigation />
      </div>
    </div>
  );
};

export default ConversationPage;
