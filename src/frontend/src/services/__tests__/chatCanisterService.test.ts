import { describe, it, expect, vi, beforeEach } from "vitest";
import { chatCanisterService } from "../chatCanisterService";
import * as firestore from "firebase/firestore";

// Mock Firebase app helper
vi.mock("../firebaseApp", () => ({
  getFirebaseFirestore: vi.fn(() => ({ id: "mockDb" })),
}));

// Mock Firestore functions
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  runTransaction: vi.fn(),
  writeBatch: vi.fn(),
  onSnapshot: vi.fn(),
}));

describe("chatCanisterService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createConversation", () => {
    it("returns an existing conversation if one exists", async () => {
      const mockData = {
        clientId: "client-1",
        providerId: "provider-1",
        isActive: true,
      };
      const mockDocs = {
        empty: false,
        docs: [{ id: "existing-id", data: () => mockData }],
      };
      vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockDocs as any);

      const result = await chatCanisterService.createConversation(
        "client-1",
        "provider-1",
      );

      expect(firestore.getDocs).toHaveBeenCalled();
      expect(result).toEqual({
        id: "existing-id",
        clientId: "client-1",
        providerId: "provider-1",
        isActive: true,
        createdAt: undefined,
        lastMessageAt: undefined,
        lastMessagePreview: undefined,
        unreadCount: {},
      });
    });

    it("creates a new conversation if none exists", async () => {
      const mockDocs = { empty: true, docs: [] };
      vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockDocs as any);
      vi.mocked(firestore.setDoc).mockResolvedValueOnce(undefined as any);

      const result = await chatCanisterService.createConversation(
        "client-1",
        "provider-1",
      );

      expect(firestore.getDocs).toHaveBeenCalled();
      expect(firestore.setDoc).toHaveBeenCalled();

      expect(result).toMatchObject({
        clientId: "client-1",
        providerId: "provider-1",
        isActive: true,
      });
      expect(result?.id).toBeDefined();
    });

    it("throws an error if fetching existing conversations fails", async () => {
      vi.mocked(firestore.getDocs).mockRejectedValueOnce(new Error("DB Error"));

      await expect(
        chatCanisterService.createConversation("client-1", "provider-1"),
      ).rejects.toThrow("Failed to create conversation: Error: DB Error");
    });
  });

  describe("sendMessage", () => {
    it("throws an error if message exceeds 500 characters", async () => {
      const longMessage = "a".repeat(501);
      await expect(
        chatCanisterService.sendMessage(
          "conv-1",
          "receiver-1",
          longMessage,
          "sender-1",
        ),
      ).rejects.toThrow(
        "Failed to send message: Error: Message cannot exceed 500 characters",
      );
    });

    it("throws an error if message is empty", async () => {
      await expect(
        chatCanisterService.sendMessage(
          "conv-1",
          "receiver-1",
          "   ",
          "sender-1",
        ),
      ).rejects.toThrow(
        "Failed to send message: Error: Message cannot be empty",
      );
    });

    it("successfully sends a message and runs transaction", async () => {
      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({ unreadCount: { "receiver-1": 0 } }),
        }),
        update: vi.fn(),
        set: vi.fn(),
      };

      vi.mocked(firestore.runTransaction).mockImplementationOnce(
        async (db, callback) => {
          await callback(mockTransaction as any);
        },
      );

      const result = await chatCanisterService.sendMessage(
        "conv-1",
        "receiver-1",
        "Hello",
        "sender-1",
      );

      expect(firestore.runTransaction).toHaveBeenCalled();
      expect(mockTransaction.get).toHaveBeenCalled();
      expect(mockTransaction.update).toHaveBeenCalled();
      expect(mockTransaction.set).toHaveBeenCalled();

      expect(result).toMatchObject({
        conversationId: "conv-1",
        receiverId: "receiver-1",
        senderId: "sender-1",
        content: {
          encryptedText: "Hello",
          encryptionKey: "",
        },
      });
      expect(result?.id).toBeDefined();
    });

    it("throws an error if conversation does not exist during transaction", async () => {
      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: () => false,
        }),
      };

      vi.mocked(firestore.runTransaction).mockImplementationOnce(
        async (db, callback) => {
          await callback(mockTransaction as any);
        },
      );

      await expect(
        chatCanisterService.sendMessage(
          "conv-1",
          "receiver-1",
          "Hello",
          "sender-1",
        ),
      ).rejects.toThrow(
        "Failed to send message: Error: Conversation not found",
      );
    });
  });

  describe("getConversationMessages", () => {
    it("returns paginated messages successfully", async () => {
      const mockDocs = Array.from({ length: 25 }, (_, i) => ({
        id: `msg-${i}`,
        data: () => ({
          conversationId: "conv-1",
          content: { encryptedText: `Message ${i}`, encryptionKey: "" },
          createdAt: `2023-01-01T00:00:${i.toString().padStart(2, "0")}.000Z`,
        }),
      }));

      vi.mocked(firestore.getDocs).mockResolvedValueOnce({
        docs: mockDocs,
      } as any);

      const result = await chatCanisterService.getConversationMessages(
        "conv-1",
        20,
        0,
      );

      expect(firestore.getDocs).toHaveBeenCalled();
      expect(result.hasMore).toBe(true);
      expect(result.nextPageToken).toBe("20");
      expect(result.messages.length).toBe(20);
      // Because of reverse(), messages[0] should correspond to the 19th item in paginatedDocs
      expect(result.messages[0].id).toBe("msg-19");
    });

    it("returns correctly when hasMore is false", async () => {
      const mockDocs = Array.from({ length: 5 }, (_, i) => ({
        id: `msg-${i}`,
        data: () => ({
          conversationId: "conv-1",
          content: { encryptedText: `Message ${i}`, encryptionKey: "" },
          createdAt: `2023-01-01T00:00:${i.toString().padStart(2, "0")}.000Z`,
        }),
      }));

      vi.mocked(firestore.getDocs).mockResolvedValueOnce({
        docs: mockDocs,
      } as any);

      const result = await chatCanisterService.getConversationMessages(
        "conv-1",
        20,
        0,
      );

      expect(firestore.getDocs).toHaveBeenCalled();
      expect(result.hasMore).toBe(false);
      expect(result.nextPageToken).toBeUndefined();
      expect(result.messages.length).toBe(5);
    });

    it("returns empty result on error", async () => {
      vi.mocked(firestore.getDocs).mockRejectedValueOnce(
        new Error("Network error"),
      );

      const result = await chatCanisterService.getConversationMessages(
        "conv-1",
        20,
        0,
      );

      expect(firestore.getDocs).toHaveBeenCalled();
      expect(result).toEqual({
        messages: [],
        hasMore: false,
      });
    });
  });
});
