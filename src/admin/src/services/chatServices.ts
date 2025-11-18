import { callFirebaseFunction, requireAuth } from "./coreUtils";

/**
 * Get conversations for a specific user
 */
export const getUserConversations = async (userId: string): Promise<any[]> => {
  try {
    requireAuth();

    // Chat function with admin override
    const result = await callFirebaseFunction("getMyConversations", {
      userId,
    });

    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error("Error fetching user conversations", error);
    return [];
  }
};

/**
 * Get messages for a specific conversation
 */
export const getConversationMessages = async (
  conversationId: string,
  limit: number = 50,
  offset: number = 0,
): Promise<any[]> => {
  try {
    requireAuth();

    const result = await callFirebaseFunction("getConversationMessages", {
      conversationId,
      limit,
      offset,
    });

    const messages = result?.messages || [];
    return messages.map((msg: any) => ({
      ...msg,
      content:
        typeof msg.content === "string"
          ? msg.content
          : msg.content?.encryptedText || "",
    }));
  } catch (error) {
    console.error("Error fetching conversation messages", error);
    return [];
  }
};
