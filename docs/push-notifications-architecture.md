# Push Notifications Architecture

## Overview

This document explains the push notification system architecture for the SRV PWA application. The system supports both foreground and background notifications using a two-tier approach.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Opens App                            │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
                    ┌──────────────────────┐
                    │  notificationService │
                    │     .initialize()    │
                    └──────────┬───────────┘
                               │
                               ├─► Request Permission (if needed)
                               │
                               ├─► Initialize FCM (once)
                               │
                               └─► Register Token with Backend
                                         │
                    ┌────────────────────┴────────────────────┐
                    │                                         │
                    ▼                                         ▼
        ┌────────────────────┐                  ┌──────────────────────┐
        │  FOREGROUND NOTIFICATIONS │                  │ BACKGROUND NOTIFICATIONS │
        └────────────────────┘                  └──────────────────────┘
                    │                                         │
                    │                                         │
    ┌───────────────┴──────────────┐              ┌──────────┴─────────────┐
    │ Firestore Realtime Listeners │              │  FCM Push Messages     │
    │  + Browser Notification API  │              │  + Service Worker      │
    └──────────────────────────────┘              └────────────────────────┘
                    │                                         │
                    │                                         │
                    ▼                                         ▼
          User sees notification              Service Worker displays
          while app is open                   notification even when
                                              app is closed/background
```

## Components

### 1. `notificationService.ts` (NEW - Main Service)

**Purpose**: Unified service for handling all notification logic

**Key Methods**:

- `initialize(autoEnableFCM)` - Initialize service on app load
- `requestPermissionAndEnable()` - Request permission and setup FCM
- `enableBackgroundNotifications()` - Setup FCM for background push
- `startForegroundListener(userId, callback)` - Listen for new notifications while app is open
- `disableNotifications()` - Disable all notifications

**Features**:

- ✅ Prevents multiple FCM initializations (rate limit issue fixed)
- ✅ Handles permission requests properly
- ✅ Separate handling for foreground vs background
- ✅ Comprehensive error handling with user-friendly messages

### 2. `fcmService.ts` (Existing - Low Level)

**Purpose**: Low-level Firebase Cloud Messaging wrapper

**Key Features**:

- Token generation and caching
- Rate limit protection
- Service worker integration
- Foreground message handling

**Important**: This service should NOT be called directly. Use `notificationService` instead.

### 3. `notificationCanisterService.ts` (Existing - Backend Interface)

**Purpose**: Interface to backend Cloud Functions for notification data

**Key Methods**:

- `subscribeToUserNotifications()` - Realtime listener for notifications
- `getUserNotifications()` - Fetch notifications
- `markAsRead()` - Mark notification as read
- `storePushSubscription()` - Register FCM token with backend

### 4. `usePWA.ts` (Updated Hook)

**Purpose**: React hook for PWA functionality including notifications

**Key Methods**:

- `enablePushNotifications(userId)` - Enable all notification features
- `disablePushNotifications(userId)` - Disable all notification features
- `refreshPWAState()` - Refresh permission and subscription status

**Usage**:

```typescript
const { pwaState, enablePushNotifications, disablePushNotifications } =
  usePWA();

// Enable notifications
await enablePushNotifications(userId);

// Check state
console.log(pwaState.pushPermission); // "granted" | "denied" | "default"
console.log(pwaState.pushSubscribed); // true | false
```

## Notification Flow

### First Time Setup

1. **User clicks "Enable Notifications"**

   ```
   usePWA.enablePushNotifications(userId)
     → notificationService.requestPermissionAndEnable()
       → Request browser permission
       → Initialize FCM (get token)
       → Register token with backend
       → Success!
   ```

2. **Permission Granted**
   - FCM token is generated and cached in localStorage
   - Token is registered with backend Cloud Functions
   - User is now ready to receive both foreground and background notifications

### Foreground Notifications (App Open)

```
Backend creates notification in Firestore
  ↓
Firestore listener detects new notification
  ↓
notificationService.startForegroundListener() callback triggered
  ↓
Browser Notification API displays notification
  ↓
User sees notification + UI updates
```

**Code Example**:

```typescript
// In your component
useEffect(() => {
  const unsubscribe = notificationService.startForegroundListener(
    userId,
    (notification) => {
      console.log("New notification:", notification);
      // Update UI, play sound, etc.
    },
  );

  return () => unsubscribe();
}, [userId]);
```

### Background Notifications (App Closed/Background)

```
Backend event occurs (new booking, message, etc.)
  ↓
Backend Cloud Function sends FCM push message
  (using stored FCM token)
  ↓
Firebase sends push to user's device
  ↓
Service Worker receives background message
  ↓
Service Worker displays notification
  ↓
User sees notification even with app closed!
```

**Important**: The frontend ONLY needs to register the FCM token. The backend handles when to send push notifications.

## Service Worker Files

### `firebase-messaging-sw.js`

This file runs in the service worker context and handles background FCM messages.

**Key Functions**:

- `onBackgroundMessage()` - Receives FCM push when app is closed
- `showNotification()` - Displays notification
- `notificationclick` - Handles notification clicks

**Important**: This file is automatically loaded by Vite PWA plugin.

### `firebase-messaging-init.js`

Initialization script for Firebase in service worker context.

## Debugging & Testing

### FCM Test Page

Navigate to `/fcm-test` to access the comprehensive testing interface.

**Features**:

- Run diagnostics to check configuration
- Test notification permissions
- Manually initialize FCM
- Test notification display
- Clear rate limits and cache
- View detailed FCM status

**Common Tests**:

1. **Run Diagnostics** - Check if everything is configured correctly
2. **Request Permission** - Test permission request flow
3. **Initialize FCM** - Get FCM token
4. **Test Notification** - Display a test browser notification
5. **Clear Rate Limit** - Reset rate limit cooldown (after waiting)

### Console Commands

The FCM debugger is exposed to the browser console:

```javascript
// Run full diagnostics
await window.fcmDebugger.logDiagnostics();

// Test notification display
await window.fcmDebugger.testNotification();

// Export diagnostics as JSON
const json = await window.fcmDebugger.exportDiagnostics();
console.log(json);

// Clear all FCM cache
await window.fcmDebugger.clearCache();
```

### Notification Service Debugging

```javascript
// Get current state
const state = notificationService.getState();
console.log(state);
// {
//   permission: "granted",
//   fcmReady: true,
//   fcmToken: "eXmPle...",
//   supportsNotifications: true,
//   isRateLimited: false,
//   rateLimitRemaining: 0
// }

// Test notification
await notificationService.testNotification();

// Clear rate limit
notificationService.clearRateLimit();

// Force re-initialization (for debugging)
await notificationService.forceReinitialize();
```

## Common Issues & Solutions

### Issue: Rate Limit Errors

**Symptoms**:

```
[FCM] Rate limit exceeded or push service error
[FCM] Rate limited. Retry after 60 seconds
```

**Cause**: Too many FCM token requests in a short time

**Solution**:

1. Wait 60 seconds before retrying
2. Check for multiple initialization calls in your code
3. Use the FCM test page to clear rate limit after waiting
4. The new `notificationService` prevents this by caching tokens and preventing re-initialization

### Issue: No Notifications When App is Closed

**Symptoms**: Foreground notifications work, but no notifications when app is backgrounded

**Cause**: Backend not sending FCM push messages

**Solution**:

1. Verify FCM token is registered with backend (check Firestore)
2. Ensure backend Cloud Functions send FCM messages on events
3. Check service worker is active (`navigator.serviceWorker.ready`)
4. Verify `firebase-messaging-sw.js` is loaded

### Issue: Permission Denied

**Symptoms**: Cannot enable notifications, permission is "denied"

**Solution**:

1. User must manually enable notifications in browser settings:
   - Chrome: Site Settings → Notifications → Allow
   - Firefox: Page Info → Permissions → Notifications → Allow
   - Safari: Preferences → Websites → Notifications
2. Or clear site data and request permission again

### Issue: Service Worker Not Active

**Symptoms**: FCM initialization fails, service worker errors

**Solution**:

1. Ensure Vite PWA plugin is configured correctly
2. Check `vite.config.ts` for proper service worker settings
3. Reload the page to activate service worker
4. Clear browser cache and reload

## Best Practices

1. **Initialize Once**: Call `notificationService.initialize()` only once on app load
2. **Don't Call FCM Directly**: Always use `notificationService`, not `fcmService`
3. **Handle Errors**: Always show user-friendly error messages
4. **Respect Permission**: Never spam permission requests
5. **Test Both Modes**: Test foreground AND background notifications
6. **Cache Tokens**: The service automatically caches tokens - don't regenerate unnecessarily
7. **Background Logic in Backend**: Keep push notification logic in Cloud Functions, not frontend

## Environment Variables

Required environment variables for FCM:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_VAPID_KEY=your_vapid_key
```

**Note**: VAPID key should be 87 characters (base64url format)

## Migration from Old System

### Old System (notificationIntegrationService)

```typescript
// OLD - Multiple layers, complex flow
await notificationIntegrationService.enablePushNotifications();
```

### New System (notificationService)

```typescript
// NEW - Single unified service
const result = await notificationService.requestPermissionAndEnable();
if (result.success) {
  // Notifications enabled!
}
```

### Migration Checklist

- [x] Replace `notificationIntegrationService` calls with `notificationService`
- [x] Update `usePWA` hook to use new service
- [x] Remove direct `fcmService` calls from components
- [x] Test foreground notifications
- [x] Test background notifications
- [x] Verify rate limits are not triggered
- [x] Update any custom notification logic

## Summary

The new notification architecture provides:

✅ **Simplified API** - Single service for all notification needs  
✅ **Better Error Handling** - User-friendly error messages  
✅ **Rate Limit Protection** - Prevents FCM rate limiting  
✅ **Two-Tier System** - Foreground (realtime listeners) + Background (FCM)  
✅ **Comprehensive Debugging** - Test page and console utilities  
✅ **PWA Compatible** - Works in background on mobile

The key insight: **Foreground notifications don't need FCM push**. FCM is only needed for background scenarios when the app is closed. This reduces FCM calls and prevents rate limiting.
