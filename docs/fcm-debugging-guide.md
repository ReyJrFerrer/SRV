# FCM Debugging Guide

This guide helps you troubleshoot Firebase Cloud Messaging (FCM) issues in the SRV application.

## Quick Access

Visit the FCM Test Page at: `http://localhost:5173/#/fcm-test`

## Common Issues & Solutions

### 1. Rate Limit Errors

**Symptoms:**

```
[FCM] Rate limit exceeded or push service error
[FCM] Rate limited. Retry after 60 seconds
```

**Causes:**

- Too many token generation attempts in a short time
- Multiple FCM initializations in the code
- Firebase push service temporarily unavailable
- Browser cache issues

**Solutions:**

1. **Wait**: The service has a 60-second cooldown. Wait and try again.
2. **Clear Rate Limit**: Use the "Clear Rate Limit" button on the test page after waiting
3. **Clear Cache**: Use "Clear All Cache" button and reload the page
4. **Check Code**: Ensure FCM is only initialized once in your app

### 2. Service Worker Issues

**Symptoms:**

```
[FCM] Service Worker not active
Service worker registration failed
```

**Solutions:**

1. Check if service worker is registered in DevTools → Application → Service Workers
2. Unregister old service workers manually
3. Clear browser cache and reload
4. Ensure `vite-plugin-pwa` is configured correctly in `vite.config.ts`

### 3. Permission Denied

**Symptoms:**

```
Notification permission denied
```

**Solutions:**

1. Check browser notification settings
2. Reset site permissions in browser settings
3. Try in incognito mode to test with fresh permissions
4. Ensure HTTPS or localhost (required for notifications)

### 4. VAPID Key Issues

**Symptoms:**

```
[FCM] VAPID key not configured
Token generation failed
```

**Solutions:**

1. Check `.env` file has `VITE_FIREBASE_VAPID_KEY`
2. Verify VAPID key is correct (87 characters, base64url encoded)
3. Get new VAPID key from Firebase Console if needed:
   - Go to Project Settings → Cloud Messaging
   - Under "Web Push certificates", copy the key

### 5. Token Not Generating

**Symptoms:**

```
[FCM] No registration token available
Token generation returned empty result
```

**Solutions:**

1. Run diagnostics on the test page
2. Check all environment variables are set:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_VAPID_KEY`
3. Verify Firebase project configuration
4. Check Firebase Console for any project issues

## Using the FCM Test Page

### Step-by-Step Testing

1. **Run Diagnostics**
   - Click "Run Diagnostics" to check your environment
   - Review issues and recommendations
   - Fix any configuration problems

2. **Request Permission**
   - Click "Request Permission" if not already granted
   - Allow notifications in browser prompt

3. **Initialize FCM**
   - Click "Initialize FCM" to get token
   - Watch the log for detailed information
   - If rate limited, wait 60 seconds

4. **Register Token**
   - Once token is obtained, click "Register Token"
   - This saves the token to your backend

5. **Test Notification**
   - Click "Test Notification" to display a test notification
   - Verify you can see and interact with it

### Console Commands

Open browser DevTools console and use:

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

## Environment Variables Checklist

Ensure these are set in `/src/frontend/.env`:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_VAPID_KEY=your_vapid_key
```

## Service Worker Configuration

The app uses Vite PWA plugin. Check `vite.config.ts`:

```typescript
VitePWA({
  registerType: "autoUpdate",
  workbox: {
    importScripts: ["/firebase-messaging-init.js"],
    // ... other config
  },
});
```

## Firebase Console Checks

1. **Cloud Messaging Setup**
   - Go to Firebase Console → Project Settings → Cloud Messaging
   - Verify "Cloud Messaging API (Legacy)" is enabled
   - Check Web Push certificates section for VAPID key

2. **Service Account Permissions**
   - Ensure your service account has proper permissions
   - Check IAM settings if using custom service accounts

3. **Project Quotas**
   - Check if you've hit any quotas
   - Review usage in Firebase Console

## Browser Compatibility

| Browser | Support                |
| ------- | ---------------------- |
| Chrome  | ✅ Full                |
| Firefox | ✅ Full                |
| Safari  | ⚠️ Limited (iOS 16.4+) |
| Edge    | ✅ Full                |

## Debugging Workflow

```
1. Visit /fcm-test
2. Run Diagnostics
3. Fix any red ❌ issues
4. Request Permission (if needed)
5. Initialize FCM
6. Check for errors in console
7. If rate limited, wait 60s
8. Register Token with backend
9. Test Notification
10. Verify everything works
```

## Production Deployment Checklist

Before deploying to production:

- [ ] All environment variables are set
- [ ] VAPID key is from production Firebase project
- [ ] Service worker loads correctly
- [ ] Token registration works
- [ ] Push notifications are received
- [ ] Background notifications work when app is closed
- [ ] Notification clicks navigate correctly
- [ ] Rate limiting is not an issue

## Getting Help

If you're still having issues:

1. Export diagnostics from test page
2. Check browser console for detailed error logs
3. Review Firebase Console for service health
4. Check network tab for failed requests
5. Verify all environment variables are correct

## Related Files

- `/src/frontend/src/services/fcmService.ts` - Main FCM service
- `/src/frontend/src/utils/fcmDebugger.ts` - Debugging utilities
- `/src/frontend/src/pages/FCMTestPage.tsx` - Visual test interface
- `/src/frontend/public/firebase-messaging-sw.js` - Service worker
- `/src/frontend/vite.config.ts` - Vite PWA configuration
