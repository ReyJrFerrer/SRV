// Test script for backend chat fixes
// Run with: node test-backend-fixes.cjs
// Assumes Firebase emulator is running: firebase emulators:start --only functions,
// firestore (from project root)
// Includes stress testing with 50 messages

const admin = require("firebase-admin");
const functionsTest = require("firebase-functions-test")({
  projectId: "devsrv-rey",
  databaseURL: "http://localhost:8080?ns=devsrv-rey",
});

// Set emulator host for Firestore
process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";

// Initialize Firebase Admin SDK for testing
admin.initializeApp({
  projectId: "devsrv-rey",
  databaseURL: "http://localhost:8080?ns=devsrv-rey",
});

const db = admin.firestore();

const {
  getMyConversations,
  sendMessage,
  markMessagesAsRead,
} = require("../../src/chat.js");

// Wrap functions for testing
const wrappedGetMyConversations = functionsTest.wrap(getMyConversations);
const wrappedSendMessage = functionsTest.wrap(sendMessage);
const wrappedMarkMessagesAsRead = functionsTest.wrap(markMessagesAsRead);

// Mock context for testing
const mockContext = {
  auth: {
    uid: "test-user-id",
    token: {isAdmin: false},
  },
};

/**
 * Sets up test data in the Firestore emulator for chat backend tests.
 * Creates a test conversation, client user, and provider user.
 */
async function setupTestData() {
  console.log("Setting up test data...");

  const conversationId = "test-conversation-id";
  const clientId = "test-user-id"; // Same as auth uid
  const providerId = "test-provider-id";
  const now = new Date().toISOString();

  // Create conversation
  await db.collection("conversations").doc(conversationId).set({
    id: conversationId,
    clientId: clientId,
    providerId: providerId,
    createdAt: now,
    lastMessageAt: null,
    isActive: true,
    unreadCount: {
      [clientId]: 0,
      [providerId]: 0,
    },
  });

  // Create users
  await db.collection("users").doc(clientId).set({
    id: clientId,
    displayName: "Test Client",
    name: "Test Client",
  });

  await db.collection("users").doc(providerId).set({
    id: providerId,
    displayName: "Test Provider",
    name: "Test Provider",
  });

  console.log("Test data setup complete.");
}

/**
 * Tests the performance of the getMyConversations function.
 * Measures execution time and logs the number of conversations found.
 */
async function testGetMyConversations() {
  console.log("Testing getMyConversations...");
  const start = Date.now();

  try {
    const result = await wrappedGetMyConversations({}, mockContext);
    const end = Date.now();
    console.log(`getMyConversations completed in ${end - start}ms`);
    console.log(`Found ${result.data.length} conversations`);
  } catch (error) {
    console.error("Error in getMyConversations:", error);
  }
}

/**
 * Tests the performance of the sendMessage function and checks for notification creation.
 * Measures execution time and verifies if notifications are created asynchronously.
 */
async function testSendMessage() {
  console.log("Testing sendMessage...");
  const start = Date.now();

  try {
    await wrappedSendMessage(
      {
        data: {
          conversationId: "test-conversation-id",
          receiverId: "test-provider-id",
          content: "Test message",
        },
      },
      mockContext,
    );
    const end = Date.now();
    console.log(`sendMessage completed in ${end - start}ms`);
    console.log("Message sent, checking for notification...");

    // Wait a bit and check if notification was created
    setTimeout(async () => {
      const notifications = await db
        .collection("notifications")
        .where("userId", "==", "test-provider-id")
        .get();
      console.log(`Notifications created: ${notifications.size}`);
    }, 2000);
  } catch (error) {
    console.error("Error in sendMessage:", error);
  }
}

/**
 * Stress tests sending multiple messages to measure performance.
 * Sends 50 messages sequentially and measures total time.
 */
async function testStressSendMessages() {
  console.log("Stress testing sendMessage with 50 messages...");
  const start = Date.now();

  try {
    for (let i = 0; i < 50; i++) {
      await wrappedSendMessage(
        {
          data: {
            conversationId: "test-conversation-id",
            receiverId: "test-provider-id",
            content: `Test message ${i + 1}`,
          },
        },
        mockContext,
      );
    }
    const end = Date.now();
    console.log(`Stress test completed in ${end - start}ms for 50 messages`);
  } catch (error) {
    console.error("Error in stress test:", error);
  }
}

/**
 * Tests the performance of the markMessagesAsRead function.
 * Measures execution time for marking messages as read.
 */
async function testMarkMessagesAsRead() {
  console.log("Testing markMessagesAsRead...");
  const start = Date.now();

  try {
    await wrappedMarkMessagesAsRead(
      {
        data: {conversationId: "test-conversation-id"},
      },
      mockContext,
    );
    const end = Date.now();
    console.log(`markMessagesAsRead completed in ${end - start}ms`);
  } catch (error) {
    console.error("Error in markMessagesAsRead:", error);
  }
}

/**
 * Runs all backend chat tests sequentially.
 * Calls each test function and logs start and completion messages.
 */
async function runTests() {
  console.log("Starting backend chat tests...");
  await setupTestData();
  await testGetMyConversations();
  await testSendMessage();
  await testStressSendMessages();
  await testMarkMessagesAsRead();
  console.log("Tests completed.");
}

runTests().catch(console.error).finally(() => {
  functionsTest.cleanup();
});
