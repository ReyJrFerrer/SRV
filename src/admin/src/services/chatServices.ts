import { callFirebaseFunction, requireAuth } from "./coreUtils";

/**
 * Get conversations for a specific user (admin function)
 */
export const getUserConversations = async (userId: string): Promise<any[]> => {
  try {
    requireAuth();

    // Use the chat function but with admin override
    // callFirebaseFunction already extracts the data property from {success: true, data: [...]}
    const result = await callFirebaseFunction("getMyConversations", {
      userId, // Pass userId for admin override in backend
    });

    // The result is already the data array (or message if no data)
    // If result is an array, return it; otherwise return empty array
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error("Error fetching user conversations", error);
    return [];
  }
};

/**
 * Get messages for a specific conversation (admin function)
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

    // The result is already the data object { messages, hasMore, nextPageToken }
    // Extract and adapt messages array
    const messages = result?.messages || [];

    // Adapt messages to extract content from encrypted format
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

