# Chat Notification Routing

## Overview

This document describes how chat message notifications route users to the correct chat conversation pages.

## Notification Flow

When a user sends a chat message, the following happens:

1. **Message is sent** via `sendMessage` function in `chat.js`
2. **Notification is created** in Firestore with:
   - `notificationType`: `chat_message`
   - `userType`: `client` or `provider`
   - `relatedEntityId`: The conversation ID
   - `href`: Generated URL to the chat page
3. **FCM push notification** is sent to the receiver
4. **User clicks notification** → Redirected to the conversation page

## URL Structure

### For Clients

When a client receives a chat message notification:

- **URL Pattern**: `/client/chat/{conversationId}`
- **Example**: `/client/chat/1729123456789abc123`
- **Component**: `src/frontend/src/pages/client/chat/[providerId].tsx`

The `conversationId` parameter matches the conversation document ID in Firestore.

### For Providers

When a provider receives a chat message notification:

- **URL Pattern**: `/provider/chat/{conversationId}`
- **Example**: `/provider/chat/1729123456789abc123`
- **Component**: `src/frontend/src/pages/provider/chat/[clientId].tsx`

The `conversationId` parameter matches the conversation document ID in Firestore.

## Implementation Details

### Backend: `generateNotificationHref` Function

Located in `functions/src/notification.js`, this function generates the appropriate URL based on notification type and user type:

```javascript
function generateNotificationHref(notificationType, userType, entityId) {
  if (!entityId) return "/";

  const isProvider = userType === USER_TYPES.PROVIDER;

  switch (notificationType) {
    case NOTIFICATION_TYPES.CHAT_MESSAGE:
      // For chat messages, entityId is the conversation ID
      return isProvider
        ? `/provider/chat/${entityId}`
        : `/client/chat/${entityId}`;

    // ... other notification types
  }
}
```

### Backend: Chat Message Notification Creation

In `chat.js`, when a message is sent:

```javascript
// Create notification in Firestore
const notificationData = {
  id: notificationId,
  userId: receiverId,
  userType: receiverUserType,
  notificationType: NOTIFICATION_TYPES.CHAT_MESSAGE,
  title: `New message from ${senderName}`,
  message: messagePreview,
  href: generateNotificationHref(
    NOTIFICATION_TYPES.CHAT_MESSAGE,
    receiverUserType,
    conversationId, // ← Conversation ID passed here
  ),
  relatedEntityId: conversationId,
  status: "unread",
  createdAt: new Date(),
  metadata: {
    senderId: senderId,
    senderName: senderName,
    conversationId: conversationId,
    messageId: result.data.id,
  },
};
```

### Frontend: Chat Components

Both chat components (`[providerId].tsx` and `[clientId].tsx`) handle the conversation ID:

```typescript
// Load conversation when conversationId changes
useEffect(() => {
  const conversationId = location.state?.conversationId || providerId;
  if (conversationId && identity) {
    loadConversation(conversationId, false);
  }
}, [providerId, location.state?.conversationId, identity, loadConversation]);
```

## User Experience

### Scenario 1: Client receives message from provider

1. Provider sends message in conversation
2. Client receives push notification: "New message from John (Provider)"
3. Client clicks notification
4. Browser navigates to `/client/chat/1729123456789abc123`
5. Chat page loads with full conversation history
6. Client can immediately reply

### Scenario 2: Provider receives message from client

1. Client sends message in conversation
2. Provider receives push notification: "New message from Sarah"
3. Provider clicks notification
4. Browser navigates to `/provider/chat/1729123456789abc123`
5. Chat page loads with full conversation history
6. Provider can immediately reply

## Key Benefits

1. **Direct Navigation**: Users go directly to the specific conversation, not a list
2. **Context Preserved**: Full conversation history is immediately available
3. **Consistent Experience**: Same pattern for both clients and providers
4. **Deep Linking**: Works from push notifications, in-app notifications, and direct URLs
5. **Conversation Continuity**: User sees the exact message that triggered the notification

## Technical Notes

### Parameter Naming

- The route parameter is named `[providerId]` or `[clientId]` in the file names
- However, the actual value passed is the `conversationId`
- This works because both components are designed to accept either:
  - The other user's ID (for creating new conversations)
  - A conversation ID (for loading existing conversations)

### Conversation Loading

The `loadConversation` function in `useChat` hook handles both cases:

- If passed a conversation ID that exists → loads that conversation
- If passed a user ID → finds or creates a conversation with that user

### Route Configuration

Ensure your routing configuration maps these paths correctly:

```typescript
// Example React Router configuration
<Route path="/client/chat/:providerId" element={<ClientChatPage />} />
<Route path="/provider/chat/:clientId" element={<ProviderChatPage />} />
```

## Testing

To test the notification routing:

1. **Send a message** between two users
2. **Check notification creation** in Firestore:
   - Verify `href` field contains correct URL
   - Verify `relatedEntityId` contains conversation ID
3. **Click the notification** (or navigate to the URL)
4. **Verify** the correct conversation loads
5. **Verify** message history is displayed
6. **Test reply** functionality

## Troubleshooting

### Issue: Notification goes to wrong page

**Check**:

- Is `userType` correctly set to "client" or "provider"?
- Is `relatedEntityId` the conversation ID (not message ID)?
- Is `generateNotificationHref` being called with correct parameters?

### Issue: Chat page shows "Conversation not found"

**Check**:

- Does the conversation exist in Firestore?
- Is the conversation ID correctly passed in the URL?
- Does the user have permission to view this conversation?

### Issue: Notification shows but clicking does nothing

**Check**:

- Is the `href` field properly set in the notification?
- Are the route configurations correct in your app?
- Check browser console for navigation errors
