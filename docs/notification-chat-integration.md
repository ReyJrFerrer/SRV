# Notification and Chat Integration

## Overview
This document describes the integration of the notification system with the chat functionality, and the migration from polling-based to real-time Firebase notifications in the frontend.

## Backend Changes

### 1. Chat.js - Notification Integration

**File**: `functions/src/chat.js`

**Changes Made**:
- Imported notification helper functions from `notification.js`:
  - `NOTIFICATION_TYPES`
  - `USER_TYPES`
  - `generateNotificationHref`
  - `sendFCMNotification`

- Modified `sendMessage` function to automatically create and send notifications when a chat message is sent:
  1. After successfully sending a message (within transaction), the function now:
     - Fetches sender and receiver user data
     - Determines user types (client/provider) based on conversation roles
     - Creates a notification document in Firestore
     - Sends an FCM push notification to the receiver
  
  2. Notification details include:
     - Notification type: `CHAT_MESSAGE`
     - Title: "New message from [Sender Name]"
     - Message preview: First 50 characters of the message
     - Direct link to the conversation
     - Metadata: sender ID, sender name, conversation ID, message ID

**Benefits**:
- Users are immediately notified when they receive a new chat message
- Notifications include message preview for quick context
- Deep linking allows users to jump directly to the conversation
- Non-blocking: If notification creation fails, the message is still sent successfully

## Frontend Changes

### 2. notificationCanisterService.ts - Firebase Integration

**File**: `src/frontend/src/services/notificationCanisterService.ts`

**Existing Functionality** (No changes needed):
- Already supports real-time Firebase Firestore listeners via `subscribeToUserNotifications`
- Converts Firestore notifications to frontend-compatible format
- Handles FCM token management
- Provides notification statistics and filtering

**Key Methods**:
- `subscribeToUserNotifications()` - Sets up real-time listener for notifications
- `getUserNotifications()` - One-time fetch of notifications
- `markAsRead()` - Mark single notification as read
- `markAllAsRead()` - Mark all notifications as read
- `storeFCMToken()` / `removeFCMToken()` - FCM token management

### 3. useNotificationsWithPush.ts - Client Notifications Hook

**File**: `src/frontend/src/hooks/useNotificationsWithPush.ts`

**Changes Made**:
1. **Replaced polling with real-time subscriptions**:
   - Removed `fetchNotifications` callback function
   - Added `subscribeToUserNotifications` useEffect hook
   - Notifications now update in real-time when changes occur in Firestore

2. **Simplified state management**:
   - Removed unused `error` and `previousNotificationIdsRef` state
   - Added `unsubscribeRef` to manage subscription cleanup

3. **Automatic notification updates**:
   - Chat messages now appear instantly in the notification list
   - No need to refresh or poll for new notifications
   - Unread count updates automatically

**How it works**:
```typescript
// Set up real-time listener
const unsubscribe = notificationCanisterService.subscribeToUserNotifications(
  userId,
  (canisterNotifications) => {
    // Process and display notifications
    setNotifications(allNotifications);
    notificationStore.setCount(newUnreadCount);
  },
  { userType: "client" }
);
```

### 4. useProviderNotificationsWithPush.ts - Provider Notifications Hook

**File**: `src/frontend/src/hooks/useProviderNotificationsWithPush.ts`

**Changes Made**:
Same pattern as client notifications:
1. Replaced `fetchProviderNotifications` with real-time subscription
2. Removed unused state variables
3. Added automatic cleanup on unmount

**Provider-specific features**:
- Filters for `userType: "provider"` notifications
- Includes service completion reminders
- Shows client names and booking details
- Real-time updates for new booking requests and chat messages

## Data Flow

### Chat Message → Notification Flow

```
1. User sends chat message
   ↓
2. sendMessage() function in chat.js
   ↓
3. Transaction creates message + updates conversation
   ↓
4. After transaction:
   - Fetch user data
   - Create notification document in Firestore
   - Send FCM push notification
   ↓
5. Frontend real-time listener detects new notification
   ↓
6. Notification appears in UI instantly
   ↓
7. User clicks notification → Deep link to conversation
```

### Real-time Notification Updates

```
Firebase Firestore (notifications collection)
   ↓
   ↓ (onSnapshot listener)
   ↓
notificationCanisterService.subscribeToUserNotifications()
   ↓
useNotificationsWithPush hook
   ↓
React state update
   ↓
UI renders new notification
```

## Benefits of Changes

1. **Real-time Updates**:
   - No polling required
   - Instant notification delivery
   - Reduced server load

2. **Better User Experience**:
   - Chat messages trigger immediate notifications
   - Unread counts update automatically
   - Deep linking to conversations

3. **Scalability**:
   - Firebase handles real-time synchronization
   - Efficient use of resources
   - Automatic cleanup on component unmount

4. **Reliability**:
   - Non-blocking notification creation
   - Graceful error handling
   - Fallback mechanisms in place

## Testing Recommendations

1. **Chat Notifications**:
   - Send a message between two users
   - Verify notification appears for receiver
   - Check notification content and preview
   - Test deep link navigation

2. **Real-time Updates**:
   - Open app on two devices
   - Send notifications from one device
   - Verify instant appearance on other device

3. **Cleanup**:
   - Navigate away from notification screen
   - Verify subscriptions are cleaned up
   - Check for memory leaks

4. **Error Handling**:
   - Test with network disconnection
   - Verify graceful degradation
   - Check console for error logs

## Migration Notes

- No database migrations required
- Backward compatible with existing notifications
- Frontend still generates some notifications locally for uncovered bookings
- Can be deployed incrementally

## Future Enhancements

1. **Rich Notifications**:
   - Add images/avatars to notifications
   - Support for action buttons
   - Custom sounds per notification type

2. **Notification Preferences**:
   - Allow users to configure which notifications they want
   - Set quiet hours
   - Notification delivery channels (email, SMS, push)

3. **Analytics**:
   - Track notification delivery rates
   - Measure click-through rates
   - A/B test notification content

4. **Advanced Features**:
   - Notification grouping
   - Priority levels
   - Scheduled notifications
