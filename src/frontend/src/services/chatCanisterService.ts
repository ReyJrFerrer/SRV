// Chat Service (Firebase Cloud Functions)
import { initializeFirebase } from "./firebaseApp";
import { httpsCallable } from "firebase/functions";

// Initialize Firebase
const { functions } = initializeFirebase();

// Frontend-compatible interfaces
export interface FrontendMessage {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  messageType: "Text" | "File";
  content: string; // Decrypted content
  attachment?: {
    fileName: string;
    fileSize: number;
    fileType: string;
    fileUrl: string;
  };
  status: "Sent" | "Delivered" | "Read";
  createdAt: string;
  readAt?: string;
}

export interface FrontendConversation {
  id: string;
  clientId: string;
  providerId: string;
  createdAt: string;
  lastMessageAt?: string;
  isActive: boolean;
  unreadCount: { [userId: string]: number };
}

export interface FrontendConversationSummary {
  conversation: FrontendConversation;
  lastMessage?: FrontendMessage;
}

export interface FrontendMessagePage {
  messages: FrontendMessage[];
  hasMore: boolean;
  nextPageToken?: string;
}

// Helper function to adapt backend message format to frontend format
const adaptBackendMessage = (backendMessage: any): FrontendMessage => {
  const getMessageType = (type: any): "Text" | "File" => {
    if (type?.Text !== undefined) return "Text";
    if (type?.File !== undefined) return "File";
    return "Text";
  };

  const getMessageStatus = (status: any): "Sent" | "Delivered" | "Read" => {
    if (status?.Sent !== undefined) return "Sent";
    if (status?.Delivered !== undefined) return "Delivered";
    if (status?.Read !== undefined) return "Read";
    return "Sent";
  };

  return {
    id: backendMessage.id,
    conversationId: backendMessage.conversationId,
    senderId: backendMessage.senderId,
    receiverId: backendMessage.receiverId,
    messageType: getMessageType(backendMessage.messageType),
    content: backendMessage.content?.encryptedText || backendMessage.content,
    attachment:
      backendMessage.attachment && backendMessage.attachment.length > 0
        ? {
            fileName: backendMessage.attachment[0].fileName,
            fileSize: Number(backendMessage.attachment[0].fileSize),
            fileType: backendMessage.attachment[0].fileType,
            fileUrl: backendMessage.attachment[0].fileUrl,
          }
        : undefined,
    status: getMessageStatus(backendMessage.status),
    createdAt: backendMessage.createdAt,
    readAt:
      backendMessage.readAt && backendMessage.readAt.length > 0
        ? backendMessage.readAt[0]
        : undefined,
  };
};

// Helper function to adapt backend conversation format to frontend format
const adaptBackendConversation = (
  backendConversation: any,
): FrontendConversation => {
  return {
    id: backendConversation.id,
    clientId: backendConversation.clientId,
    providerId: backendConversation.providerId,
    createdAt: backendConversation.createdAt,
    lastMessageAt: backendConversation.lastMessageAt || undefined,
    isActive: backendConversation.isActive,
    unreadCount: backendConversation.unreadCount || {},
  };
};

// Helper function to adapt backend conversation summary
const adaptBackendConversationSummary = (
  backendSummary: any,
): FrontendConversationSummary => {
  return {
    conversation: adaptBackendConversation(backendSummary.conversation),
    lastMessage:
      backendSummary.lastMessage && backendSummary.lastMessage.length > 0
        ? adaptBackendMessage(backendSummary.lastMessage[0])
        : undefined,
  };
};

// Chat Service Functions
export const chatCanisterService = {
  /**
   * Create a new conversation (usually called after booking completion)
   * @param clientId Principal ID of the client
   * @param providerId Principal ID of the service provider
   */
  async createConversation(
    clientId: string,
    providerId: string,
  ): Promise<FrontendConversation | null> {
    console.log("🚀 [chatCanisterService] createConversation called with:", {
      clientId,
      providerId,
    });
    try {
      const createConversationFn = httpsCallable(
        functions,
        "createConversation",
      );

      const result = await createConversationFn({
        clientId,
        providerId,
      });

      console.log(
        "✅ [chatCanisterService] createConversation raw result:",
        result,
      );
      const responseData = (result.data as { success: boolean; data: any })
        .data;
      console.log(
        "✅ [chatCanisterService] createConversation extracted data:",
        responseData,
      );
      return adaptBackendConversation(responseData);
    } catch (error) {
      console.error(
        "❌ [chatCanisterService] Error creating conversation:",
        error,
      );
      throw new Error(`Failed to create conversation: ${error}`);
    }
  },

  /**
   * Send a message in a conversation
   * @param conversationId ID of the conversation
   * @param receiverId Principal ID of the message receiver
   * @param content Message content (max 500 characters)
   */
  async sendMessage(
    conversationId: string,
    receiverId: string,
    content: string,
  ): Promise<FrontendMessage | null> {
    console.log("🚀 [chatCanisterService] sendMessage called with:", {
      conversationId,
      receiverId,
      contentLength: content.length,
    });
    try {
      // Validate message length
      if (content.length > 500) {
        throw new Error("Message cannot exceed 500 characters");
      }

      if (content.trim().length === 0) {
        throw new Error("Message cannot be empty");
      }

      const sendMessageFn = httpsCallable(functions, "sendMessage");

      const result = await sendMessageFn({
        conversationId,
        receiverId,
        content: content.trim(),
      });

      console.log("✅ [chatCanisterService] sendMessage raw result:", result);
      const responseData = (result.data as { success: boolean; data: any })
        .data;
      console.log(
        "✅ [chatCanisterService] sendMessage extracted data:",
        responseData,
      );
      return adaptBackendMessage(responseData);
    } catch (error) {
      console.error("❌ [chatCanisterService] Error sending message:", error);
      throw new Error(`Failed to send message: ${error}`);
    }
  },

  /**
   * Get all conversations for the current user
   */
  async getMyConversations(): Promise<FrontendConversationSummary[]> {
    console.log("🚀 [chatCanisterService] getMyConversations called");
    try {
      const getMyConversationsFn = httpsCallable(
        functions,
        "getMyConversations",
      );

      const result = await getMyConversationsFn({});

      console.log(
        "✅ [chatCanisterService] getMyConversations raw result:",
        result,
      );
      const responseData = (result.data as { success: boolean; data: any[] })
        .data;
      console.log(
        `✅ [chatCanisterService] getMyConversations extracted ${responseData?.length ?? 0} conversations.`,
      );

      return (responseData || []).map(adaptBackendConversationSummary);
    } catch (error) {
      console.error(
        "❌ [chatCanisterService] Error fetching conversations:",
        error,
      );
      return [];
    }
  },

  /**
   * Get messages for a specific conversation with pagination
   * @param conversationId ID of the conversation
   * @param limit Number of messages to fetch (default: 20)
   * @param offset Starting position for pagination (default: 0)
   */
  async getConversationMessages(
    conversationId: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<FrontendMessagePage> {
    console.log(
      "🚀 [chatCanisterService] getConversationMessages called with:",
      {
        conversationId,
        limit,
        offset,
      },
    );
    try {
      const getConversationMessagesFn = httpsCallable(
        functions,
        "getConversationMessages",
      );

      const result = await getConversationMessagesFn({
        conversationId,
        limit,
        offset,
      });

      console.log(
        "✅ [chatCanisterService] getConversationMessages raw result:",
        result,
      );
      const responseData = (
        result.data as {
          success: boolean;
          data: {
            messages: any[];
            hasMore: boolean;
            nextPageToken: string[];
          };
        }
      ).data;
      console.log(
        `✅ [chatCanisterService] getConversationMessages extracted ${responseData?.messages?.length ?? 0} messages.`,
      );

      return {
        messages: (responseData?.messages || []).map(adaptBackendMessage),
        hasMore: responseData?.hasMore || false,
        nextPageToken:
          responseData?.nextPageToken && responseData.nextPageToken.length > 0
            ? responseData.nextPageToken[0]
            : undefined,
      };
    } catch (error) {
      console.error(
        "❌ [chatCanisterService] Error fetching conversation messages:",
        error,
      );
      return {
        messages: [],
        hasMore: false,
      };
    }
  },

  /**
   * Mark all messages in a conversation as read
   * @param conversationId ID of the conversation
   */
  async markMessagesAsRead(conversationId: string): Promise<boolean> {
    console.log(
      "🚀 [chatCanisterService] markMessagesAsRead called for conversation:",
      conversationId,
    );
    try {
      const markMessagesAsReadFn = httpsCallable(
        functions,
        "markMessagesAsRead",
      );

      const result = await markMessagesAsReadFn({
        conversationId,
      });

      console.log(
        "✅ [chatCanisterService] markMessagesAsRead raw result:",
        result,
      );
      const responseData = (result.data as { success: boolean; data: boolean })
        .data;
      console.log(
        "✅ [chatCanisterService] markMessagesAsRead extracted data:",
        responseData,
      );
      return responseData;
    } catch (error) {
      console.error(
        "❌ [chatCanisterService] Error marking messages as read:",
        error,
      );
      throw new Error(`Failed to mark messages as read: ${error}`);
    }
  },

  /**
   * Get a specific conversation by ID
   * @param conversationId ID of the conversation
   */
  async getConversation(
    conversationId: string,
  ): Promise<FrontendConversation | null> {
    console.log(
      "🚀 [chatCanisterService] getConversation called for conversation:",
      conversationId,
    );
    try {
      const getConversationFn = httpsCallable(functions, "getConversation");

      const result = await getConversationFn({
        conversationId,
      });

      console.log(
        "✅ [chatCanisterService] getConversation raw result:",
        result,
      );
      const responseData = (result.data as { success: boolean; data: any })
        .data;
      console.log(
        "✅ [chatCanisterService] getConversation extracted data:",
        responseData,
      );
      return adaptBackendConversation(responseData);
    } catch (error) {
      console.error(
        "❌ [chatCanisterService] Error fetching conversation:",
        error,
      );
      throw new Error(`Failed to fetch conversation: ${error}`);
    }
  },
};

export default chatCanisterService;
