import { requireAuth } from "./coreUtils";
import { getFirebaseFirestore } from "./firebaseApp";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit as firestoreLimit,
} from "firebase/firestore";

/**
 * Get conversations for a specific user
 */
export const getUserConversations = async (userId: string): Promise<any[]> => {
  try {
    requireAuth();
    const db = getFirebaseFirestore();

    const clientQuery = query(
      collection(db, "conversations"),
      where("clientId", "==", userId),
      where("isActive", "==", true),
    );
    const providerQuery = query(
      collection(db, "conversations"),
      where("providerId", "==", userId),
      where("isActive", "==", true),
    );

    const [clientSnap, providerSnap] = await Promise.all([
      getDocs(clientQuery),
      getDocs(providerQuery),
    ]);
    const conversations = new Map();

    clientSnap.forEach((doc) =>
      conversations.set(doc.id, { id: doc.id, ...doc.data() }),
    );
    providerSnap.forEach((doc) =>
      conversations.set(doc.id, { id: doc.id, ...doc.data() }),
    );

    const summaries = Array.from(conversations.values()).map((conv) => {
      // adapt summary
      return {
        conversation: conv,
        lastMessage: conv.lastMessagePreview ? [conv.lastMessagePreview] : [],
      };
    });

    summaries.sort((a, b) => {
      const timeA = a.conversation.lastMessageAt || a.conversation.createdAt;
      const timeB = b.conversation.lastMessageAt || b.conversation.createdAt;
      return new Date(timeB).getTime() - new Date(timeA).getTime();
    });

    return summaries;
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
    const db = getFirebaseFirestore();

    const messagesQuery = query(
      collection(db, "messages"),
      where("conversationId", "==", conversationId),
      orderBy("createdAt", "desc"),
      firestoreLimit(limit + offset),
    );

    const snapshot = await getDocs(messagesQuery);
    const docs = snapshot.docs.slice(offset);
    const paginatedDocs = docs.slice(0, limit);

    const messages = paginatedDocs.map((d) => ({ id: d.id, ...d.data() }));
    messages.reverse();

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
