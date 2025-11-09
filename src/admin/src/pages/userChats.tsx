import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { adminServiceCanister } from "../services/adminServiceCanister";
import authCanisterService from "../../../frontend/src/services/authCanisterService";
import { ProfileImage } from "../../../frontend/src/components/common/ProfileImage";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";

interface ConversationSummary {
  conversation: {
    id: string;
    clientId: string;
    providerId: string;
    createdAt: string;
    lastMessageAt?: string;
    unreadCount: { [userId: string]: number };
  };
  lastMessage?: Array<{
    id: string;
    content: string | { encryptedText: string; encryptionKey: string };
    senderId: string;
    createdAt: string;
  }>;
}

export const UserChatsPage: React.FC = () => {
  const DEFAULT_USER_IMAGE = "/default-provider.svg";

  const { id: userId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userNames, setUserNames] = useState<Map<string, string>>(new Map());
  const [userImages, setUserImages] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (userId) {
      loadConversations();
    }
  }, [userId]);

  const loadConversations = async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await adminServiceCanister.getUserConversations(userId);
      setConversations(data || []);
      const otherUserIds = new Set<string>();
      data?.forEach((conv: ConversationSummary) => {
        if (conv.conversation.clientId === userId) {
          otherUserIds.add(conv.conversation.providerId);
        } else {
          otherUserIds.add(conv.conversation.clientId);
        }
      });

      const namesMap = new Map<string, string>();
      const imagesMap = new Map<string, string>();

      await Promise.all(
        Array.from(otherUserIds).map(async (otherUserId) => {
          try {
            const profile = await authCanisterService.getProfile(otherUserId);
            if (profile) {
              namesMap.set(otherUserId, profile.name);
              if (profile.profilePicture && profile.profilePicture.imageUrl) {
                imagesMap.set(otherUserId, profile.profilePicture.imageUrl);
              } else {
                imagesMap.set(otherUserId, DEFAULT_USER_IMAGE);
              }
            }
          } catch (e) {
          }
        }),
      );

      setUserNames(namesMap);
      setUserImages(imagesMap);
    } catch (e) {
      setError("Failed to load conversations.");
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (dateStr?: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffHours / 24;

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
    if (diffDays < 7) return `${Math.floor(diffDays)}d ago`;
    return date.toLocaleDateString();
  };

  const handleConversationClick = (conv: ConversationSummary) => {
    if (!userId) return;
    const otherUserId =
      conv.conversation.clientId === userId
        ? conv.conversation.providerId
        : conv.conversation.clientId;
    const otherUserName =
      userNames.get(otherUserId) || `User ${otherUserId.slice(0, 8)}...`;
    const otherUserImage = userImages.get(otherUserId) || DEFAULT_USER_IMAGE;

    // Navigate to the chat history page
    navigate(`/user/${userId}/chat/${conv.conversation.id}`, {
      state: {
        conversationId: conv.conversation.id,
        otherUserName,
        otherUserId,
        otherUserImage:
          otherUserImage !== DEFAULT_USER_IMAGE ? otherUserImage : undefined,
      },
    });
  };

  if (!userId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg text-red-600">User ID is required</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-100">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-center px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="absolute left-4 rounded-full p-2 hover:bg-gray-100"
          >
            <ArrowLeftIcon className="h-6 w-6 text-gray-700" />
          </button>
          <h1 className="text-2xl font-extrabold tracking-tight text-black">
            User Conversations
          </h1>
        </div>
      </header>

      <div className="mx-auto mt-6 max-w-2xl px-2 md:px-0">
        {loading ? (
          <div className="m-4 rounded-xl bg-white p-6 text-center shadow-md">
            <p className="text-lg text-gray-600">Loading conversations...</p>
          </div>
        ) : error ? (
          <div className="m-4 rounded-xl bg-white p-6 text-center shadow-md">
            <p className="mb-4 text-lg text-red-600">{error}</p>
            <button
              onClick={loadConversations}
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
                  const aMsg =
                    Array.isArray(a.lastMessage) && a.lastMessage.length > 0
                      ? a.lastMessage[0]
                      : null;
                  const bMsg =
                    Array.isArray(b.lastMessage) && b.lastMessage.length > 0
                      ? b.lastMessage[0]
                      : null;
                  const aTime =
                    aMsg?.createdAt ||
                    a.conversation.lastMessageAt ||
                    a.conversation.createdAt;
                  const bTime =
                    bMsg?.createdAt ||
                    b.conversation.lastMessageAt ||
                    b.conversation.createdAt;
                  return new Date(bTime).getTime() - new Date(aTime).getTime();
                })
                .map((conv) => {
                  const otherUserId =
                    conv.conversation.clientId === userId
                      ? conv.conversation.providerId
                      : conv.conversation.clientId;
                  const otherUserName =
                    userNames.get(otherUserId) ||
                    `User ${otherUserId.slice(0, 8)}...`;
                  const otherUserImage =
                    userImages.get(otherUserId) || DEFAULT_USER_IMAGE;
                  const unreadCount =
                    conv.conversation.unreadCount[userId] || 0;
                  const lastMsg =
                    Array.isArray(conv.lastMessage) &&
                    conv.lastMessage.length > 0
                      ? conv.lastMessage[0]
                      : null;

                  return (
                    <li
                      key={conv.conversation.id}
                      onClick={() => handleConversationClick(conv)}
                      className="group flex cursor-pointer items-center space-x-4 p-4 transition-all hover:bg-blue-50"
                    >
                      <div className="relative h-14 w-14 flex-shrink-0">
                        <ProfileImage
                          profilePictureUrl={
                            otherUserImage !== DEFAULT_USER_IMAGE
                              ? otherUserImage
                              : undefined
                          }
                          userName={otherUserName}
                          size="h-14 w-14"
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
                            {formatTimestamp(
                              lastMsg?.createdAt ||
                                conv.conversation.lastMessageAt,
                            )}
                          </p>
                        </div>
                        <div className="mt-1 flex items-start justify-between">
                          <p className="truncate text-sm text-gray-700 group-hover:text-blue-800">
                            {lastMsg?.content ? (
                              typeof lastMsg.content === "string" ? (
                                lastMsg.content
                              ) : (
                                (lastMsg.content as any)?.encryptedText || ""
                              )
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
            <p className="mb-4 text-lg text-gray-600">No conversations found</p>
            <p className="text-sm text-gray-500">
              This user has no conversations yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
