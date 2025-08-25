// Chat Canister Service
import { Principal } from "@dfinity/principal";
import { canisterId, createActor } from "../../../declarations/chat";
import { canisterId as authCanisterId } from "../../../declarations/auth";
import { canisterId as bookingCanisterId } from "../../../declarations/booking";
import type {
  _SERVICE as ChatService,
  Conversation,
  ConversationSummary,
  Message,
  MessageStatus,
  MessageType,
} from "../../../declarations/chat/chat.did";
import { Identity } from "@dfinity/agent";

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
  createdAt: Date;
  readAt?: Date;
}

export interface FrontendConversation {
  id: string;
  clientId: string;
  providerId: string;
  createdAt: Date;
  lastMessageAt?: Date;
  isActive: boolean;
  unreadCount: Array<{ userId: string; count: number }>;
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

/**
 * Creates a chat actor with the provided identity
 * @param identity The user's identity from AuthContext
 * @returns An authenticated ChatService actor
 */
const createChatActor = (identity?: Identity | null): ChatService => {
  return createActor(canisterId, {
    agentOptions: {
      identity: identity || undefined,
      host:
        process.env.DFX_NETWORK !== "ic"
          ? "http://localhost:4943"
          : "https://ic0.app",
    },
  }) as ChatService;
};

// Singleton actor instance with identity tracking
let chatActor: ChatService | null = null;
let currentIdentity: Identity | null = null;

/**
 * Updates the chat actor with a new identity
 * This should be called when the user's authentication state changes
 */
export const updateChatActor = (identity: Identity | null) => {
  if (currentIdentity !== identity) {
    chatActor = createChatActor(identity);
    currentIdentity = identity;
  }
};

/**
 * Gets the current chat actor
 * Throws error if no authenticated identity is available for auth-required operations
 */
const getChatActor = (requireAuth: boolean = true): ChatService => {
  if (requireAuth && !currentIdentity) {
    throw new Error(
      "Authentication required: Please log in to perform this action",
    );
  }

  if (!chatActor) {
    chatActor = createChatActor(currentIdentity);
  }

  return chatActor;
};

// Helper functions for data transformation
const adaptBackendMessage = (backendMessage: Message): FrontendMessage => {
  const getMessageType = (type: MessageType): "Text" | "File" => {
    if ("Text" in type) return "Text";
    if ("File" in type) return "File";
    return "Text";
  };

  const getMessageStatus = (
    status: MessageStatus,
  ): "Sent" | "Delivered" | "Read" => {
    if ("Sent" in status) return "Sent";
    if ("Delivered" in status) return "Delivered";
    if ("Read" in status) return "Read";
    return "Sent";
  };

  return {
    id: backendMessage.id,
    conversationId: backendMessage.conversationId,
    senderId: backendMessage.senderId.toString(),
    receiverId: backendMessage.receiverId.toString(),
    messageType: getMessageType(backendMessage.messageType),
    content: backendMessage.content.encryptedText, // For now, content is not actually encrypted
    attachment:
      backendMessage.attachment.length > 0 && backendMessage.attachment[0]
        ? {
            fileName: backendMessage.attachment[0].fileName,
            fileSize: Number(backendMessage.attachment[0].fileSize),
            fileType: backendMessage.attachment[0].fileType,
            fileUrl: backendMessage.attachment[0].fileUrl,
          }
        : undefined,
    status: getMessageStatus(backendMessage.status),
    createdAt: new Date(Number(backendMessage.createdAt) / 1000000), // Convert nanoseconds to milliseconds
    readAt:
      backendMessage.readAt.length > 0
        ? new Date(Number(backendMessage.readAt[0]) / 1000000)
        : undefined,
  };
};

const adaptBackendConversation = (
  backendConversation: Conversation,
): FrontendConversation => {
  return {
    id: backendConversation.id,
    clientId: backendConversation.clientId.toString(),
    providerId: backendConversation.providerId.toString(),
    createdAt: new Date(Number(backendConversation.createdAt) / 1000000),
    lastMessageAt:
      backendConversation.lastMessageAt.length > 0
        ? new Date(Number(backendConversation.lastMessageAt[0]) / 1000000)
        : undefined,
    isActive: backendConversation.isActive,
    unreadCount: backendConversation.unreadCount.map(([userId, count]) => ({
      userId: userId.toString(),
      count: Number(count),
    })),
  };
};

const adaptBackendConversationSummary = (
  backendSummary: ConversationSummary,
): FrontendConversationSummary => {
  return {
    conversation: adaptBackendConversation(backendSummary.conversation),
    lastMessage:
      backendSummary.lastMessage.length > 0 && backendSummary.lastMessage[0]
        ? adaptBackendMessage(backendSummary.lastMessage[0] as Message)
        : undefined,
  };
};

// Chat Canister Service Functions
export const chatCanisterService = {
  /**
   * Set canister references for chat canister (ADMIN FUNCTION)
   */
  async setCanisterReferences(): Promise<string | null> {
    try {
      const actor = getChatActor(true);
      const result = await actor.setCanisterReferences(
        authCanisterId ? [Principal.fromText(authCanisterId)] : [],
        bookingCanisterId ? [Principal.fromText(bookingCanisterId)] : [],
      );

      if ("ok" in result) {
        return result.ok;
      } else {
        // //console.error("Error setting chat canister references:", result.err);
        throw new Error(result.err);
      }
    } catch (error) {
      // //console.error("Error setting chat canister references:", error);
      throw new Error(`Failed to set chat canister references: ${error}`);
    }
  },

  /**
   * Create a new conversation (usually called after booking completion)
   * @param clientId Principal ID of the client
   * @param providerId Principal ID of the service provider
   * @param bookingId Booking ID that initiated this conversation
   */
  async createConversation(
    clientId: string,
    providerId: string,
  ): Promise<FrontendConversation | null> {
    try {
      const actor = getChatActor(true);
      const result = await actor.createConversation(
        Principal.fromText(clientId),
        Principal.fromText(providerId),
      );

      if ("ok" in result) {
        return adaptBackendConversation(result.ok);
      } else {
        //console.error("Error creating conversation:", result.err);
        throw new Error(result.err);
      }
    } catch (error) {
      //console.error("Error creating conversation:", error);
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
    try {
      // Validate message length
      if (content.length > 500) {
        throw new Error("Message cannot exceed 500 characters");
      }

      if (content.trim().length === 0) {
        throw new Error("Message cannot be empty");
      }

      const actor = getChatActor(true);
      const result = await actor.sendMessage(
        conversationId,
        Principal.fromText(receiverId),
        content.trim(),
      );

      if ("ok" in result) {
        return adaptBackendMessage(result.ok);
      } else {
        //console.error("Error sending message:", result.err);
        throw new Error(result.err);
      }
    } catch (error) {
      //console.error("Error sending message:", error);
      throw new Error(`Failed to send message: ${error}`);
    }
  },

  /**
   * Get all conversations for the current user
   */
  async getMyConversations(): Promise<FrontendConversationSummary[]> {
    try {
      const actor = getChatActor(true);
      const result = await actor.getMyConversations();

      if ("ok" in result) {
        return result.ok.map(adaptBackendConversationSummary);
      } else {
        //console.error("Error fetching conversations:", result.err);
        throw new Error(result.err);
      }
    } catch (error) {
      //console.error("Error fetching conversations:", error);
      throw new Error(`Failed to fetch conversations: ${error}`);
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
    try {
      const actor = getChatActor(true);
      const result = await actor.getConversationMessages(
        conversationId,
        BigInt(limit),
        BigInt(offset),
      );

      if ("ok" in result) {
        return {
          messages: result.ok.messages.map(adaptBackendMessage),
          hasMore: result.ok.hasMore,
          nextPageToken:
            result.ok.nextPageToken.length > 0
              ? result.ok.nextPageToken[0]
              : undefined,
        };
      } else {
        //console.error("Error fetching conversation messages:", result.err);
        throw new Error(result.err);
      }
    } catch (error) {
      //console.error("Error fetching conversation messages:", error);
      throw new Error(`Failed to fetch conversation messages: ${error}`);
    }
  },

  /**
   * Mark all messages in a conversation as read
   * @param conversationId ID of the conversation
   */
  async markMessagesAsRead(conversationId: string): Promise<boolean> {
    try {
      const actor = getChatActor(true);
      const result = await actor.markMessagesAsRead(conversationId);

      if ("ok" in result) {
        return result.ok;
      } else {
        //console.error("Error marking messages as read:", result.err);
        throw new Error(result.err);
      }
    } catch (error) {
      //console.error("Error marking messages as read:", error);
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
    try {
      const actor = getChatActor(true);
      const result = await actor.getConversation(conversationId);

      if ("ok" in result) {
        return adaptBackendConversation(result.ok);
      } else {
        //console.error("Error fetching conversation:", result.err);
        throw new Error(result.err);
      }
    } catch (error) {
      //console.error("Error fetching conversation:", error);
      throw new Error(`Failed to fetch conversation: ${error}`);
    }
  },
};

export default chatCanisterService;
