# FCM Troubleshooting Guide

## Quick Summary

If you're experiencing issues with push notifications not working despite having environment variables set correctly, follow this guide to diagnose and fix the issue.

## Common Symptoms

- Console shows: `[FCM] Rate limited. Retry after 60 seconds`
- Console shows: `[FCM] Rate limit exceeded or push service error`
- Push notifications work with `testNotification()` but not through the actual app flow
- FCM token generation fails silently

## Root Causes

1. **Rate Limiting** - Too many token requests in a short time period
2. **Invalid VAPID Key** - VAPID key format or value is incorrect
3. **Service Worker Not Ready** - FCM tries to get token before SW is fully active
4. **Cached Invalid Token** - Old/invalid token is cached and causing issues
5. **Firebase Configuration** - Missing or incorrect Firebase environment variables

## Step-by-Step Troubleshooting

### 1. Access the FCM Test Page

Navigate to: `http://localhost:5173/#/fcm-test`

This page provides a visual interface for testing FCM functionality.

### 2. Run Diagnostics

Click **"Run Diagnostics"** to get a comprehensive report including:

- Browser support status
- Firebase configuration validation
- Service worker status
- Permission status
- Token generation status

### 3. Check Current Status

Look at the "Current Status" section to see:

- **FCM Ready**: Should be ✅
- **Permission**: Should be "GRANTED"
- **Rate Limited**: Should be "No"
- **Token**: Should show a token preview

### 4. Follow the Recommended Flow

If you're experiencing issues, follow this exact sequence:

#### A. Clear Everything (Nuclear Option)

1. Click **"Clear All Cache"**
2. Reload the page
3. Wait 60 seconds before proceeding

#### B. Fresh Start

1. Click **"Request Permission"** → Allow notifications when prompted
2. Wait 5 seconds
3. Click **"Initialize FCM"** → Should get a token
4. Click **"Register Token"** → Registers with backend
5. Click **"Test Notification"** → Should show a notification

### 5. If Still Rate Limited

If you see "Rate limited" errors:

1. **Wait it out**: The cooldown is 60 seconds. Don't try multiple times.
2. **Manual clear**: Click **"Clear Rate Limit"** ONLY after waiting the full cooldown period
3. **Check logs**: Look for the root cause of repeated initialization attempts

### 6. Verify Environment Variables

Ensure these are set in `/src/frontend/.env`:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_VAPID_KEY=your-vapid-key
```

**Important**: VAPID key should be 87 characters in base64url format (letters, numbers, -, \_)

## Common Issues & Solutions

### Issue: "testNotification() works but real notifications don't"

**Why it happens**: `testNotification()` uses the browser's Notification API directly, bypassing FCM. The real flow requires FCM token generation.

**Solution**:

1. The issue is in the FCM token generation, not notification display
2. Focus on getting a valid FCM token first
3. Use the test page to isolate the problem

### Issue: Rate limiting keeps happening

**Why it happens**: Something in your code is calling `fcmService.initialize()` multiple times too quickly.

**Solution**:

1. Check if `usePWA` hook is calling `enablePushNotifications` on every render
2. Check if multiple components are initializing FCM simultaneously
3. Use the improved error handling in the updated services
4. Wait the full 60 seconds before retrying

### Issue: Token generates but notifications still don't work

**Why it happens**: Token might not be registered with backend, or backend isn't sending to Firebase correctly.

**Solution**:

1. Verify token is registered: Click **"Register Token"** on test page
2. Check Firebase console for incoming requests
3. Check Cloud Functions logs for errors
4. Test with a manual notification send from Firebase console

### Issue: Permission is "denied"

**Solution**:

1. Reset browser permissions:
   - Chrome: Settings → Privacy → Site Settings → Notifications → Remove site
   - Firefox: Settings → Privacy & Security → Permissions → Notifications → Settings → Remove
2. Reload page and try again

## Understanding the Flow

### Normal Flow (Should Work)

```
1. User enables push notifications
   ↓
2. notificationIntegrationService.enablePushNotifications()
   ↓
3. fcmService.initialize()
   - Checks rate limit ✅
   - Checks if already initialized ✅
   - Waits for service worker ✅
   - Requests permission ✅
   - Gets FCM token from Firebase ✅
   ↓
4. fcmService.registerToken()
   - Saves to backend ✅
   ↓
5. Backend can now send push notifications ✅
```

### Problem Flow (Rate Limited)

```
1. User enables push notifications
   ↓
2. notificationIntegrationService.enablePushNotifications()
   ↓
3. fcmService.initialize()
   - Tries to get token
   - Firebase rate limits (429 error) ❌
   - Sets 60-second cooldown ❌
   ↓
4. User tries again too soon
   - Still rate limited ❌
   - Must wait full 60 seconds ❌
```

## Prevention Tips

1. **Don't spam initialize**: Only call `enablePushNotifications()` once per user action
2. **Handle errors gracefully**: Show user-friendly error messages
3. **Check prerequisites**: Verify permission before trying to get token
4. **Use caching**: Token is cached for 7 days, don't request new ones unnecessarily
5. **Monitor rate limits**: Check `fcmService.getRateLimitRemaining()` before initializing

## Developer Console Commands

You can also use these commands in the browser console:

```javascript
// Run diagnostics
await window.fcmDebugger.logDiagnostics();

// Test notification display
await window.fcmDebugger.testNotification();

// Clear all cache
await window.fcmDebugger.clearCache();

// Export diagnostics as JSON
const json = await window.fcmDebugger.exportDiagnostics();
console.log(json);
```

## Updated Service Improvements

The following improvements have been made to prevent rate limiting:

### fcmService.ts

- ✅ Better rate limit detection and error messages
- ✅ Exponential backoff for retries
- ✅ Token caching (7-day expiry)
- ✅ Detailed logging for debugging
- ✅ `forceReinitialize()` method for troubleshooting
- ✅ `getDebugInfo()` for status inspection

### notificationIntegrationService.ts

- ✅ Pre-checks before FCM initialization
- ✅ Rate limit detection with user-friendly errors
- ✅ Permission validation
- ✅ Better error propagation to UI
- ✅ Duplicate initialization prevention

### usePWA.ts

- ✅ Duplicate subscription prevention
- ✅ Better error handling and display
- ✅ State synchronization with FCM service
- ✅ Proper cleanup on errors

## Still Having Issues?

1. Check the browser console for detailed logs (all FCM operations are logged)
2. Use the FCM test page to isolate the problem
3. Export diagnostics and share with your team
4. Check Firebase console for any service issues
5. Verify your VAPID key is correct and hasn't been rotated

## Testing Checklist

Before deploying to production:

- [ ] Run diagnostics and ensure all checks pass
- [ ] Test notification permission flow
- [ ] Test FCM token generation
- [ ] Test token registration with backend
- [ ] Test actual notification display
- [ ] Test rate limiting doesn't trigger during normal usage
- [ ] Test token caching works (refresh page, token should persist)
- [ ] Test error messages are user-friendly
- [ ] Test cleanup when disabling notifications

## Quick Fix for Development

If you just want to get it working right now:

1. Go to: `http://localhost:5173/#/fcm-test`
2. Click **"Clear All Cache"**
3. Reload page
4. **Wait 60 seconds** (important!)
5. Click **"Clear Rate Limit"**
6. Click **"Request Permission"** → Allow
7. Click **"Initialize FCM"**
8. Click **"Register Token"**
9. You should now have working push notifications

Then, use your app normally and it should work. The improvements prevent the rate limiting from happening again during normal usage.
